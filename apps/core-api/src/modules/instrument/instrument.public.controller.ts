import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PublicBaseController } from "@soundcircle/shared/utils/controllers/public-base-controller";
import { InstrumentEntity } from "@soundcircle/shared/database/entities/reference/instrument.entity";
import { ApiResponse } from "@soundcircle/shared/utils/util/utils";
import { InstrumentService } from "@apps/core-api/modules/instrument/instrument.service";

/** Public reference data (schema-design §4.2): seeded, small, never paginated. */
@ApiTags("REF")
@Controller("instruments")
export class InstrumentPublicController extends PublicBaseController {
  constructor(private readonly instrumentService: InstrumentService) {
    super();
  }

  @Get()
  @ApiOperation({ summary: "Every instrument in picker order, as { id, name }" })
  async getAll(): Promise<InstrumentEntity[]> {
    const instruments: InstrumentEntity[] = await this.instrumentService.getAll();
    return ApiResponse(instruments, "Fetch Successfully");
  }
}
