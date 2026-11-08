import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsEmail, IsOptional, IsString, Length, MaxLength } from "class-validator";

export class LoginDto {
  /** Lower-cased like `CreateUserDto`, so it matches the stored form. */
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(255)
  @ApiProperty({ type: String, example: "rahim@example.com" })
  email: string;

  @IsString()
  @Length(1, 72)
  @ApiProperty({ type: String, example: "correct-horse-battery" })
  password: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ type: Boolean, default: false, description: "Keep me logged in: the cookies outlive the browser session" })
  remember?: boolean;
}
