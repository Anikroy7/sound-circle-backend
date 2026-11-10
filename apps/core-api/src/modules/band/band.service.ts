import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
import { BandGenreEntity } from "@soundcircle/shared/database/entities/band/band-genre.entity";
import { BandMemberEntity } from "@soundcircle/shared/database/entities/band/band-member.entity";
import { BandVideoLinkEntity } from "@soundcircle/shared/database/entities/band/band-video-link.entity";
import { BandEntity } from "@soundcircle/shared/database/entities/band/band.entity";
import { BandOpenRoleEntity } from "@soundcircle/shared/database/entities/band/band-open-role.entity";
import { BandMemberGenreEntity } from "@soundcircle/shared/database/entities/band/band-member-genre.entity";
import { BandMemberInterestEntity } from "@soundcircle/shared/database/entities/band/band-member-interest.entity";
import { BandMemberRole, MembershipRequestType, OpenRoleStatus } from "@soundcircle/shared/database/entities/band/enums/band.enum";
import { InstrumentFamily } from "@soundcircle/shared/database/entities/reference/enums/reference.enum";
import { MediaOwnerType, MediaType } from "@soundcircle/shared/database/entities/media/enums/media.enum";
import { PortfolioMediaEntity } from "@soundcircle/shared/database/entities/media/portfolio-media.entity";
import { BandGenreRepository } from "@soundcircle/shared/database/repositories/band/band-genre.repository";
import { BandMemberGenreRepository } from "@soundcircle/shared/database/repositories/band/band-member-genre.repository";
import { BandMemberInterestRepository } from "@soundcircle/shared/database/repositories/band/band-member-interest.repository";
import { BandMemberRepository, BandMemberRow } from "@soundcircle/shared/database/repositories/band/band-member.repository";
import { BandMilestoneRepository } from "@soundcircle/shared/database/repositories/band/band-milestone.repository";
import { BandVideoLinkRepository } from "@soundcircle/shared/database/repositories/band/band-video-link.repository";
import { BandMembershipRequestRepository } from "@soundcircle/shared/database/repositories/band/band-membership-request.repository";
import { BandOpenRoleRepository } from "@soundcircle/shared/database/repositories/band/band-open-role.repository";
import { BandRepository } from "@soundcircle/shared/database/repositories/band/band.repository";
import { MusicianInstrumentRepository } from "@soundcircle/shared/database/repositories/musician/musician-instrument.repository";
import { MusicianProfileRepository } from "@soundcircle/shared/database/repositories/musician/musician-profile.repository";
import { UserRepository } from "@soundcircle/shared/database/repositories/identity/user.repository";
import { GenreRepository } from "@soundcircle/shared/database/repositories/reference/genre.repository";
import { InstrumentRepository } from "@soundcircle/shared/database/repositories/reference/instrument.repository";
import { FilterBandDto } from "@soundcircle/shared/utils/dtos/band/filter-band.dto";
import { LocationRepository } from "@soundcircle/shared/database/repositories/reference/location.repository";
import {
  MAX_BAND_MEMBERS,
  MAX_BAND_PHOTOS,
  MAX_BAND_VIDEOS,
  MAX_MEMBER_SEARCH_RESULTS,
  MAX_OPEN_ROLES,
  MIN_MEMBER_SEARCH_LENGTH,
  PG_UNIQUE_VIOLATION,
} from "@soundcircle/shared/utils/util/constant";
import { MILESTONE_MEMBER_COUNTS } from "@soundcircle/shared/utils/util/band-milestone.util";
import { matchInstrument } from "@soundcircle/shared/utils/util/instrument-match.util";
import { toProfileSlug } from "@soundcircle/shared/utils/util/slug.util";
import { AuthUser } from "@soundcircle/shared/utils/util/utils";
import { labelLocations } from "@apps/core-api/modules/location/location-label";
import { MediaService } from "@apps/core-api/modules/media/media.service";
import { MediaOwner, UploadTicket } from "@apps/core-api/modules/media/common/types/media.type";
import { parseVideoLinks } from "@apps/core-api/modules/musician/musician-profile.service";
import { MediaItemView } from "@apps/core-api/modules/musician/common/types/musician-profile.type";
import {
  BandCardView,
  BandDashboardView,
  BandView,
  BandViewerView,
  MemberCandidateView,
  MembershipCardView,
  MyBandView,
  OpenRoleView,
} from "@apps/core-api/modules/band/common/types/band.type";
import { SearchPage } from "@apps/core-api/modules/musician/common/types/musician-profile.type";
import { buildLineup, membershipCode, unlockMilestones } from "@apps/core-api/modules/band/common/utils/band-chemistry.util";
import { requestView } from "@apps/core-api/modules/band/membership/membership-request.service";
import {
  AddBandMemberDto,
  AddOpenRoleDto,
  AttachBandPhotoDto,
  SaveIntroductionDto,
  BandImageDto,
  SaveBandInfoDto,
  UpdateBandVideosDto,
} from "@apps/core-api/modules/band/dto/band.dto";

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
    private readonly bandOpenRoleRepository: BandOpenRoleRepository,
    private readonly bandMembershipRequestRepository: BandMembershipRequestRepository,
    private readonly musicianProfileRepository: MusicianProfileRepository,
    private readonly musicianInstrumentRepository: MusicianInstrumentRepository,
    private readonly instrumentRepository: InstrumentRepository,
    private readonly bandMilestoneRepository: BandMilestoneRepository,
    private readonly bandMemberGenreRepository: BandMemberGenreRepository,
    private readonly bandMemberInterestRepository: BandMemberInterestRepository,
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

  /** The band directory: published bands, filtered (schema-design §6). */
  async search(filters: FilterBandDto): Promise<SearchPage<BandCardView>> {
    const page = await this.bandRepository.search(filters);
    const labels = new Map(
      (await labelLocations(this.locationRepository, [...new Set(page.items.map((row) => row.location_id))])).map((location) => [
        location.id,
        location.label,
      ]),
    );
    return {
      items: page.items.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        logo_url: row.logo_url ?? null,
        bio: row.bio,
        band_type: row.band_type,
        location: labels.get(row.location_id) ?? null,
        genres: row.genres ? row.genres.split(", ") : [],
        member_count: Number(row.member_count),
        open_roles: row.open_roles ? row.open_roles.split(", ") : [],
      })),
      meta: { total: page.meta.totalItems, page: page.meta.currentPage, page_size: page.meta.itemsPerPage, total_pages: page.meta.totalPages },
    };
  }

  /** Every band the caller is in, owned first; their own drafts too. */
  async getMine(): Promise<MyBandView[]> {
    const rows = await this.bandRepository.getByMember(this.userId());
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug ?? null,
      name: row.name,
      logo_url: row.logo_url ?? null,
      is_owner: Number(row.role) === BandMemberRole.OWNER,
      is_draft: !row.published_at,
      member_count: Number(row.member_count),
      open_role_count: Number(row.open_role_count),
    }));
  }

  /* ------------------------------------------------------------------ open positions */

  /** Opens a position for an instrument. One open position per instrument; at most `MAX_OPEN_ROLES`. */
  async addOpenRole(bandId: number, reqDto: AddOpenRoleDto): Promise<BandView> {
    await this.assertOwner(bandId);
    if (!(await this.instrumentRepository.getExistingIds([reqDto.instrument_id])).length)
      throw new BadRequestException("Choose an instrument from the list");

    await this.dataSource.transaction(async (manager) => {
      await this.lockBand(manager, bandId);
      const open = await manager.find(BandOpenRoleEntity, { where: { band_id: bandId, status: OpenRoleStatus.OPEN } });
      if (open.some((role) => role.instrument_id === reqDto.instrument_id)) throw new ConflictException("You're already looking for that instrument");
      if (open.length >= MAX_OPEN_ROLES) throw new BadRequestException(`A band can have up to ${MAX_OPEN_ROLES} open positions`);
      await manager.save(
        manager.create(BandOpenRoleEntity, {
          band_id: bandId,
          instrument_id: reqDto.instrument_id,
          description: reqDto.description?.trim() || null,
          status: OpenRoleStatus.OPEN,
        }),
      );
    });
    return this.ownerView(bandId);
  }

  /** Takes a position down. Pending requests for it stay answerable; accepting one just leaves it closed. */
  async closeOpenRole(bandId: number, roleId: number): Promise<BandView> {
    await this.assertOwner(bandId);
    await this.dataSource.transaction(async (manager) => {
      const role = await manager.findOne(BandOpenRoleEntity, { where: { id: roleId, band_id: bandId }, lock: { mode: "pessimistic_write" } });
      if (!role || role.status !== OpenRoleStatus.OPEN) throw new NotFoundException("That open position was not found");
      role.status = OpenRoleStatus.CLOSED;
      await manager.save(role);
    });
    return this.ownerView(bandId);
  }

  /* ------------------------------------------------------------------ membership: dashboard, welcome, introduction, card */

  /** A band's own dashboard, for any member. The request queues are filled for the owner only. */
  async getDashboard(bandId: number): Promise<BandDashboardView> {
    const band = await this.bandRepository.getOne(bandId);
    const me = this.userId();
    if (!band || !(await this.isMember(bandId, me))) throw new NotFoundException("That band was not found");
    const isOwner = await this.isOwner(bandId, me);

    const [view, invitations, joinRequests] = await Promise.all([
      this.view(band, isOwner),
      isOwner ? this.bandMembershipRequestRepository.getForBand(bandId, MembershipRequestType.INVITATION, false) : Promise.resolve([]),
      isOwner ? this.bandMembershipRequestRepository.getForBand(bandId, MembershipRequestType.JOIN_REQUEST, true) : Promise.resolve([]),
    ]);
    return { band: view, invitations: invitations.map(requestView), join_requests: joinRequests.map(requestView) };
  }

  /** The member saw their welcome and skipped the introduction. Seeing it twice changes nothing. */
  async markWelcomed(bandId: number): Promise<BandView> {
    await this.dataSource.transaction(async (manager) => {
      const member = await this.lockOwnMembership(manager, bandId);
      if (member.welcomed_at) return;
      member.welcomed_at = new Date();
      await manager.save(member);
    });
    return this.memberView(bandId);
  }

  /**
   * The member's introduction to their band: a short note, favourite genres and interests, each optional.
   * Saving it also counts as seeing the welcome. Genres and interests are replaced whole.
   */
  async saveIntroduction(bandId: number, reqDto: SaveIntroductionDto): Promise<BandView> {
    const genreIds = [...new Set(reqDto.genre_ids ?? [])];
    const interests = [...new Set((reqDto.interests ?? []).map(Number))];
    await this.assertKnownGenres(genreIds);
    const intro = reqDto.intro?.trim() || null;

    await this.dataSource.transaction(async (manager) => {
      const member = await this.lockOwnMembership(manager, bandId);
      const now = new Date();
      member.intro = intro;
      member.introduced_at = intro || genreIds.length || interests.length ? now : null;
      member.welcomed_at = member.welcomed_at ?? now;
      await manager.save(member);

      const [oldGenres, oldInterests] = await Promise.all([
        manager.find(BandMemberGenreEntity, { where: { band_member_id: member.id } }),
        manager.find(BandMemberInterestEntity, { where: { band_member_id: member.id } }),
      ]);
      const staleGenres = oldGenres.filter((row) => !genreIds.includes(row.genre_id));
      const staleInterests = oldInterests.filter((row) => !interests.includes(Number(row.interest)));
      if (staleGenres.length) await manager.softRemove(staleGenres);
      if (staleInterests.length) await manager.softRemove(staleInterests);

      const newGenres = genreIds.filter((id) => !oldGenres.some((row) => row.genre_id === id));
      const newInterests = interests.filter((value) => !oldInterests.some((row) => Number(row.interest) === value));
      if (newGenres.length)
        await manager.save(newGenres.map((genre_id) => manager.create(BandMemberGenreEntity, { band_member_id: member.id, genre_id })));
      if (newInterests.length) {
        await manager.save(newInterests.map((interest) => manager.create(BandMemberInterestEntity, { band_member_id: member.id, interest })));
      }
    });
    return this.memberView(bandId);
  }

  /** A member leaves. The owner can't: a band always has one. Milestones already unlocked stay. */
  async leave(bandId: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const member = await this.lockOwnMembership(manager, bandId);
      if (Number(member.role) === BandMemberRole.OWNER) throw new BadRequestException("The owner can't leave their band");
      await manager.softRemove(member);
    });
  }

  /** A member's digital membership card, for a published band. Public: it shows only what the band page does. */
  async getCard(slug: string, memberId: number): Promise<MembershipCardView> {
    const band = await this.bandRepository.getPublishedBySlug(slug);
    if (!band) throw new NotFoundException("That band was not found");
    const view = await this.view(band, false);
    const member = view.members.find((row) => row.id === memberId);
    if (!member) throw new NotFoundException("That member was not found");

    return {
      code: member.card_code,
      band: { id: view.id, name: view.name, slug: view.slug, logo_url: view.logo_url },
      member: {
        id: member.id,
        name: member.name,
        photo_url: member.photo_url,
        instrument: member.instrument?.name ?? member.position,
        is_owner: member.is_owner,
        joined_at: member.joined_at,
        profile_slug: member.profile_slug,
      },
    };
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
    const instrumentId = matchInstrument(position, await this.instrumentRepository.getAll());

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
            instrument_id: instrumentId,
            photo_public_id: photo?.public_id ?? null,
            photo_url: photo?.secure_url ?? null,
          }),
        );
        await unlockMilestones(manager, bandId);
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

  private async isMember(bandId: number, userId: number): Promise<boolean> {
    return (await this.bandMemberRepository.count({ where: { band_id: bandId, user_id: userId } })) > 0;
  }

  /** The caller's own line-up row, locked; 404 when they aren't in the band. */
  private async lockOwnMembership(manager: EntityManager, bandId: number): Promise<BandMemberEntity> {
    const member = await manager.findOne(BandMemberEntity, {
      where: { band_id: bandId, user_id: this.userId() },
      lock: { mode: "pessimistic_write" },
    });
    if (!member) throw new NotFoundException("That band was not found");
    return member;
  }

  private async memberView(bandId: number): Promise<BandView> {
    return this.view(await this.bandRepository.getOne(bandId), await this.isOwner(bandId, this.userId()));
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
    const [genres, members, media, videos, locations, openRoles, catalog, milestones] = await Promise.all([
      this.bandGenreRepository.getByBandId(band.id),
      this.bandMemberRepository.getByBandId(band.id),
      this.mediaService.getByOwners(MediaOwnerType.BAND, [band.id]),
      this.bandVideoLinkRepository.getByBandId(band.id),
      labelLocations(this.locationRepository, [band.location_id]),
      this.bandOpenRoleRepository.getOpenByBandId(band.id),
      this.instrumentRepository.getAll(),
      this.bandMilestoneRepository.getByBandId(band.id),
    ]);
    const memberIds = members.map((member) => member.id);
    const [introGenres, introInterests] = await Promise.all([
      this.bandMemberGenreRepository.getByMemberIds(memberIds),
      this.bandMemberInterestRepository.getByMemberIds(memberIds),
    ]);
    const viewerId: number | null = AuthUser.get()?.getId?.() ?? null;
    const instruments = new Map(catalog.map((instrument) => [instrument.id, instrument]));
    const familyOf = (instrumentId: number | null): InstrumentFamily | null =>
      instrumentId ? (instruments.get(instrumentId)?.family ?? null) : null;
    const roles: OpenRoleView[] = openRoles.map((role) => ({
      id: role.id,
      instrument_id: role.instrument_id,
      instrument_name: role.instrument_name,
      description: role.description ?? null,
    }));
    const unlocked = new Map(milestones.map((row) => [Number(row.milestone), row.achieved_at]));
    const me = viewerId ? members.find((member) => member.user_id === viewerId) : undefined;

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
      members: members.map((member) => {
        const instrument = member.instrument_id ? instruments.get(member.instrument_id) : undefined;
        return {
          id: member.id,
          user_id: member.user_id ?? null,
          is_owner: Number(member.role) === BandMemberRole.OWNER,
          name: member.name,
          position: member.position ?? null,
          photo_url: member.photo_url ?? null,
          instrument: instrument ? { id: instrument.id, name: instrument.name, family: instrument.family ?? null } : null,
          joined_at: new Date(member.joined_at).toISOString(),
          profile_slug: member.profile_slug ?? null,
          intro: member.intro ?? null,
          intro_genres: introGenres.filter((row) => row.band_member_id === member.id).map(({ id, name }) => ({ id, name })),
          interests: introInterests.filter((row) => row.band_member_id === member.id).map((row) => Number(row.interest)),
          card_code: membershipCode(band.id, member.id),
        };
      }),
      photos: media.filter((item) => item.media_type === MediaType.IMAGE).map(photoView),
      videos: videos.map((row) => ({ id: row.id, provider: row.provider, external_video_id: row.external_video_id, url: row.url })),
      open_roles: roles,
      lineup: buildLineup(
        members.map((member) => familyOf(member.instrument_id)),
        roles.map((role) => familyOf(role.instrument_id)),
      ),
      milestones: (Object.entries(MILESTONE_MEMBER_COUNTS) as [string, number][]).map(([milestone, count]) => ({
        milestone: Number(milestone),
        members: count,
        achieved_at: unlocked.has(Number(milestone)) ? new Date(unlocked.get(Number(milestone))).toISOString() : null,
      })),
      is_owner: isOwner,
      viewer: await this.viewerContext(band.id, viewerId, me, roles),
    };
  }

  /** What the band page should offer the viewer: their welcome, nothing for a member, an answer for a pending request, or Join. */
  private async viewerContext(
    bandId: number,
    viewerId: number | null,
    me: BandMemberRow | undefined,
    roles: OpenRoleView[],
  ): Promise<BandViewerView> {
    if (!viewerId) return { signed_in: false, is_member: false, pending_request: null, fillable_role_ids: [], member_id: null, needs_welcome: false };
    const isMember = !!me;

    const [pending, profile] = await Promise.all([
      this.bandMembershipRequestRepository.getPendingBetween([bandId], viewerId),
      this.musicianProfileRepository.getByUserId(viewerId),
    ]);
    const played = profile ? (await this.musicianInstrumentRepository.getByProfileId(profile.id)).map((row) => row.instrument_id) : [];
    const request = pending[0];

    return {
      signed_in: true,
      is_member: isMember,
      pending_request: request ? { id: request.id, type: Number(request.type), instrument_name: request.instrument_name ?? null } : null,
      fillable_role_ids: isMember ? [] : roles.filter((role) => played.includes(role.instrument_id)).map((role) => role.id),
      member_id: me?.id ?? null,
      needs_welcome: !!me && Number(me.role) !== BandMemberRole.OWNER && !me.welcomed_at,
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
