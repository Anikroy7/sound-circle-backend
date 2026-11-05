import { UserEntity } from "@soundcircle/shared/database/entities/identity/user.entity";
import { LocationEntity } from "@soundcircle/shared/database/entities/reference/location.entity";

/** A user as the create response returns it: the row plus its available locations. */
export type UserWithLocations = UserEntity & { locations: LocationEntity[] };
