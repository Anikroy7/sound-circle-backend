import { Module } from "@nestjs/common";
import { MusicianModule } from "@apps/core-api/modules/musician/musician.module";
import { UserModule } from "@apps/core-api/modules/user/user.module";
import { AuthController } from "@apps/core-api/modules/auth/auth.controller";
import { AuthPublicController } from "@apps/core-api/modules/auth/auth.public.controller";
import { AuthService } from "@apps/core-api/modules/auth/auth.service";

/** Auth has no table (schema-design §4.1): it reads `users` through `UserModule`, and the profile photo through `MusicianModule`. */
@Module({
  imports: [UserModule, MusicianModule],
  controllers: [AuthPublicController, AuthController],
  providers: [AuthService],
})
export class AuthModule {}
