import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength } from "class-validator";
import { SearchPageDto } from "@soundcircle/shared/utils/dtos/common/search-page.dto";
import { MUSICIAN_SORTS, MusicianSort } from "@soundcircle/shared/utils/util/enums";
import { toBoolean, toIdList, toOptionalInt } from "@soundcircle/shared/utils/util/query-param.util";

const trim = ({ value }: { value: unknown }): unknown => (typeof value === "string" ? value.trim() : value);

/** `GET /musicians` (schema-design §6). Every filter narrows; an id list matches any of its ids. */
export class FilterMusicianDto extends SearchPageDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  @ApiPropertyOptional({ type: String, example: "drums", description: "Matches the musician's name or an instrument they play" })
  search?: string;

  @IsOptional()
  @Transform(toIdList)
  @IsArray()
  @ArrayMaxSize(10)
  @IsInt({ each: true })
  @ApiPropertyOptional({ type: String, example: "5,4", description: "Plays any of these instruments (comma-separated ids)" })
  instrument_ids?: number[];

  @IsOptional()
  @Transform(toIdList)
  @IsArray()
  @ArrayMaxSize(10)
  @IsInt({ each: true })
  @ApiPropertyOptional({ type: String, example: "1,3", description: "Performs any of these genres (comma-separated ids)" })
  genre_ids?: number[];

  @IsOptional()
  @Transform(toOptionalInt)
  @IsInt()
  @ApiPropertyOptional({ type: Number, example: 3026, description: "Available there: any level, matched both ways (§5.4)" })
  location_id?: number;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  @ApiPropertyOptional({ type: Boolean, description: "Only musicians who want to join a band" })
  looking_for_band?: boolean;

  @IsOptional()
  @IsIn(MUSICIAN_SORTS)
  @ApiPropertyOptional({ enum: MUSICIAN_SORTS, default: "completion" })
  sort?: MusicianSort;
}
