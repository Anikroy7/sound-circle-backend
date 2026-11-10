import { Controller, Get, Param, ParseIntPipe, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PublicBaseController } from "@soundcircle/shared/utils/controllers/public-base-controller";
import { FilterBandDto } from "@soundcircle/shared/utils/dtos/band/filter-band.dto";
import { ApiResponse } from "@soundcircle/shared/utils/util/utils";
import { BandService } from "@apps/core-api/modules/band/band.service";
import { BandCardView, BandView, MembershipCardView } from "@apps/core-api/modules/band/common/types/band.type";
import { SearchPage } from "@apps/core-api/modules/musician/common/types/musician-profile.type";

/** Public: the band directory and a published band's page. Drafts are never found here. */
@ApiTags("BAND")
@Controller("bands")
export class BandPublicController extends PublicBaseController {
  constructor(private readonly bandService: BandService) {
    super();
  }

  @Get()
  @ApiOperation({ summary: "Search published bands by name, genres, location, type and open positions" })
  async search(@Query() query: FilterBandDto): Promise<SearchPage<BandCardView>> {
    const page: SearchPage<BandCardView> = await this.bandService.search(query);
    return ApiResponse(page, "Fetch Successfully");
  }

  @Get(":slug")
  @ApiOperation({ summary: "A published band by its slug, with where the signed-in viewer stands (`viewer`)" })
  async getPublished(@Param("slug") slug: string): Promise<BandView> {
    const band: BandView = await this.bandService.getPublished(slug);
    return ApiResponse(band, "Fetch Successfully");
  }

  @Get(":slug/members/:memberId/card")
  @ApiOperation({ summary: "A member's digital membership card (published bands); shareable" })
  async getCard(@Param("slug") slug: string, @Param("memberId", ParseIntPipe) memberId: number): Promise<MembershipCardView> {
    const card: MembershipCardView = await this.bandService.getCard(slug, memberId);
    return ApiResponse(card, "Fetch Successfully");
  }
}
