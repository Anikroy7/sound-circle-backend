import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsInt, IsOptional, IsString, Length, MaxLength } from "class-validator";
import { BandType } from "@soundcircle/shared/database/entities/band/enums/band.enum";
import { IsNumeric } from "@soundcircle/shared/utils/validators/is-number-string.validator";
import { IsValueIn } from "@soundcircle/shared/utils/validators/is-value-in.validator";
import { enumToString, enumValuesToArray } from "@soundcircle/shared/utils/util/utils";
import {
  MAX_BAND_BIO_LENGTH,
  MAX_BAND_GENRES,
  MAX_BAND_NAME_LENGTH,
  MAX_BAND_VIDEOS,
  MAX_MEMBER_NAME_LENGTH,
  MAX_MEMBER_POSITION_LENGTH,
  MIN_BAND_BIO_LENGTH,
  MIN_BAND_NAME_LENGTH,
} from "@soundcircle/shared/utils/util/constant";

const trim = ({ value }: { value: unknown }): unknown => (typeof value === "string" ? value.trim() : value);

/** Creation step 1: the band's information. Creates the draft, or updates it. The logo uploads on its own. */
export class SaveBandInfoDto {
  @Transform(trim)
  @IsString()
  @Length(MIN_BAND_NAME_LENGTH, MAX_BAND_NAME_LENGTH, {
    message: `The band name must be ${MIN_BAND_NAME_LENGTH} to ${MAX_BAND_NAME_LENGTH} characters`,
  })
  @ApiProperty({ type: String, example: "Neel Akash Collective" })
  name: string;

  @IsArray()
  @ArrayMinSize(1, { message: "Pick at least one genre the band performs" })
  @ArrayMaxSize(MAX_BAND_GENRES, { message: `Pick up to ${MAX_BAND_GENRES} genres` })
  @ArrayUnique()
  @IsInt({ each: true })
  @ApiProperty({ type: [Number], example: [1, 6] })
  genre_ids: number[];

  @IsInt({ message: "Choose where the band practises" })
  @ApiProperty({ type: Number, example: 2015, description: "Practice location: an id from GET /locations, any level" })
  location_id: number;

  @Transform(trim)
  @IsString()
  @Length(MIN_BAND_BIO_LENGTH, MAX_BAND_BIO_LENGTH, {
    message: `The description must be ${MIN_BAND_BIO_LENGTH} to ${MAX_BAND_BIO_LENGTH} characters`,
  })
  @ApiProperty({ type: String, example: "Folk-rock five-piece from Mirpur, writing Bangla originals and rehearsing twice a week." })
  bio: string;

  @IsNumeric()
  @IsValueIn(enumValuesToArray(BandType))
  @ApiProperty({ type: Number, enum: BandType, description: enumToString(BandType) })
  band_type: BandType;
}

/**
 * Creation step 2 (and Invite Members): one member. Either a SoundCircle user (`user_id`) or someone
 * outside it (`name`, `position`, optionally a photo from `POST /bands/:id/member-photo/signature`).
 */
export class AddBandMemberDto {
  @IsOptional()
  @IsInt()
  @ApiPropertyOptional({ type: Number, description: "A SoundCircle user, from GET /bands/:id/member-candidates" })
  user_id?: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, MAX_MEMBER_NAME_LENGTH)
  @ApiPropertyOptional({ type: String, example: "Rafiq Hossain", description: "A member outside SoundCircle" })
  name?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(MAX_MEMBER_POSITION_LENGTH)
  @ApiPropertyOptional({ type: String, example: "Drums", description: "Their role or instrument. Required for a member outside SoundCircle" })
  position?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @ApiPropertyOptional({ type: String, example: "soundcircle/bands/3/members/0f1e2d3c4b5a69788796a5b4" })
  photo_public_id?: string;
}

/** A logo upload to save. */
export class BandImageDto {
  @IsString()
  @MaxLength(255)
  @ApiProperty({ type: String, example: "soundcircle/bands/3/logo/0f1e2d3c4b5a69788796a5b4" })
  public_id: string;
}

/** Creation step 3: one uploaded performance photo to save. */
export class AttachBandPhotoDto extends BandImageDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @ApiPropertyOptional({ type: String, example: "live-at-tsc.jpg", description: "Display only" })
  file_name?: string;
}

/** Creation step 3: the performance video links (replaces them). */
export class UpdateBandVideosDto {
  @IsArray()
  @ArrayMaxSize(MAX_BAND_VIDEOS, { message: `You can add up to ${MAX_BAND_VIDEOS} video links` })
  @IsString({ each: true })
  @MaxLength(512, { each: true })
  @ApiProperty({ type: [String], example: ["https://youtu.be/dQw4w9WgXcQ"] })
  video_urls: string[];
}

export class MemberSearchDto {
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  @ApiProperty({ type: String, example: "rafiq" })
  q: string;
}
