import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString, Max, Min } from "class-validator";
import { FilterCommonDto } from "@soundcircle/shared/utils/dtos/filter-common.dto";
import { LocationLevel } from "@soundcircle/shared/database/entities/reference/enums/reference.enum";
import { IsNumeric } from "@soundcircle/shared/utils/validators/is-number-string.validator";
import { IsValueIn } from "@soundcircle/shared/utils/validators/is-value-in.validator";
import { enumToString, enumValuesToArray } from "@soundcircle/shared/utils/util/utils";
import { DEFAULT_NEAR_RADIUS_KM, MAX_NEAR_RADIUS_KM } from "@soundcircle/shared/utils/util/constant";

/** The cascading picker: `level=1` for the divisions, then `parent_id=<id>` for each next step. */
export class FilterLocationDto extends FilterCommonDto {
  @IsOptional()
  @IsNumeric()
  @ApiPropertyOptional({ type: Number, example: 30, description: "Children of this location" })
  parent_id?: number;

  @IsOptional()
  @IsNumeric()
  @IsValueIn(enumValuesToArray(LocationLevel))
  @ApiPropertyOptional({ type: Number, enum: LocationLevel, description: enumToString(LocationLevel) })
  level?: LocationLevel;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ type: String, description: "Matches name or name_bn" })
  search?: string;

  @IsOptional()
  @IsNumeric()
  @ApiPropertyOptional({
    type: Number,
    example: 30260072,
    description: "Only places whose centre is within radius_km of this location's centre, nearest first, each with distance_km",
  })
  near_location_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(MAX_NEAR_RADIUS_KM)
  @ApiPropertyOptional({ type: Number, default: DEFAULT_NEAR_RADIUS_KM, description: `With near_location_id. 1–${MAX_NEAR_RADIUS_KM}` })
  radius_km?: number;
}
