import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PortfolioMediaEntity } from "@soundcircle/shared/database/entities/media/portfolio-media.entity";
import { PortfolioMediaRepository } from "@soundcircle/shared/database/repositories/media/portfolio-media.repository";
import { CloudinaryService } from "@apps/core-api/modules/media/cloudinary.service";
import { MediaService } from "@apps/core-api/modules/media/media.service";

/**
 * Portfolio media and Cloudinary (schema-design §4.3). No controller of its own: each owner's module
 * exposes the routes, because only it can check that the signed-in user may write to that owner.
 */
@Module({
  imports: [TypeOrmModule.forFeature([PortfolioMediaEntity])],
  providers: [PortfolioMediaRepository, CloudinaryService, MediaService],
  exports: [MediaService],
})
export class MediaModule {}
