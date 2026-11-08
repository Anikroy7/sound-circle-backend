import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GenreEntity } from "@soundcircle/shared/database/entities/reference/genre.entity";
import { GenreRepository } from "@soundcircle/shared/database/repositories/reference/genre.repository";
import { GenrePublicController } from "@apps/core-api/modules/genre/genre.public.controller";
import { GenreService } from "@apps/core-api/modules/genre/genre.service";

@Module({
  imports: [TypeOrmModule.forFeature([GenreEntity])],
  controllers: [GenrePublicController],
  providers: [GenreRepository, GenreService],
  exports: [GenreRepository],
})
export class GenreModule {}
