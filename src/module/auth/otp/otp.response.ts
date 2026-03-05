// 1. Response sau khi gửi OTP thành công
export class OtpSentResponseDto {
  success: boolean;
  message: string;
  expiryTime: string; // Chuyển Date thành string ISO để Frontend dễ xử lý

  constructor(expiryTime: Date, message: string = "Mã OTP đã được gửi đến email của bạn.") {
    this.success = true;
    this.message = message;
    this.expiryTime = expiryTime.toISOString();
  }
}

// 2. Response sau khi xác thực OTP thành công
export class OtpVerifiedResponseDto {
  success: boolean;
  message: string;
  // Token tạm thời dùng cho bước Reset Password tiếp theo
  verificationToken: string;

  constructor(token: string, message: string = "Xác thực OTP thành công.") {
    this.success = true;
    this.message = message;
    this.verificationToken = token;
  }
}