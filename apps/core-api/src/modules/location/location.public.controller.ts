import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Pagination } from "nestjs-typeorm-paginate";
import { PublicBaseController } from "@soundcircle/shared/utils/controllers/public-base-controller";
import { LocationEntity } from "@soundcircle/shared/database/entities/reference/location.entity";
import { FilterLocationDto } from "@soundcircle/shared/utils/dtos/reference/filter-location.dto";
import { ApiResponse } from "@soundcircle/shared/utils/util/utils";
import { LocationService } from "@apps/core-api/modules/location/location.service";

/** Public: the signup form needs the picker before an account exists. */
@ApiTags("REF")
@Controller("locations")
export class LocationPublicController extends PublicBaseController {
  constructor(private readonly locationService: LocationService) {
    super();
  }

  @Get()
  @ApiOperation({ summary: "Location picker: level=1 lists the divisions, then parent_id=<id> lists each next step" })
  async getAll(@Query() filters: FilterLocationDto): Promise<Pagination<LocationEntity> | LocationEntity[]> {
    const locations: Pagination<LocationEntity> | LocationEntity[] = await this.locationService.getAll(filters);
    return ApiResponse(locations, "Fetch Successfully");
  }
}
