import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEmail, IsOptional, IsString, Length, Matches, MaxLength, ValidateIf } from "class-validator";
import { CreateCommonDto } from "@soundcircle/shared/utils/dtos/create-common.dto";
import { UserEntity } from "@soundcircle/shared/database/entities/identity/user.entity";
import { ContactVisibility } from "@soundcircle/shared/database/entities/identity/enums/identity.enum";
import { IsNumeric } from "@soundcircle/shared/utils/validators/is-number-string.validator";
import { IsUnique } from "@soundcircle/shared/utils/validators/is-unique.validator";
import { IsValueIn } from "@soundcircle/shared/utils/validators/is-value-in.validator";
import { enumToString, enumValuesToArray } from "@soundcircle/shared/utils/util/utils";

/** At least one of `email` / `phone` — mirrors `users_ck_email_or_phone` (schema-design §4.1). */
export class CreateUserDto extends CreateCommonDto {
  @IsString()
  @Length(1, 100)
  @ApiProperty({ type: String, example: "Rahim Uddin" })
  name: string;

  @ValidateIf((dto) => !dto.phone || !!dto.email)
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(255)
  @IsUnique(UserEntity)
  @ApiPropertyOptional({ type: String, example: "rahim@example.com", description: "Required when phone is absent" })
  email?: string;

  @ValidateIf((dto) => !dto.email || !!dto.phone)
  @Matches(/^\+[1-9]\d{7,14}$/, { message: "phone must be in E.164 format, e.g. +8801712345678" })
  @IsUnique(UserEntity)
  @ApiPropertyOptional({ type: String, example: "+8801712345678", description: "E.164. Required when email is absent" })
  phone?: string;

  @ValidateIf((dto) => !!dto.email || !!dto.password)
  @IsString()
  @Length(8, 72)
  @ApiPropertyOptional({ type: String, example: "correct-horse-battery", description: "Required with email" })
  password?: string;

  @IsOptional()
  @IsNumeric()
  @IsValueIn(enumValuesToArray(ContactVisibility))
  @ApiPropertyOptional({ type: Number, enum: ContactVisibility, default: ContactVisibility.ONLY_ME, description: enumToString(ContactVisibility) })
  email_visibility?: ContactVisibility;

  @IsOptional()
  @IsNumeric()
  @IsValueIn(enumValuesToArray(ContactVisibility))
  @ApiPropertyOptional({ type: Number, enum: ContactVisibility, default: ContactVisibility.ONLY_ME, description: enumToString(ContactVisibility) })
  phone_visibility?: ContactVisibility;
}
