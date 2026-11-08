import { UserEntity } from "@soundcircle/shared/database/entities/identity/user.entity";

/** The signed-in account as login and `GET /auth/me` return it: the user, plus their profile photo for the header avatar. */
export type AccountView = UserEntity & { photo_url: string | null };

/** The pair a login or refresh issues; the controller writes them into cookies and never into the body. */
export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  /** Persistent cookies ("Keep me logged in") rather than browser-session ones. */
  remember: boolean;
}
