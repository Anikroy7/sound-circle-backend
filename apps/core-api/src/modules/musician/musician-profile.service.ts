import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { DataSource, EntityManager, IsNull } from "typeorm";
import { UserLocationEntity } from "@soundcircle/shared/database/entities/identity/user-location.entity";
import { UserEntity } from "@soundcircle/shared/database/entities/identity/user.entity";
import { ContactVisibility } from "@soundcircle/shared/database/entities/identity/enums/identity.enum";
import { MediaOwnerType, MediaType } from "@soundcircle/shared/database/entities/media/enums/media.enum";
import { PortfolioMediaEntity } from "@soundcircle/shared/database/entities/media/portfolio-media.entity";
import { GenreRelation } from "@soundcircle/shared/database/entities/musician/enums/musician.enum";
import { MusicianAvailabilitySlotEntity } from "@soundcircle/shared/database/entities/musician/musician-availability-slot.entity";
import { MusicianBandExperienceEntity } from "@soundcircle/shared/database/entities/musician/musician-band-experience.entity";
import { MusicianGenreEntity } from "@soundcircle/shared/database/entities/musician/musician-genre.entity";
import { MusicianInstrumentEntity } from "@soundcircle/shared/database/entities/musician/musician-instrument.entity";
import { MusicianProfileEntity } from "@soundcircle/shared/database/entities/musician/musician-profile.entity";
import { MusicianVideoLinkEntity } from "@soundcircle/shared/database/entities/musician/musician-video-link.entity";
import { UserLocationRepository } from "@soundcircle/shared/database/repositories/identity/user-location.repository";
import { UserRepository } from "@soundcircle/shared/database/repositories/identity/user.repository";
import { MusicianAvailabilitySlotRepository } from "@soundcircle/shared/database/repositories/musician/musician-availability-slot.repository";
import { MusicianBandExperienceRepository } from "@soundcircle/shared/database/repositories/musician/musician-band-experience.repository";
import { MusicianGenreRepository } from "@soundcircle/shared/database/repositories/musician/musician-genre.repository";
import { MusicianInstrumentRepository } from "@soundcircle/shared/database/repositories/musician/musician-instrument.repository";
import { MusicianProfileRepository } from "@soundcircle/shared/database/repositories/musician/musician-profile.repository";
import { MusicianVideoLinkRepository } from "@soundcircle/shared/database/repositories/musician/musician-video-link.repository";
import { GenreRepository } from "@soundcircle/shared/database/repositories/reference/genre.repository";
import { InstrumentRepository } from "@soundcircle/shared/database/repositories/reference/instrument.repository";
import { LocationRepository } from "@soundcircle/shared/database/repositories/reference/location.repository";
import {
  MAX_BAND_EXPERIENCE_PHOTOS,
  MAX_BAND_EXPERIENCE_VIDEOS,
  MAX_BAND_EXPERIENCES,
  MAX_GALLERY_AUDIO,
  MAX_GALLERY_PHOTOS,
  MAX_GALLERY_VIDEOS,
  PG_UNIQUE_VIOLATION,
} from "@soundcircle/shared/utils/util/constant";
import { dropCoveredLocations } from "@soundcircle/shared/utils/util/location.util";
import { toProfileSlug } from "@soundcircle/shared/utils/util/slug.util";
import { AuthUser, RequestIp } from "@soundcircle/shared/utils/util/utils";
import { ParsedVideoLink, parseVideoLink } from "@soundcircle/shared/utils/util/video-link.util";
import { labelLocations } from "@apps/core-api/modules/location/location-label";
import { MediaService } from "@apps/core-api/modules/media/media.service";
import { MediaOwner, UploadTicket } from "@apps/core-api/modules/media/common/types/media.type";
import { BandExperienceDto } from "@apps/core-api/modules/musician/dto/band-experience.dto";
import { AttachMediaDto, MediaTargetDto, SetProfilePhotoDto } from "@apps/core-api/modules/musician/dto/profile-media.dto";
import {
  AvailabilitySlotDto,
  CompleteBandExperienceDto,
  UpdateAboutDto,
  UpdateAvailabilityDto,
  UpdateBandInterestDto,
  UpdateContactDto,
  UpdateGalleryDto,
  UpdateGenresDto,
  UpdateInstrumentsDto,
  UpdateLocationsDto,
} from "@apps/core-api/modules/musician/dto/profile-steps.dto";
import {
  MediaItemView,
  MusicianProfileView,
  ProfileLocationView,
  VideoLinkView,
} from "@apps/core-api/modules/musician/common/types/musician-profile.type";
import { computeProfileCompletion } from "@apps/core-api/modules/musician/common/utils/profile-completion.util";

/** Profile setup steps (schema-design §4.4). */
const STEP = { ABOUT: 1, GENRES: 2, INSTRUMENTS: 3, CONTACT: 4, AVAILABILITY: 5, BAND_INTEREST: 6, GALLERY: 7, BAND_EXPERIENCE: 8 } as const;

type Slot = { day_of_week: number | null; start_time: string | null; end_time: string | null };

/**
 * The signed-in musician's own profile and its eight setup steps (schema-design §4.4).
 *
 * Every write runs in one transaction that first locks the profile row (`SELECT … FOR UPDATE`), so two
 * tabs saving at once queue rather than interleave, and `setup_step` / `profile_completion` are always
 * computed from what is actually committed.
 */
@Injectable()
export class MusicianProfileService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly musicianProfileRepository: MusicianProfileRepository,
    private readonly musicianGenreRepository: MusicianGenreRepository,
    private readonly musicianInstrumentRepository: MusicianInstrumentRepository,
    private readonly musicianAvailabilitySlotRepository: MusicianAvailabilitySlotRepository,
    private readonly musicianBandExperienceRepository: MusicianBandExperienceRepository,
    private readonly musicianVideoLinkRepository: MusicianVideoLinkRepository,
    private readonly userRepository: UserRepository,
    private readonly instrumentRepository: InstrumentRepository,
    private readonly genreRepository: GenreRepository,
    private readonly mediaService: MediaService,
    private readonly userLocationRepository: UserLocationRepository,
    private readonly locationRepository: LocationRepository,
  ) {}

  /* ------------------------------------------------------------------ reads */

  async getMine(): Promise<MusicianProfileView> {
    const userId = this.userId();
    const [user, profile] = await Promise.all([this.userRepository.getOne(userId), this.musicianProfileRepository.getByUserId(userId)]);
    if (!user) throw new UnauthorizedException("Please log in to continue");

    const contact = { phone: user.phone ?? null, show_phone: user.phone_visibility === ContactVisibility.PUBLIC };
    // Locations belong to the user, not the profile, so they are read either way.
    const locations = await this.locationViews(userId);
    if (!profile) return { ...EMPTY_PROFILE, ...contact, locations };

    const [genres, instruments, slots, experiences, videos] = await Promise.all([
      this.musicianGenreRepository.getByProfileId(profile.id),
      this.musicianInstrumentRepository.getByProfileId(profile.id),
      this.musicianAvailabilitySlotRepository.getByProfileId(profile.id),
      this.musicianBandExperienceRepository.getByProfileId(profile.id),
      this.musicianVideoLinkRepository.getByProfileId(profile.id),
    ]);
    const [galleryMedia, experienceMedia] = await Promise.all([
      this.mediaService.getByOwners(MediaOwnerType.USER, [userId]),
      this.mediaService.getByOwners(
        MediaOwnerType.BAND_EXPERIENCE,
        experiences.map((experience) => experience.id),
      ),
    ]);

    const genreIds = (relation: GenreRelation): number[] => genres.filter((row) => row.relation === relation).map((row) => row.genre_id);
    const videoView = (row: MusicianVideoLinkEntity): VideoLinkView => ({
      id: row.id,
      provider: row.provider,
      external_video_id: row.external_video_id,
      url: row.url,
    });

    return {
      id: profile.id,
      slug: profile.slug,
      setup_step: profile.setup_step,
      profile_completion: profile.profile_completion,
      is_discoverable: profile.is_discoverable,
      photo_url: profile.photo_url ?? null,
      bio: profile.bio ?? null,
      locations,
      performs_genre_ids: genreIds(GenreRelation.PERFORMS),
      listens_genre_ids: genreIds(GenreRelation.LISTENS),
      instruments: instruments.map((row) => ({ instrument_id: row.instrument_id, skill_level: row.skill_level })),
      ...contact,
      availability: slots.map((row) => ({ day_of_week: row.day_of_week ?? null, start_time: hhmm(row.start_time), end_time: hhmm(row.end_time) })),
      band_interest: profile.band_interest ?? null,
      audio: galleryMedia.filter((item) => item.media_type === MediaType.AUDIO).map(mediaView),
      photos: galleryMedia.filter((item) => item.media_type === MediaType.IMAGE).map(mediaView),
      videos: videos.filter((row) => !row.band_experience_id).map(videoView),
      band_experiences: experiences.map((experience) => ({
        id: experience.id,
        band_name: experience.band_name,
        role: experience.role,
        is_current: experience.is_current,
        photos: experienceMedia.filter((item) => item.owner_id === experience.id).map(mediaView),
        videos: videos.filter((row) => row.band_experience_id === experience.id).map(videoView),
      })),
    };
  }

  /* ------------------------------------------------------------------ steps 1–8 */

  /** Step 1: the bio and the location set (replaced whole). The photo saves on its own, as it uploads. */
  async saveAbout(reqDto: UpdateAboutDto): Promise<MusicianProfileView> {
    const locations = await this.resolveLocations(reqDto.location_ids);

    return this.saveStep(STEP.ABOUT, async (manager, profile) => {
      profile.bio = reqDto.bio;
      await this.replaceLocations(
        manager,
        locations.map((location) => location.id),
      );
    });
  }

  async saveGenres(reqDto: UpdateGenresDto): Promise<MusicianProfileView> {
    const performs = reqDto.performs_genre_ids;
    const listens = reqDto.listens_genre_ids ?? [];
    await this.assertKnown("genre", [...new Set([...performs, ...listens])], (ids) => this.genreRepository.getExistingIds(ids));

    return this.saveStep(STEP.GENRES, async (manager, profile) => {
      const wanted = [
        ...performs.map((genre_id) => ({ genre_id, relation: GenreRelation.PERFORMS })),
        ...listens.map((genre_id) => ({ genre_id, relation: GenreRelation.LISTENS })),
      ];
      const key = (row: { genre_id: number; relation: GenreRelation }): string => `${row.genre_id}:${row.relation}`;
      const existing = await manager.find(MusicianGenreEntity, { where: { musician_profile_id: profile.id } });

      await this.softRemoveAll(
        manager,
        existing.filter((row) => !wanted.some((want) => key(want) === key(row))),
      );
      const added = wanted.filter((want) => !existing.some((row) => key(row) === key(want)));
      if (added.length) {
        await manager.save(added.map((row) => manager.create(MusicianGenreEntity, { ...row, musician_profile_id: profile.id })));
      }
    });
  }

  async saveInstruments(reqDto: UpdateInstrumentsDto): Promise<MusicianProfileView> {
    await this.assertKnown(
      "instrument",
      reqDto.instruments.map((row) => row.instrument_id),
      (ids) => this.instrumentRepository.getExistingIds(ids),
    );

    return this.saveStep(STEP.INSTRUMENTS, async (manager, profile) => {
      const existing = await manager.find(MusicianInstrumentEntity, { where: { musician_profile_id: profile.id } });

      await this.softRemoveAll(
        manager,
        existing.filter((row) => !reqDto.instruments.some((want) => want.instrument_id === row.instrument_id)),
      );
      for (const want of reqDto.instruments) {
        const row = existing.find((candidate) => candidate.instrument_id === want.instrument_id);
        if (!row) {
          await manager.save(manager.create(MusicianInstrumentEntity, { ...want, musician_profile_id: profile.id }));
        } else if (row.skill_level !== Number(want.skill_level)) {
          row.skill_level = want.skill_level;
          await manager.save(row);
        }
      }
    });
  }

  async saveContact(reqDto: UpdateContactDto): Promise<MusicianProfileView> {
    return this.saveStep(
      STEP.CONTACT,
      async (manager) => {
        // `update()` fires no entity hooks, so the actor and IP travel in the patch (coding-standards §5).
        await manager.update(UserEntity, this.userId(), {
          phone: reqDto.phone,
          phone_visibility: reqDto.show_phone ? ContactVisibility.PUBLIC : ContactVisibility.ONLY_ME,
          updated_by: this.userId(),
          updated_ip: RequestIp.get(),
        });
      },
      "This phone number is already linked to another account",
    );
  }

  async saveAvailability(reqDto: UpdateAvailabilityDto): Promise<MusicianProfileView> {
    const slots = normalizeSlots(reqDto.slots);

    return this.saveStep(STEP.AVAILABILITY, async (manager, profile) => {
      await this.softRemoveAll(manager, await manager.find(MusicianAvailabilitySlotEntity, { where: { musician_profile_id: profile.id } }));
      await manager.save(slots.map((slot) => manager.create(MusicianAvailabilitySlotEntity, { ...slot, musician_profile_id: profile.id })));
    });
  }

  async saveBandInterest(reqDto: UpdateBandInterestDto): Promise<MusicianProfileView> {
    return this.saveStep(STEP.BAND_INTEREST, async (_, profile) => {
      profile.band_interest = Number(reqDto.band_interest);
    });
  }

  /** Audio and photos are already saved as they uploaded; this replaces the gallery's video links. */
  async saveGallery(reqDto: UpdateGalleryDto): Promise<MusicianProfileView> {
    const links = parseVideoLinks(reqDto.video_urls, MAX_GALLERY_VIDEOS);

    return this.saveStep(STEP.GALLERY, async (manager, profile) => {
      await this.replaceVideoLinks(manager, profile.id, null, links);
    });
  }

  async completeBandExperience(reqDto: CompleteBandExperienceDto): Promise<MusicianProfileView> {
    return this.saveStep(STEP.BAND_EXPERIENCE, async (manager, profile) => {
      const bands = await manager.count(MusicianBandExperienceEntity, { where: { musician_profile_id: profile.id } });
      if (reqDto.has_band_experience && !bands) throw new BadRequestException("Add at least one band, or answer No");
      if (!reqDto.has_band_experience && bands) throw new BadRequestException("Remove the bands you added, or answer Yes");
    });
  }

  /* ------------------------------------------------------------------ step 8: band experiences */

  async createBandExperience(reqDto: BandExperienceDto): Promise<MusicianProfileView> {
    const links = parseVideoLinks(reqDto.video_urls, MAX_BAND_EXPERIENCE_VIDEOS);

    await this.withProfile(STEP.BAND_EXPERIENCE, async (manager, profile) => {
      const count = await manager.count(MusicianBandExperienceEntity, { where: { musician_profile_id: profile.id } });
      if (count >= MAX_BAND_EXPERIENCES) throw new BadRequestException(`You can add up to ${MAX_BAND_EXPERIENCES} bands`);

      const experience = manager.create(MusicianBandExperienceEntity, {
        musician_profile_id: profile.id,
        band_name: reqDto.band_name,
        role: reqDto.role,
        is_current: reqDto.is_current,
      });
      await manager.save(experience);
      await this.replaceVideoLinks(manager, profile.id, experience.id, links);
    });
    return this.getMine();
  }

  async updateBandExperience(id: number, reqDto: BandExperienceDto): Promise<MusicianProfileView> {
    const links = parseVideoLinks(reqDto.video_urls, MAX_BAND_EXPERIENCE_VIDEOS);

    await this.withProfile(STEP.BAND_EXPERIENCE, async (manager, profile) => {
      const experience = await this.ownExperience(manager, profile, id);
      Object.assign(experience, { band_name: reqDto.band_name, role: reqDto.role, is_current: reqDto.is_current });
      await manager.save(experience);
      await this.replaceVideoLinks(manager, profile.id, experience.id, links);
    });
    return this.getMine();
  }

  /** Takes its photos and video links with it; the Cloudinary assets go once the removal has committed. */
  async removeBandExperience(id: number): Promise<MusicianProfileView> {
    let removedMedia: PortfolioMediaEntity[] = [];

    await this.withProfile(STEP.BAND_EXPERIENCE, async (manager, profile) => {
      const experience = await this.ownExperience(manager, profile, id);
      await this.softRemoveAll(manager, await manager.find(MusicianVideoLinkEntity, { where: { band_experience_id: experience.id } }));
      removedMedia = await this.mediaService.softRemoveForOwner(manager, MediaOwnerType.BAND_EXPERIENCE, experience.id);
      await manager.softRemove(experience);
    });

    await this.mediaService.destroyAll(removedMedia);
    return this.getMine();
  }

  /* ------------------------------------------------------------------ media (schema-design §4.3) */

  async createUploadTicket(reqDto: MediaTargetDto): Promise<UploadTicket> {
    const owner = await this.resolveMediaOwner(reqDto);
    return this.mediaService.createUploadTicket(owner, Number(reqDto.media_type));
  }

  async attachMedia(reqDto: AttachMediaDto): Promise<MusicianProfileView> {
    const owner = await this.resolveMediaOwner(reqDto);
    await this.mediaService.attach(owner, Number(reqDto.media_type), reqDto.public_id, reqDto.file_name);
    await this.refreshCompletion();
    return this.getMine();
  }

  async removeMedia(id: number): Promise<MusicianProfileView> {
    const media = await this.mediaService.getOne(id);
    // An item that is not the caller's answers exactly like one that does not exist.
    if (!media || !(await this.ownsMedia(media))) throw new NotFoundException("That file was not found");

    await this.mediaService.remove(media);
    await this.refreshCompletion();
    return this.getMine();
  }

  /* ------------------------------------------------------------------ locations */

  /**
   * Replaces the location set on its own — the profile page's Location editor. Not a step save, so
   * `setup_step` is untouched; completion is recomputed when the profile exists.
   */
  async saveLocations(reqDto: UpdateLocationsDto): Promise<MusicianProfileView> {
    const locations = await this.resolveLocations(reqDto.location_ids);

    try {
      await this.dataSource.transaction(async (manager) => {
        const profile = await manager.findOne(MusicianProfileEntity, { where: { user_id: this.userId() }, lock: { mode: "pessimistic_write" } });
        await this.replaceLocations(
          manager,
          locations.map((location) => location.id),
        );
        if (profile) await this.recompute(manager, profile);
      });
    } catch (error: any) {
      if (error?.code === PG_UNIQUE_VIOLATION)
        throw new ConflictException("Your locations were changed somewhere else at the same time. Please try again");
      throw error;
    }
    return this.getMine();
  }

  /* ------------------------------------------------------------------ profile photo */

  /** A signed upload for one profile photo. Allowed from step 1 on, even before the profile exists. */
  createPhotoTicket(): UploadTicket {
    return this.mediaService.createProfilePhotoTicket(this.userId());
  }

  /**
   * Saves an uploaded photo (checked against Cloudinary first), creating the profile if step 1 has not
   * been saved yet. The photo it replaces is destroyed once the change has committed; if saving fails,
   * the new upload is destroyed instead, so nothing is left orphaned.
   */
  async setPhoto(reqDto: SetProfilePhotoDto): Promise<MusicianProfileView> {
    const resource = await this.mediaService.verifyProfilePhoto(this.userId(), reqDto.public_id);
    const previous: { publicId: string | null } = { publicId: null };

    try {
      await this.dataSource.transaction(async (manager) => {
        const profile = await this.lockProfile(manager, true);
        if (profile.photo_public_id && profile.photo_public_id !== resource.public_id) previous.publicId = profile.photo_public_id;
        profile.photo_public_id = resource.public_id;
        profile.photo_url = resource.secure_url;
        await this.recompute(manager, profile);
      });
    } catch (error) {
      await this.mediaService.destroyImage(resource.public_id);
      throw error;
    }

    if (previous.publicId) await this.mediaService.destroyImage(previous.publicId);
    return this.getMine();
  }

  async removePhoto(): Promise<MusicianProfileView> {
    const removed: { publicId: string | null } = { publicId: null };

    await this.dataSource.transaction(async (manager) => {
      const profile = await this.lockProfile(manager, false);
      removed.publicId = profile.photo_public_id ?? null;
      profile.photo_public_id = null;
      profile.photo_url = null;
      await this.recompute(manager, profile);
    });

    if (removed.publicId) await this.mediaService.destroyImage(removed.publicId);
    return this.getMine();
  }

  /* ------------------------------------------------------------------ internals */

  private userId(): number {
    return AuthUser.get().getId();
  }

  /**
   * Saves step `step`: locks the profile (step 1 creates it), checks the step before it is done, runs
   * `work`, advances `setup_step` and recomputes completion — all in one transaction.
   */
  private async saveStep(
    step: number,
    work: (manager: EntityManager, profile: MusicianProfileEntity) => Promise<void>,
    conflictMessage = "Your profile was changed somewhere else at the same time. Please try again",
  ): Promise<MusicianProfileView> {
    try {
      await this.dataSource.transaction(async (manager) => {
        const profile = await this.lockProfile(manager, step === STEP.ABOUT);
        if (profile.setup_step < step - 1) throw new BadRequestException("Please complete the earlier steps first");

        await work(manager, profile);
        profile.setup_step = Math.max(profile.setup_step, step);
        await this.recompute(manager, profile);
      });
    } catch (error: any) {
      // A unique index lost a race (or, for step 4, the phone belongs to someone else).
      if (error?.code === PG_UNIQUE_VIOLATION) throw new ConflictException(conflictMessage);
      throw error;
    }
    return this.getMine();
  }

  /** A write that is not a step save (a band experience): the profile must already be at `step`. */
  private async withProfile(step: number, work: (manager: EntityManager, profile: MusicianProfileEntity) => Promise<void>): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const profile = await this.lockProfile(manager, false);
      if (profile.setup_step < step - 1) throw new BadRequestException("Please complete the earlier steps first");
      await work(manager, profile);
    });
  }

  private async lockProfile(manager: EntityManager, createIfMissing: boolean): Promise<MusicianProfileEntity> {
    const userId = this.userId();
    const profile = await manager.findOne(MusicianProfileEntity, { where: { user_id: userId }, lock: { mode: "pessimistic_write" } });
    if (profile) return profile;
    if (!createIfMissing) throw new BadRequestException("Please start with step 1: About me");

    const user = await manager.findOne(UserEntity, { where: { id: userId }, select: { id: true, name: true } });
    if (!user) throw new UnauthorizedException("Please log in to continue");

    const created = manager.create(MusicianProfileEntity, { user_id: userId, slug: toProfileSlug(user.name, userId), setup_step: 0 });
    return manager.save(created);
  }

  /** Recomputes completion and discoverability from what this transaction can see, then saves the profile. */
  private async recompute(manager: EntityManager, profile: MusicianProfileEntity): Promise<void> {
    const userId = this.userId();
    const onProfile = { musician_profile_id: profile.id };
    const [locations, performedGenres, instruments, availabilitySlots, galleryMedia, galleryVideos, user] = await Promise.all([
      manager.count(UserLocationEntity, { where: { user_id: userId } }),
      manager.count(MusicianGenreEntity, { where: { ...onProfile, relation: GenreRelation.PERFORMS } }),
      manager.count(MusicianInstrumentEntity, { where: onProfile }),
      manager.count(MusicianAvailabilitySlotEntity, { where: onProfile }),
      manager.count(PortfolioMediaEntity, { where: { owner_type: MediaOwnerType.USER, owner_id: userId } }),
      manager.count(MusicianVideoLinkEntity, { where: { ...onProfile, band_experience_id: IsNull() } }),
      manager.findOne(UserEntity, { where: { id: userId }, select: { id: true, phone: true } }),
    ]);

    profile.profile_completion = computeProfileCompletion({
      hasBio: !!profile.bio,
      locations,
      hasPhoto: !!profile.photo_public_id,
      performedGenres,
      instruments,
      hasPhone: !!user?.phone,
      availabilitySlots,
      hasBandInterest: !!profile.band_interest,
      galleryItems: galleryMedia + galleryVideos,
      bandExperienceStepDone: profile.setup_step >= STEP.BAND_EXPERIENCE,
    });
    profile.is_discoverable = instruments > 0;
    await manager.save(profile);
  }

  /** After a media change outside a step save: the gallery counts toward completion. */
  private async refreshCompletion(): Promise<void> {
    await this.dataSource.transaction(async (manager) => this.recompute(manager, await this.lockProfile(manager, false)));
  }

  private async replaceVideoLinks(
    manager: EntityManager,
    profileId: number,
    bandExperienceId: number | null,
    links: ParsedVideoLink[],
  ): Promise<void> {
    const existing = await manager.find(MusicianVideoLinkEntity, {
      where: { musician_profile_id: profileId, band_experience_id: bandExperienceId ?? IsNull() },
    });
    await this.softRemoveAll(manager, existing);
    if (!links.length) return;

    await manager.save(
      links.map((link, index) =>
        manager.create(MusicianVideoLinkEntity, { ...link, musician_profile_id: profileId, band_experience_id: bandExperienceId, sort_order: index }),
      ),
    );
  }

  private async ownExperience(manager: EntityManager, profile: MusicianProfileEntity, id: number): Promise<MusicianBandExperienceEntity> {
    const experience = await manager.findOne(MusicianBandExperienceEntity, { where: { id, musician_profile_id: profile.id } });
    if (!experience) throw new NotFoundException("That band was not found");
    return experience;
  }

  /** The gallery (self) or one of the caller's band experiences — photos only there. */
  private async resolveMediaOwner(target: MediaTargetDto): Promise<MediaOwner> {
    const mediaType = Number(target.media_type);
    const profile = await this.musicianProfileRepository.getByUserId(this.userId());
    if (!profile || profile.setup_step < STEP.GALLERY - 1) throw new BadRequestException("Please complete the earlier steps first");

    if (!target.band_experience_id) {
      return { type: MediaOwnerType.USER, id: this.userId(), limit: mediaType === MediaType.AUDIO ? MAX_GALLERY_AUDIO : MAX_GALLERY_PHOTOS };
    }

    if (mediaType !== MediaType.IMAGE) throw new BadRequestException("Only photos can be added to a band");
    const experiences = await this.musicianBandExperienceRepository.getByProfileId(profile.id);
    if (!experiences.some((experience) => experience.id === target.band_experience_id)) throw new NotFoundException("That band was not found");
    return { type: MediaOwnerType.BAND_EXPERIENCE, id: target.band_experience_id, limit: MAX_BAND_EXPERIENCE_PHOTOS };
  }

  private async ownsMedia(media: PortfolioMediaEntity): Promise<boolean> {
    if (media.owner_type === MediaOwnerType.USER) return media.owner_id === this.userId();
    if (media.owner_type !== MediaOwnerType.BAND_EXPERIENCE) return false;

    const profile = await this.musicianProfileRepository.getByUserId(this.userId());
    if (!profile) return false;
    const experiences = await this.musicianBandExperienceRepository.getByProfileId(profile.id);
    return experiences.some((experience) => experience.id === media.owner_id);
  }

  /** Unknown ids are a 400; a pick another pick already covers is dropped (Dhaka division + Savar → Dhaka division). */
  private async resolveLocations(ids: number[]): Promise<{ id: number }[]> {
    const found = await this.locationRepository.getByIds(ids);
    const unknown = ids.filter((id) => !found.some((location) => location.id === id));
    if (unknown.length) throw new BadRequestException(`Unknown location id(s): ${unknown.join(", ")}`);
    return dropCoveredLocations(found);
  }

  /** Makes the user's `user_locations` exactly `wanted`, keeping rows that stay. */
  private async replaceLocations(manager: EntityManager, wanted: number[]): Promise<void> {
    const userId = this.userId();
    const existing = await manager.find(UserLocationEntity, { where: { user_id: userId } });

    await this.softRemoveAll(
      manager,
      existing.filter((row) => !wanted.includes(row.location_id)),
    );
    const added = wanted.filter((id) => !existing.some((row) => row.location_id === id));
    if (added.length) await manager.save(added.map((location_id) => manager.create(UserLocationEntity, { user_id: userId, location_id })));
  }

  /** The user's locations, each labelled with the places above it ("Savar, Dhaka"). */
  private async locationViews(userId: number): Promise<ProfileLocationView[]> {
    const picked = await this.userLocationRepository.getByUserId(userId);
    return labelLocations(
      this.locationRepository,
      picked.map((location) => location.id),
    );
  }

  private async assertKnown(noun: string, ids: number[], existing: (ids: number[]) => Promise<number[]>): Promise<void> {
    const found = await existing(ids);
    const unknown = ids.filter((id) => !found.includes(id));
    if (unknown.length) throw new BadRequestException(`Unknown ${noun} id(s): ${unknown.join(", ")}`);
  }

  /** `softRemove()`, never `softDelete()`, so `deleted_by` / `deleted_ip` are stamped (coding-standards §0). */
  private async softRemoveAll<T>(manager: EntityManager, rows: T[]): Promise<void> {
    if (rows.length) await manager.softRemove(rows);
  }
}

const EMPTY_PROFILE: MusicianProfileView = {
  id: null,
  slug: null,
  setup_step: 0,
  profile_completion: 0,
  is_discoverable: false,
  photo_url: null,
  bio: null,
  locations: [],
  performs_genre_ids: [],
  listens_genre_ids: [],
  instruments: [],
  phone: null,
  show_phone: false,
  availability: [],
  band_interest: null,
  audio: [],
  photos: [],
  videos: [],
  band_experiences: [],
};

const mediaView = (item: PortfolioMediaEntity): MediaItemView => ({
  id: item.id,
  media_type: item.media_type,
  file_name: item.file_name ?? null,
  secure_url: item.secure_url,
  format: item.format,
  file_size: item.file_size,
  duration_seconds: item.duration_seconds ?? null,
});

/** Postgres `time` → `HH:MM`. */
const hhmm = (time: string | null): string | null => (time ? time.slice(0, 5) : null);

/**
 * Validates a whole availability list (schema-design §4.4): both times or neither, a slot cannot start
 * and end together, no duplicates, and "any day, any time" stands alone.
 */
export const normalizeSlots = (slots: AvailabilitySlotDto[]): Slot[] => {
  const normalized: Slot[] = slots.map((slot) => ({
    day_of_week: slot.day_of_week === undefined || slot.day_of_week === null ? null : Number(slot.day_of_week),
    start_time: slot.start_time || null,
    end_time: slot.end_time || null,
  }));

  for (const slot of normalized) {
    if ((slot.start_time === null) !== (slot.end_time === null)) {
      throw new BadRequestException("Give each time slot both a start and an end time, or choose Anytime");
    }
    if (slot.start_time !== null && slot.start_time === slot.end_time)
      throw new BadRequestException("A time slot cannot start and end at the same time");
  }

  const keys = normalized.map((slot) => `${slot.day_of_week}|${slot.start_time}|${slot.end_time}`);
  if (new Set(keys).size !== keys.length) throw new BadRequestException("The same time slot is listed twice");

  const anyTime = normalized.some((slot) => slot.day_of_week === null && slot.start_time === null);
  if (anyTime && normalized.length > 1) throw new BadRequestException('"Any day, any time" already covers every slot. Remove the others');

  return normalized;
};

/** Every URL must be a recognised video link, and no link may appear twice. */
export const parseVideoLinks = (urls: string[], max: number): ParsedVideoLink[] => {
  if (urls.length > max) throw new BadRequestException(`You can add up to ${max} video links here`);

  const links = urls.map((url) => {
    const link = parseVideoLink(url);
    if (!link) throw new BadRequestException(`"${url.slice(0, 80)}" is not a YouTube, Facebook or Vimeo video link`);
    return link;
  });

  const keys = links.map((link) => `${link.provider}:${link.external_video_id}`);
  if (new Set(keys).size !== keys.length) throw new BadRequestException("The same video is listed twice");
  return links;
};
