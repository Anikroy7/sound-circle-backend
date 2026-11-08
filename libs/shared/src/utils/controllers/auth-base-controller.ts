import { UseGuards } from "@nestjs/common";
import { AuthGuard } from "@soundcircle/shared/utils/guards/auth.guard";

/**
 * Routes for a signed-in user. The guard is inherited by every subclass, so no controller
 * scatters its own. 401 when the access-token cookie is missing, invalid or expired.
 *
 * Controller files: `*.controller.ts`.
 */
@UseGuards(AuthGuard)
export class AuthBaseController {}
