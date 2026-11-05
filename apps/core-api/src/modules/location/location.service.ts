import { Injectable } from "@nestjs/common";
import { Pagination } from "nestjs-typeorm-paginate";
import { LocationEntity } from "@soundcircle/shared/database/entities/reference/location.entity";
import { LocationRepository } from "@soundcircle/shared/database/repositories/reference/location.repository";
import { FilterLocationDto } from "@soundcircle/shared/utils/dtos/reference/filter-location.dto";

@Injectable()
export class LocationService {
  constructor(private readonly locationRepository: LocationRepository) {}

  async getAll(filters?: FilterLocationDto): Promise<Pagination<LocationEntity> | LocationEntity[]> {
    return this.locationRepository.getAll(filters);
  }
}
