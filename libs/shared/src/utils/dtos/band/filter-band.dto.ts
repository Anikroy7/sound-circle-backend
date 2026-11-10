import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength } from "class-validator";
import { BandType } from "@soundcircle/shared/database/entities/band/enums/band.enum";
import { SearchPageDto } from "@soundcircle/shared/utils/dtos/common/search-page.dto";
import { BAND_SORTS, BandSort } from "@soundcircle/shared/utils/util/enums";
import { toBoolean, toIdList, toOptionalInt } from "@soundcircle/shared/utils/util/query-param.util";
import { enumToString, enumValuesToArray } from "@soundcircle/shared/utils/util/utils";
import { IsValueIn } from "@soundcircle/shared/utils/validators/is-value-in.validator";

const trim = ({ value }: { value: unknown }): unknown => (typeof value === "string" ? value.trim() : value);

/** `GET /bands`: published bands only. Every filter narrows; an id list matches any of its ids. */
export class FilterBandDto extends SearchPageDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  @ApiPropertyOptional({ type: String, example: "monsoon", description: "Matches the band's name" })
  search?: string;

  @IsOptional()
  @Transform(toIdList)
  @IsArray()
  @ArrayMaxSize(10)
  @IsInt({ each: true })
  @ApiPropertyOptional({ type: String, example: "1,10", description: "Plays any of these genres (comma-separated ids)" })
  genre_ids?: number[];

  @IsOptional()
  @Transform(toOptionalInt)
  @IsInt()
  @ApiPropertyOptional({ type: Number, example: 3026, description: "Practises there: any level, matched both ways (§5.4)" })
  location_id?: number;

  @IsOptional()
  @Transform(toOptionalInt)
  @IsValueIn(enumValuesToArray(BandType))
  @ApiPropertyOptional({ type: Number, enum: BandType, description: enumToString(BandType) })
  band_type?: BandType;

  @IsOptional()
  @Transform(toIdList)
  @IsArray()
  @ArrayMaxSize(10)
  @IsInt({ each: true })
  @ApiPropertyOptional({ type: String, example: "5", description: "Has an open position for any of these instruments" })
  hiring_instrument_ids?: number[];

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  @ApiPropertyOptional({ type: Boolean, description: "Only bands with at least one open position" })
  hiring?: boolean;

  @IsOptional()
  @Transform(toOptionalInt)
  @IsInt()
  @ApiPropertyOptional({ type: Number, description: "Only bands this user is a member of (a musician's profile lists them)" })
  member_user_id?: number;

  @IsOptional()
  @IsIn(BAND_SORTS)
  @ApiPropertyOptional({ enum: BAND_SORTS, default: "newest" })
  sort?: BandSort;
}
