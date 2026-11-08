import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PublicBaseController } from "@soundcircle/shared/utils/controllers/public-base-controller";
import { GenreEntity } from "@soundcircle/shared/database/entities/reference/genre.entity";
import { ApiResponse } from "@soundcircle/shared/utils/util/utils";
import { GenreService } from "@apps/core-api/modules/genre/genre.service";

/** Public reference data (schema-design §4.2): seeded, small, never paginated. */
@ApiTags("REF")
@Controller("genres")
export class GenrePublicController extends PublicBaseController {
  constructor(private readonly genreService: GenreService) {
    super();
  }

  @Get()
  @ApiOperation({ summary: "Every genre in picker order, as { id, name }" })
  async getAll(): Promise<GenreEntity[]> {
    const genres: GenreEntity[] = await this.genreService.getAll();
    return ApiResponse(genres, "Fetch Successfully");
  }
}
