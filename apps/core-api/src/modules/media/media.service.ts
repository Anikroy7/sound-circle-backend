import { randomBytes } from "crypto";
import { BadRequestException, ConflictException, Injectable, Logger } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { PortfolioMediaEntity } from "@soundcircle/shared/database/entities/media/portfolio-media.entity";
import { MediaOwnerType, MediaType } from "@soundcircle/shared/database/entities/media/enums/media.enum";
import { PortfolioMediaRepository } from "@soundcircle/shared/database/repositories/media/portfolio-media.repository";
import { AUDIO_FORMATS, IMAGE_FORMATS, MAX_MEDIA_FILE_BYTES, PG_UNIQUE_VIOLATION } from "@soundcircle/shared/utils/util/constant";
import { CloudinaryService } from "@apps/core-api/modules/media/cloudinary.service";
import { CloudinaryResource, CloudinaryResourceType, MediaOwner, UploadTicket } from "@apps/core-api/modules/media/common/types/media.type";

const KINDS: Record<MediaType, { resourceType: CloudinaryResourceType; formats: string[]; folder: string; noun: string }> = {
  [MediaType.AUDIO]: { resourceType: "video", formats: AUDIO_FORMATS, folder: "audio", noun: "audio samples" },
  [MediaType.IMAGE]: { resourceType: "image", formats: IMAGE_FORMATS, folder: "photos", noun: "photos" },
};

const OWNER_FOLDERS: Record<MediaOwnerType, string> = {
  [MediaOwnerType.USER]: "users",
  [MediaOwnerType.BAND]: "bands",
  [MediaOwnerType.BAND_EXPERIENCE]: "band-experiences",
};

/** Where a single image lives: `soundcircle/users/7/avatar/`, `soundcircle/bands/3/logo/`, `soundcircle/bands/3/members/`. */
export interface ImageFolder {
  owner: MediaOwnerType;
  id: number;
  folder: "avatar" | "logo" | "members";
}

const imagePrefix = ({ owner, id, folder }: ImageFolder): string => `soundcircle/${OWNER_FOLDERS[owner]}/${id}/${folder}/`;

/** The random tail `createUploadTicket` puts on every public id. */
const RANDOM_TAIL = /^[a-f0-9]{24}$/;
const MAX_MB = MAX_MEDIA_FILE_BYTES / 1024 / 1024;

/**
 * Portfolio media on Cloudinary (schema-design §4.3), for any owner. Owner-agnostic on purpose: the
 * calling service resolves the owner and checks the signed-in user may write to it first.
 */
@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly portfolioMediaRepository: PortfolioMediaRepository,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async getByOwners(ownerType: MediaOwnerType, ownerIds: number[]): Promise<PortfolioMediaEntity[]> {
    return this.portfolioMediaRepository.getByOwners(ownerType, ownerIds);
  }

  async getOne(id: number): Promise<PortfolioMediaEntity> {
    return this.portfolioMediaRepository.getOne(id);
  }

  /** Step 1 of the upload flow: a signature for one upload to a fresh public id under the owner's folder. */
  async createUploadTicket(owner: MediaOwner, mediaType: MediaType): Promise<UploadTicket> {
    await this.assertUnderLimit(owner, mediaType);

    const kind = KINDS[mediaType];
    const publicId = `${this.prefix(owner, mediaType)}${randomBytes(12).toString("hex")}`;
    return this.cloudinaryService.signUpload(kind.resourceType, publicId, kind.formats);
  }

  /**
   * Step 3: records an upload. Everything but the display name is read back from Cloudinary, so a
   * client cannot claim a smaller size or another format. An asset that breaks a rule is destroyed.
   */
  async attach(owner: MediaOwner, mediaType: MediaType, publicId: string, fileName?: string): Promise<PortfolioMediaEntity> {
    const kind = KINDS[mediaType];
    const resource = await this.verifyUpload(this.prefix(owner, mediaType), mediaType, publicId);

    // Re-checked here: several tickets can be signed before any of them is saved.
    try {
      await this.assertUnderLimit(owner, mediaType);
    } catch (error) {
      await this.destroyQuietly(kind.resourceType, publicId);
      throw error;
    }

    const media = this.portfolioMediaRepository.create({
      owner_type: owner.type,
      owner_id: owner.id,
      media_type: mediaType,
      file_name: fileName?.trim().slice(0, 255) || null,
      public_id: resource.public_id,
      secure_url: resource.secure_url,
      format: resource.format,
      file_size: resource.bytes,
      duration_seconds: resource.duration ? Math.round(resource.duration) : null,
    });

    try {
      await this.portfolioMediaRepository.save(media);
    } catch (error: any) {
      if (error?.code === PG_UNIQUE_VIOLATION) throw new ConflictException("This file is already saved");
      throw error;
    }

    return this.portfolioMediaRepository.getOne(media.id);
  }

  /** Soft-removes the row, then destroys the asset. A failed destroy is logged, never undone into the row. */
  async remove(media: PortfolioMediaEntity): Promise<void> {
    await this.portfolioMediaRepository.softRemove(this.portfolioMediaRepository.create({ id: media.id }));
    await this.destroyQuietly(KINDS[media.media_type].resourceType, media.public_id);
  }

  /**
   * Soft-removes every item of one owner inside the caller's transaction, and returns what to
   * destroy once it commits — never destroy inside a transaction (coding-standards §6).
   */
  async softRemoveForOwner(manager: EntityManager, ownerType: MediaOwnerType, ownerId: number): Promise<PortfolioMediaEntity[]> {
    const items = await manager.find(PortfolioMediaEntity, { where: { owner_type: ownerType, owner_id: ownerId } });
    if (items.length) await manager.softRemove(items);
    return items;
  }

  async destroyAll(items: PortfolioMediaEntity[]): Promise<void> {
    await Promise.all(items.map((item) => this.destroyQuietly(KINDS[item.media_type].resourceType, item.public_id)));
  }

  /* ------------------------------------------------------------------ single images: profile photo, band logo, member photo */

  /**
   * A signature for one image under `folder` — an image kept as columns on its row, not a portfolio
   * item, so there is no count limit. The caller has already checked the user may write there.
   */
  createImageTicket(folder: ImageFolder): UploadTicket {
    const kind = KINDS[MediaType.IMAGE];
    return this.cloudinaryService.signUpload(kind.resourceType, `${imagePrefix(folder)}${randomBytes(12).toString("hex")}`, kind.formats);
  }

  /** The uploaded image as Cloudinary stores it, after the same checks as a gallery photo (type, 10 MB). */
  async verifyImage(folder: ImageFolder, publicId: string): Promise<CloudinaryResource> {
    return this.verifyUpload(imagePrefix(folder), MediaType.IMAGE, publicId);
  }

  createProfilePhotoTicket(userId: number): UploadTicket {
    return this.createImageTicket({ owner: MediaOwnerType.USER, id: userId, folder: "avatar" });
  }

  async verifyProfilePhoto(userId: number, publicId: string): Promise<CloudinaryResource> {
    return this.verifyImage({ owner: MediaOwnerType.USER, id: userId, folder: "avatar" }, publicId);
  }

  /** For a replaced or removed single image, once its row change has committed. */
  async destroyImage(publicId: string): Promise<void> {
    await this.destroyQuietly(KINDS[MediaType.IMAGE].resourceType, publicId);
  }

  /* ------------------------------------------------------------------ internals */

  /**
   * Reads an upload back from Cloudinary and checks it. Only a ticket signed for this folder produces
   * an id with this prefix and random tail; an asset that breaks a rule is destroyed.
   */
  private async verifyUpload(prefix: string, mediaType: MediaType, publicId: string): Promise<CloudinaryResource> {
    const kind = KINDS[mediaType];
    if (!publicId?.startsWith(prefix) || !RANDOM_TAIL.test(publicId.slice(prefix.length))) {
      throw new BadRequestException("This upload does not belong here. Please upload the file again");
    }

    const resource = await this.cloudinaryService.getResource(kind.resourceType, publicId);
    if (!resource) throw new BadRequestException("We could not find that upload. Please upload the file again");

    const problem = this.problemWith(resource, mediaType);
    if (problem) {
      await this.destroyQuietly(kind.resourceType, publicId);
      throw new BadRequestException(problem);
    }
    return resource;
  }

  private prefix(owner: MediaOwner, mediaType: MediaType): string {
    return `soundcircle/${OWNER_FOLDERS[owner.type]}/${owner.id}/${KINDS[mediaType].folder}/`;
  }

  private async assertUnderLimit(owner: MediaOwner, mediaType: MediaType): Promise<void> {
    const count = await this.portfolioMediaRepository.countByOwner(owner.type, owner.id, mediaType);
    if (count >= owner.limit) throw new BadRequestException(`You can add up to ${owner.limit} ${KINDS[mediaType].noun} here`);
  }

  private problemWith(resource: CloudinaryResource, mediaType: MediaType): string | null {
    const kind = KINDS[mediaType];
    if (resource.resource_type !== kind.resourceType || !kind.formats.includes(resource.format)) {
      return `That file type is not supported. Use ${kind.formats.join(", ")}`;
    }
    // Cloudinary files audio as `video`; a file with a picture track is a video, which is never uploaded.
    if (mediaType === MediaType.AUDIO && resource.is_audio === false) {
      return "That is a video file. Add videos as a YouTube, Facebook or Vimeo link instead";
    }
    if (!(resource.bytes > 0) || resource.bytes > MAX_MEDIA_FILE_BYTES) return `Each file must be ${MAX_MB} MB or smaller`;
    return null;
  }

  private async destroyQuietly(resourceType: CloudinaryResourceType, publicId: string): Promise<void> {
    try {
      await this.cloudinaryService.destroy(resourceType, publicId);
    } catch {
      this.logger.warn(`Could not destroy Cloudinary asset ${publicId}; it is orphaned`);
    }
  }
}
