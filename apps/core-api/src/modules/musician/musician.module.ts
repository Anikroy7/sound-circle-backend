import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MusicianAvailabilitySlotEntity } from "@soundcircle/shared/database/entities/musician/musician-availability-slot.entity";
import { MusicianBandExperienceEntity } from "@soundcircle/shared/database/entities/musician/musician-band-experience.entity";
import { MusicianGenreEntity } from "@soundcircle/shared/database/entities/musician/musician-genre.entity";
import { MusicianInstrumentEntity } from "@soundcircle/shared/database/entities/musician/musician-instrument.entity";
import { MusicianProfileEntity } from "@soundcircle/shared/database/entities/musician/musician-profile.entity";
import { MusicianVideoLinkEntity } from "@soundcircle/shared/database/entities/musician/musician-video-link.entity";
import { MusicianAvailabilitySlotRepository } from "@soundcircle/shared/database/repositories/musician/musician-availability-slot.repository";
import { MusicianBandExperienceRepository } from "@soundcircle/shared/database/repositories/musician/musician-band-experience.repository";
import { MusicianGenreRepository } from "@soundcircle/shared/database/repositories/musician/musician-genre.repository";
import { MusicianInstrumentRepository } from "@soundcircle/shared/database/repositories/musician/musician-instrument.repository";
import { MusicianProfileRepository } from "@soundcircle/shared/database/repositories/musician/musician-profile.repository";
import { MusicianVideoLinkRepository } from "@soundcircle/shared/database/repositories/musician/musician-video-link.repository";
import { GenreModule } from "@apps/core-api/modules/genre/genre.module";
import { InstrumentModule } from "@apps/core-api/modules/instrument/instrument.module";
import { LocationModule } from "@apps/core-api/modules/location/location.module";
import { MediaModule } from "@apps/core-api/modules/media/media.module";
import { UserModule } from "@apps/core-api/modules/user/user.module";
import { MusicianProfileController } from "@apps/core-api/modules/musician/musician-profile.controller";
import { MusicianPublicController } from "@apps/core-api/modules/musician/musician.public.controller";
import { MusicianProfileService } from "@apps/core-api/modules/musician/musician-profile.service";

/** The musician domain (schema-design §4.4). Reads users (and their locations), locations, instruments, genres and media through their modules. */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      MusicianProfileEntity,
      MusicianGenreEntity,
      MusicianInstrumentEntity,
      MusicianAvailabilitySlotEntity,
      MusicianBandExperienceEntity,
      MusicianVideoLinkEntity,
    ]),
    UserModule,
    InstrumentModule,
    GenreModule,
    LocationModule,
    MediaModule,
  ],
  controllers: [MusicianProfileController, MusicianPublicController],
  providers: [
    MusicianProfileRepository,
    MusicianGenreRepository,
    MusicianInstrumentRepository,
    MusicianAvailabilitySlotRepository,
    MusicianBandExperienceRepository,
    MusicianVideoLinkRepository,
    MusicianProfileService,
  ],
  exports: [MusicianProfileRepository, MusicianInstrumentRepository],
})
export class MusicianModule {}
