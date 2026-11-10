import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsInt, IsOptional, IsString, MaxLength } from "class-validator";
import { MAX_REQUEST_MESSAGE_LENGTH } from "@soundcircle/shared/utils/util/constant";

const trim = ({ value }: { value: unknown }): unknown => (typeof value === "string" ? value.trim() : value);

/** A band owner invites a musician. */
export class CreateInvitationDto {
  @IsInt()
  @ApiProperty({ type: Number, example: 3, description: "One of my published bands" })
  band_id: number;

  @IsInt()
  @ApiProperty({ type: Number, example: 12, description: "The musician's user id" })
  user_id: number;

  @IsOptional()
  @IsInt()
  @ApiPropertyOptional({ type: Number, example: 5, description: "What they would play. Matching an open position fills it on accept" })
  instrument_id?: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(MAX_REQUEST_MESSAGE_LENGTH)
  @ApiPropertyOptional({ type: String, example: "We rehearse Fridays in Mirpur — would love to jam." })
  message?: string;
}

/** A musician asks to fill one of a band's open positions. */
export class CreateJoinRequestDto {
  @IsInt()
  @ApiProperty({ type: Number, example: 3 })
  band_id: number;

  @IsInt({ message: "Choose the position you want to fill" })
  @ApiProperty({ type: Number, example: 7, description: "One of the band's open roles, for an instrument on my profile" })
  open_role_id: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(MAX_REQUEST_MESSAGE_LENGTH)
  @ApiPropertyOptional({ type: String, example: "Drummer for 6 years, free most evenings." })
  message?: string;
}
