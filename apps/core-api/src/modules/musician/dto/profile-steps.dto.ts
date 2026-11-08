import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { BandInterest, SkillLevel, Weekday } from "@soundcircle/shared/database/entities/musician/enums/musician.enum";
import { IsNumeric } from "@soundcircle/shared/utils/validators/is-number-string.validator";
import { IsValueIn } from "@soundcircle/shared/utils/validators/is-value-in.validator";
import { enumToString, enumValuesToArray } from "@soundcircle/shared/utils/util/utils";
import { E164_PATTERN, normalizePhone } from "@soundcircle/shared/utils/util/phone.util";
import {
  MAX_AVAILABILITY_SLOTS,
  MAX_BIO_LENGTH,
  MAX_GALLERY_VIDEOS,
  MAX_GENRES_PER_RELATION,
  MAX_INSTRUMENTS,
  MAX_USER_LOCATIONS,
  MIN_BIO_LENGTH,
} from "@soundcircle/shared/utils/util/constant";

const trim = ({ value }: { value: unknown }): unknown => (typeof value === "string" ? value.trim() : value);

/** `HH:MM`, 24-hour. */
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** The musician's locations, replaced whole: in step 1, or on its own from the profile page. */
export class UpdateLocationsDto {
  @IsArray()
  @ArrayMinSize(1, { message: "Add at least one location" })
  @ArrayMaxSize(MAX_USER_LOCATIONS, { message: `You can add up to ${MAX_USER_LOCATIONS} locations` })
  @ArrayUnique()
  @IsInt({ each: true })
  @ApiProperty({
    type: [Number],
    example: [30, 2015],
    description:
      "Where the musician is based or can play: ids from GET /locations, any level. Replaces the set; a division covers everything inside it",
  })
  location_ids: number[];
}

/** Step 1: the bio, and the locations. */
export class UpdateAboutDto extends UpdateLocationsDto {
  @Transform(trim)
  @IsString()
  @Length(MIN_BIO_LENGTH, MAX_BIO_LENGTH, { message: `bio must be ${MIN_BIO_LENGTH} to ${MAX_BIO_LENGTH} characters` })
  @ApiProperty({ type: String, example: "Lead guitarist from Dhanmondi. Blues and classic rock at heart; eight years of playing." })
  bio: string;
}

/** Step 2. A genre may be in both lists. */
export class UpdateGenresDto {
  @IsArray()
  @ArrayMinSize(1, { message: "Pick at least one genre you perform" })
  @ArrayMaxSize(MAX_GENRES_PER_RELATION)
  @ArrayUnique()
  @IsInt({ each: true })
  @ApiProperty({ type: [Number], example: [1, 6] })
  performs_genre_ids: number[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_GENRES_PER_RELATION)
  @ArrayUnique()
  @IsInt({ each: true })
  @ApiPropertyOptional({ type: [Number], example: [7, 11], default: [] })
  listens_genre_ids?: number[];
}

export class InstrumentSkillDto {
  @IsInt()
  @ApiProperty({ type: Number, example: 3 })
  instrument_id: number;

  @IsNumeric()
  @IsValueIn(enumValuesToArray(SkillLevel))
  @ApiProperty({ type: Number, enum: SkillLevel, description: enumToString(SkillLevel) })
  skill_level: SkillLevel;
}

/** Step 3. */
export class UpdateInstrumentsDto {
  @IsArray()
  @ArrayMinSize(1, { message: "Pick at least one instrument" })
  @ArrayMaxSize(MAX_INSTRUMENTS)
  @ArrayUnique((item: InstrumentSkillDto) => item?.instrument_id, { message: "Each instrument can only be added once" })
  @ValidateNested({ each: true })
  @Type(() => InstrumentSkillDto)
  @ApiProperty({ type: [InstrumentSkillDto] })
  instruments: InstrumentSkillDto[];
}

/** Step 4. A local Bangladeshi number (`01712-345678`) is accepted and stored as E.164. */
export class UpdateContactDto {
  @Transform(({ value }) => normalizePhone(value))
  @IsString()
  @Matches(E164_PATTERN, { message: "Enter a valid mobile number, e.g. 01712-345678" })
  @ApiProperty({ type: String, example: "01712-345678" })
  phone: string;

  @IsBoolean()
  @ApiProperty({ type: Boolean, description: "true = PUBLIC on the profile, false = ONLY_ME" })
  show_phone: boolean;
}

/** One slot. A missing `day_of_week` is any day; missing times are any time (schema-design §4.4). */
export class AvailabilitySlotDto {
  @IsOptional()
  @IsNumeric()
  @IsValueIn(enumValuesToArray(Weekday))
  @ApiPropertyOptional({ type: Number, enum: Weekday, nullable: true, description: `${enumToString(Weekday)}. Null = any day` })
  day_of_week?: Weekday | null;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: "start_time must be HH:MM" })
  @ApiPropertyOptional({ type: String, nullable: true, example: "16:00" })
  start_time?: string | null;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: "end_time must be HH:MM" })
  @ApiPropertyOptional({ type: String, nullable: true, example: "20:00", description: "Before start_time = runs past midnight" })
  end_time?: string | null;
}

/** Step 5. "Any day, any time" is the single slot `{}`. */
export class UpdateAvailabilityDto {
  @IsArray()
  @ArrayMinSize(1, { message: "Add at least one time you are available" })
  @ArrayMaxSize(MAX_AVAILABILITY_SLOTS)
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  @ApiProperty({ type: [AvailabilitySlotDto] })
  slots: AvailabilitySlotDto[];
}

/** Step 6. */
export class UpdateBandInterestDto {
  @IsNumeric()
  @IsValueIn(enumValuesToArray(BandInterest))
  @ApiProperty({ type: Number, enum: BandInterest, description: enumToString(BandInterest) })
  band_interest: BandInterest;
}

/** Step 7. Audio and photos are saved as they upload (`POST /profiles/me/media`); this carries the video links. */
export class UpdateGalleryDto {
  @IsArray()
  @ArrayMaxSize(MAX_GALLERY_VIDEOS)
  @IsString({ each: true })
  @MaxLength(512, { each: true })
  @ApiProperty({ type: [String], example: ["https://youtu.be/dQw4w9WgXcQ"] })
  video_urls: string[];
}

/** Step 8: the answer to "have you been in a band?". The bands themselves are saved one at a time. */
export class CompleteBandExperienceDto {
  @IsBoolean()
  @ApiProperty({ type: Boolean })
  has_band_experience: boolean;
}
