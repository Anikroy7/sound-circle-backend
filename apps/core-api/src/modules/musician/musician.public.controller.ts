import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PublicBaseController } from "@soundcircle/shared/utils/controllers/public-base-controller";
import { FilterMusicianDto } from "@soundcircle/shared/utils/dtos/musician/filter-musician.dto";
import { ApiResponse } from "@soundcircle/shared/utils/util/utils";
import { MusicianProfileService } from "@apps/core-api/modules/musician/musician-profile.service";
import { MusicianCardView, PublicMusicianView, SearchPage } from "@apps/core-api/modules/musician/common/types/musician-profile.type";

/** Musician discovery and public profiles (schema-design §6). Open to visitors. */
@ApiTags("MUS")
@Controller("musicians")
export class MusicianPublicController extends PublicBaseController {
  constructor(private readonly musicianProfileService: MusicianProfileService) {
    super();
  }

  @Get()
  @ApiOperation({ summary: "Search discoverable musicians by name/instrument, instruments, genres, location and band interest" })
  async search(@Query() query: FilterMusicianDto): Promise<SearchPage<MusicianCardView>> {
    const page: SearchPage<MusicianCardView> = await this.musicianProfileService.search(query);
    return ApiResponse(page, "Fetch Successfully");
  }

  @Get(":slug")
  @ApiOperation({ summary: "A musician's public profile; the phone only when they made it public" })
  async getPublic(@Param("slug") slug: string): Promise<PublicMusicianView> {
    const profile: PublicMusicianView = await this.musicianProfileService.getPublic(slug);
    return ApiResponse(profile, "Fetch Successfully");
  }
}
