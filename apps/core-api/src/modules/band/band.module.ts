import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BandGenreEntity } from "@soundcircle/shared/database/entities/band/band-genre.entity";
import { BandMemberEntity } from "@soundcircle/shared/database/entities/band/band-member.entity";
import { BandVideoLinkEntity } from "@soundcircle/shared/database/entities/band/band-video-link.entity";
import { BandEntity } from "@soundcircle/shared/database/entities/band/band.entity";
import { BandGenreRepository } from "@soundcircle/shared/database/repositories/band/band-genre.repository";
import { BandMemberRepository } from "@soundcircle/shared/database/repositories/band/band-member.repository";
import { BandVideoLinkRepository } from "@soundcircle/shared/database/repositories/band/band-video-link.repository";
import { BandRepository } from "@soundcircle/shared/database/repositories/band/band.repository";
import { GenreModule } from "@apps/core-api/modules/genre/genre.module";
import { LocationModule } from "@apps/core-api/modules/location/location.module";
import { MediaModule } from "@apps/core-api/modules/media/media.module";
import { UserModule } from "@apps/core-api/modules/user/user.module";
import { BandController } from "@apps/core-api/modules/band/band.controller";
import { BandPublicController } from "@apps/core-api/modules/band/band.public.controller";
import { BandService } from "@apps/core-api/modules/band/band.service";

/** Bands (schema-design §4.5). Reads users, genres, locations and media through their modules. */
@Module({
  imports: [
    TypeOrmModule.forFeature([BandEntity, BandGenreEntity, BandMemberEntity, BandVideoLinkEntity]),
    UserModule,
    GenreModule,
    LocationModule,
    MediaModule,
  ],
  // BandController first: its two-segment `me/draft` routes never collide with `:slug`, but keep the specific routes ahead anyway.
  controllers: [BandController, BandPublicController],
  providers: [BandRepository, BandGenreRepository, BandMemberRepository, BandVideoLinkRepository, BandService],
})
export class BandModule {}
