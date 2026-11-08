import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { ArrayMaxSize, IsArray, IsBoolean, IsString, Length, MaxLength } from "class-validator";
import { MAX_BAND_EXPERIENCE_VIDEOS } from "@soundcircle/shared/utils/util/constant";

const trim = ({ value }: { value: unknown }): unknown => (typeof value === "string" ? value.trim() : value);

/** A band the musician is in or was in (step 8). Create and update take the same shape. */
export class BandExperienceDto {
  @Transform(trim)
  @IsString()
  @Length(1, 100, { message: "Enter the band's name (up to 100 characters)" })
  @ApiProperty({ type: String, example: "Neel Akash Collective" })
  band_name: string;

  @Transform(trim)
  @IsString()
  @Length(1, 120, { message: "Enter your role or what you played (up to 120 characters)" })
  @ApiProperty({ type: String, example: "Lead guitar, backing vocals" })
  role: string;

  @IsBoolean()
  @ApiProperty({ type: Boolean, description: "Still in this band" })
  is_current: boolean;

  @IsArray()
  @ArrayMaxSize(MAX_BAND_EXPERIENCE_VIDEOS)
  @IsString({ each: true })
  @MaxLength(512, { each: true })
  @ApiProperty({ type: [String], example: ["https://www.facebook.com/watch/?v=1234567890123"] })
  video_urls: string[];
}
