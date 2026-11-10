import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import { DEFAULT_PAGE_NO, DEFAULT_SEARCH_PAGE_SIZE, MAX_SEARCH_PAGE_SIZE } from "@soundcircle/shared/utils/util/constant";
import { toOptionalInt } from "@soundcircle/shared/utils/util/query-param.util";

/**
 * Paging for the discovery searches. Unlike `FilterCommonDto` these are always paginated: a directory
 * of every musician in one response is never what a caller wants.
 */
export class SearchPageDto {
  @IsOptional()
  @Transform(toOptionalInt)
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({ type: Number, default: DEFAULT_PAGE_NO })
  page_no?: number;

  @IsOptional()
  @Transform(toOptionalInt)
  @IsInt()
  @Min(1)
  @Max(MAX_SEARCH_PAGE_SIZE)
  @ApiPropertyOptional({ type: Number, default: DEFAULT_SEARCH_PAGE_SIZE })
  page_size?: number;
}
