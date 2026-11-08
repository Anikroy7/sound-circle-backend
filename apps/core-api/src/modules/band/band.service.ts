import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
import { BandGenreEntity } from "@soundcircle/shared/database/entities/band/band-genre.entity";
import { BandMemberEntity } from "@soundcircle/shared/database/entities/band/band-member.entity";
import { BandVideoLinkEntity } from "@soundcircle/shared/database/entities/band/band-video-link.entity";
import { BandEntity } from "@soundcircle/shared/database/entities/band/band.entity";
import { BandMemberRole } from "@soundcircle/shared/database/entities/band/enums/band.enum";
import { MediaOwnerType, MediaType } from "@soundcircle/shared/database/entities/media/enums/media.enum";
import { PortfolioMediaEntity } from "@soundcircle/shared/database/entities/media/portfolio-media.entity";
import { BandGenreRepository } from "@soundcircle/shared/database/repositories/band/band-genre.repository";
import { BandMemberRepository } from "@soundcircle/shared/database/repositories/band/band-member.repository";
import { BandVideoLinkRepository } from "@soundcircle/shared/database/repositories/band/band-video-link.repository";
import { BandRepository } from "@soundcircle/shared/database/repositories/band/band.repository";
import { UserRepository } from "@soundcircle/shared/database/repositories/identity/user.repository";
import { GenreRepository } from "@soundcircle/shared/database/repositories/reference/genre.repository";
import { LocationRepository } from "@soundcircle/shared/database/repositories/reference/location.repository";
import {
  MAX_BAND_MEMBERS,
  MAX_BAND_PHOTOS,
  MAX_BAND_VIDEOS,
  MAX_MEMBER_SEARCH_RESULTS,
  MIN_MEMBER_SEARCH_LENGTH,
  PG_UNIQUE_VIOLATION,
} from "@soundcircle/shared/utils/util/constant";
import { toProfileSlug } from "@soundcircle/shared/utils/util/slug.util";
import { AuthUser } from "@soundcircle/shared/utils/util/utils";
import { labelLocations } from "@apps/core-api/modules/location/location-label";
import { MediaService } from "@apps/core-api/modules/media/media.service";
import { MediaOwner, UploadTicket } from "@apps/core-api/modules/media/common/types/media.type";
import { parseVideoLinks } from "@apps/core-api/modules/musician/musician-profile.service";
import { MediaItemView } from "@apps/core-api/modules/musician/common/types/musician-profile.type";
import { BandView, MemberCandidateView } from "@apps/core-api/modules/band/common/types/band.type";
import { AddBandMemberDto, AttachBandPhotoDto, BandImageDto, SaveBandInfoDto, UpdateBandVideosDto } from "@apps/core-api/modules/band/dto/band.dto";

/**
 * Bands (schema-design §4.5): created as a draft by step 1, filled in by steps 2 (members) and 3
 * (performance photos and videos), then published. Every write is the owner's: an id the caller does
 * not own answers exactly like one that does not exist.
 */
@Injectable()
export class BandService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly bandRepository: BandRepository,
    private readonly bandGenreRepository: BandGenreRepository,
    private readonly bandMemberRepository: BandMemberRepository,
    private readonly bandVideoLinkRepository: BandVideoLinkRepository,
    private readonly userRepository: UserRepository,
    private readonly genreRepository: GenreRepository,
    private readonly locationRepository: LocationRepository,
    private readonly mediaService: MediaService,
  ) {}

  /* ------------------------------------------------------------------ reads */

  /** The caller's band still being created, or null — so the wizard resumes where it stopped. */
  async getDraft(): Promise<BandView | null> {
    const band = await this.bandRepository.getDraftByOwner(this.userId());
    return band ? this.view(band, true) : null;
  }

  /** A published band, for its public page. Says whether the viewer owns it. */
  async getPublished(slug: string): Promise<BandView> {
    const band = await this.bandRepository.getPublishedBySlug(slug);
    if (!band) throw new NotFoundException("That band was not found");
    const viewer = AuthUser.get()?.getId?.() ?? null;
    return this.view(band, viewer !== null && (await this.isOwner(band.id, viewer)));
  }

  /* ------------------------------------------------------------------ step 1: information */

  /** Creates the caller's draft (with them as its owner), or updates it. */
  async saveDraftInfo(reqDto: SaveBandInfoDto): Promise<BandView> {
    await this.assertKnownGenres(reqDto.genre_ids);
    if (!(await this.locationRepository.getByIds([reqDto.location_id])).length)
      throw new BadRequestException("Choose a practice location from the list");

    const userId = this.userId();
    const existing = await this.bandRepository.getDraftByOwner(userId);

    const bandId = await this.dataSource.transaction(async (manager) => {
      let band: BandEntity;
      if (existing) {
        band = await manager.findOneOrFail(BandEntity, { where: { id: existing.id }, lock: { mode: "pessimistic_write" } });
      } else {
        band = manager.create(BandEntity, {});
      }
      Object.assign(band, { name: reqDto.name, bio: reqDto.bio, location_id: reqDto.location_id, band_type: Number(reqDto.band_type) });
      await manager.save(band);

      if (!existing) await manager.save(manager.create(BandMemberEntity, { band_id: band.id, user_id: userId, role: BandMemberRole.OWNER }));
      await this.replaceGenres(manager, band.id, reqDto.genre_ids);
      return band.id;
    });

    return this.view(await this.bandRepository.getOne(bandId), true);
  }

  async createLogoTicket(bandId: number): Promise<UploadTicket> {
    await this.assertOwner(bandId);
    return this.mediaService.createImageTicket({ owner: MediaOwnerType.BAND, id: bandId, folder: "logo" });
  }

  /** Saves an uploaded logo; the one it replaces is destroyed once the change has committed. */
  async setLogo(bandId: number, reqDto: BandImageDto): Promise<BandView> {
    await this.assertOwner(bandId);
    const resource = await this.mediaService.verifyImage({ owner: MediaOwnerType.BAND, id: bandId, folder: "logo" }, reqDto.public_id);
    const previous: { publicId: string | null } = { publicId: null };

    try {
      await this.dataSource.transaction(async (manager) => {
        const band = await manager.findOneOrFail(BandEntity, { where: { id: bandId }, lock: { mode: "pessimistic_write" } });
        if (band.logo_public_id && band.logo_public_id !== resource.public_id) previous.publicId = band.logo_public_id;
        band.logo_public_id = resource.public_id;
        band.logo_url = resource.secure_url;
        await manager.save(band);
      });
    } catch (error) {
      await this.mediaService.destroyImage(resource.public_id);
      throw error;
    }

    if (previous.publicId) await this.mediaService.destroyImage(previous.publicId);
    return this.ownerView(bandId);
  }

  /* ------------------------------------------------------------------ step 2: members (and Invite Members) */

  /** SoundCircle users matching `query` by name, not already in the band. Empty below 2 characters. */
  async searchCandidates(bandId: number, query: string): Promise<MemberCandidateView[]> {
    await this.assertOwner(bandId);
    const text = (query ?? "").trim();
    if (text.length < MIN_MEMBER_SEARCH_LENGTH) return [];
    return this.bandMemberRepository.searchCandidates(bandId, text, MAX_MEMBER_SEARCH_RESULTS);
  }

  async createMemberPhotoTicket(bandId: number): Promise<UploadTicket> {
    await this.assertOwner(bandId);
    return this.mediaService.createImageTicket({ owner: MediaOwnerType.BAND, id: bandId, folder: "members" });
  }

  /** Adds a SoundCircle user, or a member outside SoundCircle (name, role, optional photo). */
  async addMember(bandId: number, reqDto: AddBandMemberDto): Promise<BandView> {
    await this.assertOwner(bandId);
    const hasUser = reqDto.user_id !== undefined && reqDto.user_id !== null;
    const name = reqDto.name?.trim() || null;
    const position = reqDto.position?.trim() || null;

    if (hasUser === !!name) throw new BadRequestException("Choose a SoundCircle member, or enter the name of someone outside SoundCircle");
    if (hasUser && reqDto.photo_public_id) throw new BadRequestException("A SoundCircle member's photo comes from their profile");
    if (!hasUser && !position) throw new BadRequestException("Enter their role or instrument");
    if (hasUser && !(await this.userRepository.getOne(reqDto.user_id))) throw new BadRequestException("That SoundCircle member was not found");

    const photo = reqDto.photo_public_id
      ? await this.mediaService.verifyImage({ owner: MediaOwnerType.BAND, id: bandId, folder: "members" }, reqDto.photo_public_id)
      : null;

    try {
      await this.dataSource.transaction(async (manager) => {
        await this.lockBand(manager, bandId);
        const count = await manager.count(BandMemberEntity, { where: { band_id: bandId } });
        if (count >= MAX_BAND_MEMBERS) throw new BadRequestException(`A band can have up to ${MAX_BAND_MEMBERS} members`);

        await manager.save(
          manager.create(BandMemberEntity, {
            band_id: bandId,
            role: BandMemberRole.MEMBER,
            user_id: hasUser ? reqDto.user_id : null,
            name: hasUser ? null : name,
            position,
            photo_public_id: photo?.public_id ?? null,
            photo_url: photo?.secure_url ?? null,
          }),
        );
      });
    } catch (error: any) {
      if (photo) await this.mediaService.destroyImage(photo.public_id);
      if (error?.code === PG_UNIQUE_VIOLATION) throw new ConflictException("They are already in the band");
      throw error;
    }
    return this.ownerView(bandId);
  }

  /** The owner stays: a band always has exactly one. A removed outside member's photo is destroyed too. */
  async removeMember(bandId: number, memberId: number): Promise<BandView> {
    await this.assertOwner(bandId);
    const removed: { photo: string | null } = { photo: null };

    await this.dataSource.transaction(async (manager) => {
      const member = await manager.findOne(BandMemberEntity, { where: { id: memberId, band_id: bandId } });
      if (!member) throw new NotFoundException("That member was not found");
      if (member.role === BandMemberRole.OWNER) throw new BadRequestException("The band's owner cannot be removed");
      removed.photo = member.photo_public_id ?? null;
      await manager.softRemove(member);
    });

    if (removed.photo) await this.mediaService.destroyImage(removed.photo);
    return this.ownerView(bandId);
  }

  /* ------------------------------------------------------------------ step 3: performance media */

  async createPhotoTicket(bandId: number): Promise<UploadTicket> {
    await this.assertOwner(bandId);
    return this.mediaService.createUploadTicket(this.photoOwner(bandId), MediaType.IMAGE);
  }

  async attachPhoto(bandId: number, reqDto: AttachBandPhotoDto): Promise<BandView> {
    await this.assertOwner(bandId);
    await this.mediaService.attach(this.photoOwner(bandId), MediaType.IMAGE, reqDto.public_id, reqDto.file_name);
    return this.ownerView(bandId);
  }

  async removePhoto(bandId: number, mediaId: number): Promise<BandView> {
    await this.assertOwner(bandId);
    const media = await this.mediaService.getOne(mediaId);
    if (!media || media.owner_type !== MediaOwnerType.BAND || media.owner_id !== bandId) throw new NotFoundException("That photo was not found");
    await this.mediaService.remove(media);
    return this.ownerView(bandId);
  }

  /** Replaces the performance video links. */
  async saveVideos(bandId: number, reqDto: UpdateBandVideosDto): Promise<BandView> {
    await this.assertOwner(bandId);
    const links = parseVideoLinks(reqDto.video_urls, MAX_BAND_VIDEOS);

    await this.dataSource.transaction(async (manager) => {
      await this.lockBand(manager, bandId);
      const existing = await manager.find(BandVideoLinkEntity, { where: { band_id: bandId } });
      if (existing.length) await manager.softRemove(existing);
      if (links.length) {
        await manager.save(links.map((link, index) => manager.create(BandVideoLinkEntity, { ...link, band_id: bandId, sort_order: index })));
      }
    });
    return this.ownerView(bandId);
  }

  /* ------------------------------------------------------------------ publish */

  /** Makes the draft public at `/bands/<slug>`. Publishing a published band changes nothing. */
  async publish(bandId: number): Promise<BandView> {
    await this.assertOwner(bandId);

    await this.dataSource.transaction(async (manager) => {
      const band = await this.lockBand(manager, bandId);
      if (band.published_at) return;
      band.slug = toProfileSlug(band.name, band.id, "band");
      band.published_at = new Date();
      await manager.save(band);
    });
    return this.ownerView(bandId);
  }

  /* ------------------------------------------------------------------ internals */

  private userId(): number {
    const user = AuthUser.get();
    if (!user) throw new UnauthorizedException("Please log in to continue");
    return user.getId();
  }

  private async isOwner(bandId: number, userId: number): Promise<boolean> {
    return (await this.bandMemberRepository.count({ where: { band_id: bandId, user_id: userId, role: BandMemberRole.OWNER } })) > 0;
  }

  /** 404 unless the band exists and the caller owns it — a band you do not own looks like no band at all. */
  private async assertOwner(bandId: number): Promise<void> {
    const band = await this.bandRepository.getOne(bandId);
    if (!band || !(await this.isOwner(bandId, this.userId()))) throw new NotFoundException("That band was not found");
  }

  /** Serialises writes to one band (member count, video list, publish). */
  private async lockBand(manager: EntityManager, bandId: number): Promise<BandEntity> {
    return manager.findOneOrFail(BandEntity, { where: { id: bandId }, lock: { mode: "pessimistic_write" } });
  }

  private photoOwner(bandId: number): MediaOwner {
    return { type: MediaOwnerType.BAND, id: bandId, limit: MAX_BAND_PHOTOS };
  }

  private async assertKnownGenres(ids: number[]): Promise<void> {
    const found = await this.genreRepository.getExistingIds(ids);
    const unknown = ids.filter((id) => !found.includes(id));
    if (unknown.length) throw new BadRequestException(`Unknown genre id(s): ${unknown.join(", ")}`);
  }

  private async replaceGenres(manager: EntityManager, bandId: number, wanted: number[]): Promise<void> {
    const existing = await manager.find(BandGenreEntity, { where: { band_id: bandId } });
    const stale = existing.filter((row) => !wanted.includes(row.genre_id));
    if (stale.length) await manager.softRemove(stale);
    const added = wanted.filter((id) => !existing.some((row) => row.genre_id === id));
    if (added.length) await manager.save(added.map((genre_id) => manager.create(BandGenreEntity, { band_id: bandId, genre_id })));
  }

  private async ownerView(bandId: number): Promise<BandView> {
    return this.view(await this.bandRepository.getOne(bandId), true);
  }

  private async view(band: BandEntity, isOwner: boolean): Promise<BandView> {
    const [genres, members, media, videos, locations] = await Promise.all([
      this.bandGenreRepository.getByBandId(band.id),
      this.bandMemberRepository.getByBandId(band.id),
      this.mediaService.getByOwners(MediaOwnerType.BAND, [band.id]),
      this.bandVideoLinkRepository.getByBandId(band.id),
      labelLocations(this.locationRepository, [band.location_id]),
    ]);

    return {
      id: band.id,
      slug: band.slug ?? null,
      name: band.name,
      bio: band.bio,
      band_type: band.band_type,
      logo_url: band.logo_url ?? null,
      published_at: band.published_at ? new Date(band.published_at).toISOString() : null,
      location: locations[0] ?? null,
      genres,
      members: members.map((member) => ({
        id: member.id,
        user_id: member.user_id ?? null,
        is_owner: Number(member.role) === BandMemberRole.OWNER,
        name: member.name,
        position: member.position ?? null,
        photo_url: member.photo_url ?? null,
      })),
      photos: media.filter((item) => item.media_type === MediaType.IMAGE).map(photoView),
      videos: videos.map((row) => ({ id: row.id, provider: row.provider, external_video_id: row.external_video_id, url: row.url })),
      is_owner: isOwner,
    };
  }
}

const photoView = (item: PortfolioMediaEntity): MediaItemView => ({
  id: item.id,
  media_type: item.media_type,
  file_name: item.file_name ?? null,
  secure_url: item.secure_url,
  format: item.format,
  file_size: item.file_size,
  duration_seconds: null,
});
