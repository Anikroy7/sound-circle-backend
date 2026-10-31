import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { FilterCommonDto } from "@soundcircle/shared/utils/dtos/filter-common.dto";

export class FilterUserDto extends FilterCommonDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ type: String, description: "Matches name" })
  search?: string;
}
