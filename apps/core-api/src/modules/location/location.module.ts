import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LocationEntity } from "@soundcircle/shared/database/entities/reference/location.entity";
import { LocationRepository } from "@soundcircle/shared/database/repositories/reference/location.repository";
import { LocationPublicController } from "@apps/core-api/modules/location/location.public.controller";
import { LocationService } from "@apps/core-api/modules/location/location.service";

@Module({
  imports: [TypeOrmModule.forFeature([LocationEntity])],
  controllers: [LocationPublicController],
  providers: [LocationRepository, LocationService],
  exports: [LocationRepository],
})
export class LocationModule {}
