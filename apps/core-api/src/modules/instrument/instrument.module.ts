import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { InstrumentEntity } from "@soundcircle/shared/database/entities/reference/instrument.entity";
import { InstrumentRepository } from "@soundcircle/shared/database/repositories/reference/instrument.repository";
import { InstrumentPublicController } from "@apps/core-api/modules/instrument/instrument.public.controller";
import { InstrumentService } from "@apps/core-api/modules/instrument/instrument.service";

@Module({
  imports: [TypeOrmModule.forFeature([InstrumentEntity])],
  controllers: [InstrumentPublicController],
  providers: [InstrumentRepository, InstrumentService],
  exports: [InstrumentRepository],
})
export class InstrumentModule {}
