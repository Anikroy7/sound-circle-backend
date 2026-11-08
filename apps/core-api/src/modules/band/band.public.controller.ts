import { Controller, Get, Param } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PublicBaseController } from "@soundcircle/shared/utils/controllers/public-base-controller";
import { ApiResponse } from "@soundcircle/shared/utils/util/utils";
import { BandService } from "@apps/core-api/modules/band/band.service";
import { BandView } from "@apps/core-api/modules/band/common/types/band.type";

/** Public: a published band's page. Drafts are never found here. */
@ApiTags("BAND")
@Controller("bands")
export class BandPublicController extends PublicBaseController {
  constructor(private readonly bandService: BandService) {
    super();
  }

  @Get(":slug")
  @ApiOperation({ summary: "A published band by its slug; is_owner says whether the signed-in viewer owns it" })
  async getPublished(@Param("slug") slug: string): Promise<BandView> {
    const band: BandView = await this.bandService.getPublished(slug);
    return ApiResponse(band, "Fetch Successfully");
  }
}
