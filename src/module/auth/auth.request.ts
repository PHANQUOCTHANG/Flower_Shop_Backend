import { AddressRequestDto } from "@/dto/request/address.request";
import { Type } from "class-transformer";
import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsString,
  ValidateNested,
  IsOptional,
  IsEnum,
} from "class-validator";

// DTO đăng nhập
export class LoginRequestDto {
  @IsEmail({}, { message: "Email không hợp lệ" })
  @IsNotEmpty({ message: "Email không được để trống" })
  email!: string;

  @IsString({ message: "Mật khẩu không hợp lệ" })
  @MinLength(8, { message: "Mật khẩu tối thiểu 8 ký tự" })
  password!: string;
}

// DTO đăng ký
export class RegisterRequestDto {
  @IsString({ message: "Họ tên không hợp lệ" })
  @IsNotEmpty({ message: "Họ tên không được để trống" })
  fullName!: string;

  @IsEmail({}, { message: "Email không hợp lệ" })
  email!: string;

  @IsOptional()
  @IsString({ message: "Số điện thoại không hợp lệ" })
  phone?: string;

  @IsString({ message: "Mật khẩu không hợp lệ" })
  @MinLength(8, { message: "Mật khẩu tối thiểu 8 ký tự" })
  password!: string;

  @IsOptional()
  @IsEnum(["ADMIN", "STAFF", "CUSTOMER"], {
    message: "Role phải là ADMIN | STAFF | CUSTOMER",
  })
  role?: "ADMIN" | "STAFF" | "CUSTOMER";

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AddressRequestDto)
  addresses?: AddressRequestDto[];
}

// DTO refresh token
export class RefreshTokenRequestDto {
  @IsString({ message: "Refresh token không hợp lệ" })
  @IsNotEmpty({ message: "Refresh token là bắt buộc" })
  refreshToken!: string;
}

// DTO reset mật khẩu bằng OTP
export class ResetPasswordRequestDto {
  @IsEmail({}, { message: "Email không hợp lệ" })
  email!: string;

  @IsString({ message: "OTP không hợp lệ" })
  @IsNotEmpty({ message: "OTP là bắt buộc" })
  otp!: string;

  @IsString({ message: "Mật khẩu không hợp lệ" })
  @MinLength(8, { message: "Mật khẩu tối thiểu 8 ký tự" })
  newPassword!: string;
}
