import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { IsValueIn } from "@soundcircle/shared/utils/validators/is-value-in.validator";
import { IsNumeric } from "@soundcircle/shared/utils/validators/is-number-string.validator";
import { RowStatus } from "@soundcircle/shared/utils/util/enums";

export class SortOrderDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ type: String })
  column_name: string;

  @IsOptional()
  @IsString()
  @IsValueIn(["ASC", "DESC"])
  @ApiPropertyOptional({ type: String })
  dir?: "ASC" | "DESC";
}

/**
 * Uniform pagination. Conditional by design: either `page_no` or `page_size` present
 * returns `{ items, meta }`; neither returns the full array.
 */
export class FilterCommonDto {
  @IsOptional()
  @IsNumeric()
  @ApiPropertyOptional({ type: String })
  page_no: number;

  @IsOptional()
  @IsNumeric()
  @ApiPropertyOptional({ type: String })
  page_size: number;

  @IsNumeric()
  @IsOptional()
  @ApiPropertyOptional({
    type: Number,
    enum: RowStatus,
    default: RowStatus.ACTIVE,
  })
  row_status: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SortOrderDto)
  sort_order_by: SortOrderDto[];
}
