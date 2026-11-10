/**
 * The ONLY file in the repository that reads `process.env`. Everything else reads
 * `ENV.<VAR>`. `@nestjs/config` is deliberately not installed.
 */
export const ENV = process.env;

export const DEFAULT_PAGE_NO = 1;
export const DEFAULT_PAGE_SIZE = 10;

/** The most available locations one user may pick (schema-design §4.1). */
export const MAX_USER_LOCATIONS = 20;

/** `GET /locations?near_location_id=` — the radius when none is given, and the most allowed (Bangladesh is ~750 km tall). */
export const DEFAULT_NEAR_RADIUS_KM = 10;
export const MAX_NEAR_RADIUS_KM = 300;

/** Postgres `unique_violation` — a unique index caught a duplicate the pre-check missed. */
export const PG_UNIQUE_VIOLATION = "23505";

/**
 * Auth (schema-design §4.1): a short-lived access JWT and a refresh JWT, each in its own httpOnly cookie.
 * ⚠ A stateless refresh token cannot be revoked, so its lifetime stays short.
 */
export const ACCESS_TOKEN_COOKIE = "sc_access";
export const REFRESH_TOKEN_COOKIE = "sc_refresh";
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

/** Media (schema-design §4.3). Every upload is at most 10 MB, image or audio. */
export const MAX_MEDIA_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_GALLERY_AUDIO = 10;
export const MAX_GALLERY_PHOTOS = 20;
export const MAX_BAND_EXPERIENCE_PHOTOS = 10;
export const AUDIO_FORMATS = ["mp3", "wav", "m4a", "aac", "ogg", "flac", "opus"];
export const IMAGE_FORMATS = ["jpg", "jpeg", "png", "webp"];

/** Musician profile setup (schema-design §4.4). */
export const PROFILE_SETUP_STEPS = 8;
export const MIN_BIO_LENGTH = 30;
export const MAX_BIO_LENGTH = 1000;
export const MAX_GENRES_PER_RELATION = 10;
export const MAX_INSTRUMENTS = 10;
export const MAX_AVAILABILITY_SLOTS = 21;
export const MAX_GALLERY_VIDEOS = 10;
export const MAX_BAND_EXPERIENCES = 10;
export const MAX_BAND_EXPERIENCE_VIDEOS = 5;

/* Bands (schema-design §4.5). */
export const MIN_BAND_NAME_LENGTH = 2;
export const MAX_BAND_NAME_LENGTH = 100;
export const MIN_BAND_BIO_LENGTH = 30;
export const MAX_BAND_BIO_LENGTH = 2000;
export const MAX_BAND_GENRES = 10;
/** Owner included. */
export const MAX_BAND_MEMBERS = 30;
export const MAX_MEMBER_NAME_LENGTH = 100;
export const MAX_MEMBER_POSITION_LENGTH = 120;
export const MAX_BAND_PHOTOS = 20;
export const MAX_BAND_VIDEOS = 10;
/** Member search: shortest query, and how many results. */
export const MIN_MEMBER_SEARCH_LENGTH = 2;
export const MAX_MEMBER_SEARCH_RESULTS = 10;

/* Open roles and membership requests (schema-design §4.5). */
export const MAX_OPEN_ROLES = 10;
export const MAX_OPEN_ROLE_DESCRIPTION_LENGTH = 500;
export const MAX_REQUEST_MESSAGE_LENGTH = 1000;
/** A pending invitation or join request lapses after this many days. */
export const MEMBERSHIP_REQUEST_TTL_DAYS = 30;
/** Musician and band search. */
export const DEFAULT_SEARCH_PAGE_SIZE = 12;
export const MAX_SEARCH_PAGE_SIZE = 48;

/* A member's introduction to their band (schema-design §4.5). */
export const MAX_INTRO_LENGTH = 500;
export const MAX_INTRO_GENRES = 5;
export const MAX_INTRO_INTERESTS = 5;
