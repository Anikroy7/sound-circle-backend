import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, MaxLength } from "class-validator";
import { MediaType } from "@soundcircle/shared/database/entities/media/enums/media.enum";
import { IsNumeric } from "@soundcircle/shared/utils/validators/is-number-string.validator";
import { IsValueIn } from "@soundcircle/shared/utils/validators/is-value-in.validator";
import { enumToString, enumValuesToArray } from "@soundcircle/shared/utils/util/utils";

/** Where an upload goes: the musician's gallery, or one of their band experiences (photos only). */
export class MediaTargetDto {
  @IsNumeric()
  @IsValueIn(enumValuesToArray(MediaType))
  @ApiProperty({ type: Number, enum: MediaType, description: enumToString(MediaType) })
  media_type: MediaType;

  @IsOptional()
  @IsInt()
  @ApiPropertyOptional({ type: Number, description: "Omit for the gallery (step 7); a band experience id for its photos (step 8)" })
  band_experience_id?: number;
}

/** Step 3 of the upload flow (schema-design §4.3): the id Cloudinary stored the file under. */
export class AttachMediaDto extends MediaTargetDto {
  @IsString()
  @MaxLength(255)
  @ApiProperty({ type: String, example: "soundcircle/users/7/audio/0f1e2d3c4b5a69788796a5b4" })
  public_id: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @ApiPropertyOptional({ type: String, example: "live-at-tsc.mp3", description: "Display only" })
  file_name?: string;
}

/** Saves an uploaded profile photo, from a ticket signed by `POST /profiles/me/photo/signature`. */
export class SetProfilePhotoDto {
  @IsString()
  @MaxLength(255)
  @ApiProperty({ type: String, example: "soundcircle/users/7/avatar/0f1e2d3c4b5a69788796a5b4" })
  public_id: string;
}
