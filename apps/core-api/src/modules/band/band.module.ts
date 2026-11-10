import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BandGenreEntity } from "@soundcircle/shared/database/entities/band/band-genre.entity";
import { BandMemberGenreEntity } from "@soundcircle/shared/database/entities/band/band-member-genre.entity";
import { BandMemberInterestEntity } from "@soundcircle/shared/database/entities/band/band-member-interest.entity";
import { BandMemberEntity } from "@soundcircle/shared/database/entities/band/band-member.entity";
import { BandMilestoneEntity } from "@soundcircle/shared/database/entities/band/band-milestone.entity";
import { BandMembershipRequestEntity } from "@soundcircle/shared/database/entities/band/band-membership-request.entity";
import { BandOpenRoleEntity } from "@soundcircle/shared/database/entities/band/band-open-role.entity";
import { BandVideoLinkEntity } from "@soundcircle/shared/database/entities/band/band-video-link.entity";
import { BandEntity } from "@soundcircle/shared/database/entities/band/band.entity";
import { BandGenreRepository } from "@soundcircle/shared/database/repositories/band/band-genre.repository";
import { BandMemberGenreRepository } from "@soundcircle/shared/database/repositories/band/band-member-genre.repository";
import { BandMemberInterestRepository } from "@soundcircle/shared/database/repositories/band/band-member-interest.repository";
import { BandMemberRepository } from "@soundcircle/shared/database/repositories/band/band-member.repository";
import { BandMilestoneRepository } from "@soundcircle/shared/database/repositories/band/band-milestone.repository";
import { BandMembershipRequestRepository } from "@soundcircle/shared/database/repositories/band/band-membership-request.repository";
import { BandOpenRoleRepository } from "@soundcircle/shared/database/repositories/band/band-open-role.repository";
import { BandVideoLinkRepository } from "@soundcircle/shared/database/repositories/band/band-video-link.repository";
import { BandRepository } from "@soundcircle/shared/database/repositories/band/band.repository";
import { GenreModule } from "@apps/core-api/modules/genre/genre.module";
import { InstrumentModule } from "@apps/core-api/modules/instrument/instrument.module";
import { LocationModule } from "@apps/core-api/modules/location/location.module";
import { MediaModule } from "@apps/core-api/modules/media/media.module";
import { MusicianModule } from "@apps/core-api/modules/musician/musician.module";
import { UserModule } from "@apps/core-api/modules/user/user.module";
import { BandController } from "@apps/core-api/modules/band/band.controller";
import { BandPublicController } from "@apps/core-api/modules/band/band.public.controller";
import { BandService } from "@apps/core-api/modules/band/band.service";
import { MembershipRequestController } from "@apps/core-api/modules/band/membership/membership-request.controller";
import { MembershipRequestService } from "@apps/core-api/modules/band/membership/membership-request.service";

/**
 * Bands (schema-design §4.5): creation, open positions, and joining (invitations and join requests).
 * Reads users, musicians' instruments, genres, instruments, locations and media through their modules.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      BandEntity,
      BandGenreEntity,
      BandMemberEntity,
      BandVideoLinkEntity,
      BandOpenRoleEntity,
      BandMembershipRequestEntity,
      BandMilestoneEntity,
      BandMemberGenreEntity,
      BandMemberInterestEntity,
    ]),
    UserModule,
    GenreModule,
    InstrumentModule,
    LocationModule,
    MediaModule,
    MusicianModule,
  ],
  // BandController first: its `me` and `me/draft` routes must win over the public `:slug`.
  controllers: [BandController, BandPublicController, MembershipRequestController],
  providers: [
    BandRepository,
    BandGenreRepository,
    BandMemberRepository,
    BandVideoLinkRepository,
    BandOpenRoleRepository,
    BandMembershipRequestRepository,
    BandMilestoneRepository,
    BandMemberGenreRepository,
    BandMemberInterestRepository,
    BandService,
    MembershipRequestService,
  ],
})
export class BandModule {}
