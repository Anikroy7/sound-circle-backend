import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserEntity } from "@soundcircle/shared/database/entities/identity/user.entity";
import { UserRepository } from "@soundcircle/shared/database/repositories/identity/user.repository";
import { UserPublicController } from "@apps/core-api/modules/user/user.public.controller";
import { UserService } from "@apps/core-api/modules/user/user.service";

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  controllers: [UserPublicController],
  providers: [UserRepository, UserService],
  exports: [UserRepository],
})
export class UserModule {}
