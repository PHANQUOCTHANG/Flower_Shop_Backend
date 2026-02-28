import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

// 1. Request gửi email để nhận OTP
export class SendOtpRequestDto {
    @IsEmail({}, { message: 'Email phải là định dạng hợp lệ.' })
    @IsNotEmpty({ message: 'Email là bắt buộc.' })
    email!: string;
}

// 2. Request xác thực OTP
export class VerifyOtpRequestDto {
    @IsEmail({}, { message: 'Email phải là định dạng hợp lệ.' })
    @IsNotEmpty({ message: 'Email là bắt buộc.' })
    email!: string;

    @IsString({ message: 'OTP phải là chuỗi.' })
    @IsNotEmpty({ message: 'Mã OTP là bắt buộc.' })
    @Length(6, 6, { message: 'Mã OTP phải có đúng 6 chữ số.' })
    otp!: string;
}