import { Injectable } from "@nestjs/common";
import { InstrumentEntity } from "@soundcircle/shared/database/entities/reference/instrument.entity";
import { InstrumentRepository } from "@soundcircle/shared/database/repositories/reference/instrument.repository";

@Injectable()
export class InstrumentService {
  constructor(private readonly instrumentRepository: InstrumentRepository) {}

  async getAll(): Promise<InstrumentEntity[]> {
    return this.instrumentRepository.getAll();
  }
}
