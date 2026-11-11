import { Injectable } from "@nestjs/common";
import { Pagination } from "nestjs-typeorm-paginate";
import { LocationEntity } from "@soundcircle/shared/database/entities/reference/location.entity";
import { LocationRepository } from "@soundcircle/shared/database/repositories/reference/location.repository";
import { FilterLocationDto } from "@soundcircle/shared/utils/dtos/reference/filter-location.dto";
import { labelLocations } from "@apps/core-api/modules/location/location-label";

@Injectable()
export class LocationService {
  constructor(private readonly locationRepository: LocationRepository) {}

  /**
   * The picker's lists. A `search` also labels each row with the places above it ("Mirpur Model, Dhaka
   * North City Corporation, Dhaka"), because a name alone is ambiguous: there is a Mirpur in Kushtia too.
   */
  async getAll(filters?: FilterLocationDto): Promise<Pagination<LocationEntity> | LocationEntity[]> {
    const result = await this.locationRepository.getAll(filters);
    if (!filters?.search) return result;

    const rows = Array.isArray(result) ? result : result.items;
    const labels = new Map(
      (
        await labelLocations(
          this.locationRepository,
          rows.map((row) => row.id),
        )
      ).map((location) => [location.id, location.label]),
    );
    for (const row of rows) Object.assign(row, { label: labels.get(row.id) ?? row.name });
    return result;
  }
}
