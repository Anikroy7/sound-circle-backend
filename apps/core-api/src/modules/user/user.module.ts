import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserEntity } from "@soundcircle/shared/database/entities/identity/user.entity";
import { UserLocationEntity } from "@soundcircle/shared/database/entities/identity/user-location.entity";
import { UserRepository } from "@soundcircle/shared/database/repositories/identity/user.repository";
import { UserLocationRepository } from "@soundcircle/shared/database/repositories/identity/user-location.repository";
import { LocationModule } from "@apps/core-api/modules/location/location.module";
import { UserPublicController } from "@apps/core-api/modules/user/user.public.controller";
import { UserService } from "@apps/core-api/modules/user/user.service";

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, UserLocationEntity]), LocationModule],
  controllers: [UserPublicController],
  providers: [UserRepository, UserLocationRepository, UserService],
  exports: [UserRepository, UserLocationRepository],
})
export class UserModule {}
