/**
 * Every table name in the system, declared once. `@Entity(TABLE_*)` and every migration
 * take the name from here — a literal string in an entity decorator is a defect.
 *
 * Grouped to match the domains in `doc/schema-design.md` §4. Each block fills as its table lands.
 */

/*========IDENTITY AND AUTH (§4.1)=========*/
export const TABLE_USERS: string = "users";
export const TABLE_USER_LOCATIONS: string = "user_locations";

/*========REFERENCE DATA (§4.2)=========*/
export const TABLE_LOCATIONS: string = "locations";
export const TABLE_INSTRUMENTS: string = "instruments";
export const TABLE_GENRES: string = "genres";

/*========MEDIA (§4.3)=========*/
export const TABLE_PORTFOLIO_MEDIA: string = "portfolio_media";

/*========MUSICIAN PROFILE (§4.4)=========*/
export const TABLE_MUSICIAN_PROFILES: string = "musician_profiles";
export const TABLE_MUSICIAN_GENRES: string = "musician_genres";
export const TABLE_MUSICIAN_INSTRUMENTS: string = "musician_instruments";
export const TABLE_MUSICIAN_AVAILABILITY_SLOTS: string = "musician_availability_slots";
export const TABLE_MUSICIAN_BAND_EXPERIENCES: string = "musician_band_experiences";
export const TABLE_MUSICIAN_VIDEO_LINKS: string = "musician_video_links";

/*========BANDS (§4.5)=========*/
export const TABLE_BANDS: string = "bands";
export const TABLE_BAND_GENRES: string = "band_genres";
export const TABLE_BAND_MEMBERS: string = "band_members";
export const TABLE_BAND_VIDEO_LINKS: string = "band_video_links";
