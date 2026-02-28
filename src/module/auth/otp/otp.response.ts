// Response sau khi gửi OTP thành công
export interface OtpSentResponseDto {
    success: boolean;
    message: string;
    expiryTime: Date; 
}

// Response sau khi xác thực OTP thành công
export interface OtpVerifiedResponseDto {
    success: boolean;
    message: string;
    // Token tạm thời cho phép đặt lại mật khẩu (đã xác minh OTP)
    verificationToken: string; 
}