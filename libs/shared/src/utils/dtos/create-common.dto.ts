import { IsOptional } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { RowStatus } from "@soundcircle/shared/utils/util/enums";
import { IsNumeric } from "@soundcircle/shared/utils/validators/is-number-string.validator";
import { enumToString, enumValuesToArray } from "@soundcircle/shared/utils/util/utils";
import { IsValueIn } from "@soundcircle/shared/utils/validators/is-value-in.validator";

/** Every create DTO extends this; `UpdateXDto extends CreateXDto`. */
export class CreateCommonDto {
  @IsNumeric()
  @IsOptional()
  @IsValueIn(enumValuesToArray(RowStatus))
  @ApiPropertyOptional({
    type: Number,
    enum: RowStatus,
    default: RowStatus.ACTIVE,
    description: enumToString(RowStatus),
  })
  row_status?: number;
}
