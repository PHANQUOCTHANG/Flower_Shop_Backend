import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import AppError from "@/utils/appError";
import { IOtpRepository } from "@/module/auth/otp/otp.repository";
import { IUserRepository } from "@/module/user/user.repository";
import { emailService } from "@/config/container";
import { OtpSentResponseDto, OtpVerifiedResponseDto } from "./otp.response";

export interface IOtpService {
  send(email: string): Promise<OtpSentResponseDto>;
  verify(email: string, otp: string): Promise<OtpVerifiedResponseDto>;
}

export class OtpService implements IOtpService {
  constructor(
    private readonly otpRepo: IOtpRepository,
    private readonly userRepo: IUserRepository,
  ) {}

  // Tạo, lưu trữ OTP và gửi qua email cho người dùng
  async send(email: string): Promise<OtpSentResponseDto> {
    // 1. Kiểm tra tài khoản có tồn tại để tránh gửi mail rác
    const user = await this.userRepo.findByEmail(email);
    if (!user) throw new AppError("Email không tồn tại trên hệ thống.", 404);

    // 2. Tạo mã 6 số ngẫu nhiên và băm mật mã để lưu trữ bảo mật
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // Hiệu lực trong 5 phút

    // 3. Dọn dẹp tất cả các mã cũ của email này trước khi tạo mới
    await this.otpRepo.deleteByEmail(email);

    // 4. Ghi nhận mã OTP mới vào cơ sở dữ liệu
    await this.otpRepo.create({
      email,
      otpHash,
      expiresAt,
    });

    // 5. Gửi email thực tế (Hủy OTP trong DB nếu nhà cung cấp email lỗi)
    try {
      await emailService.sendOtp(email, otp);
      return new OtpSentResponseDto(expiresAt);
    } catch (error) {
      await this.otpRepo.deleteByEmail(email);
      throw new AppError("Không thể gửi email OTP, vui lòng thử lại sau.", 500);
    }
  }

  // Xác thực mã OTP và cấp mã Token tạm thời để đặt lại mật khẩu
  async verify(email: string, otp: string): Promise<OtpVerifiedResponseDto> {
    // 1. Truy vấn mã OTP mới nhất và còn hạn sử dụng
    const record = await this.otpRepo.findValidByEmail(email);
    if (!record) {
      throw new AppError("Mã OTP đã hết hạn hoặc không tồn tại.", 400);
    }

    // 2. Kiểm tra tính chính xác của mã OTP người dùng nhập vào
    const isValid = await bcrypt.compare(otp, record.otpHash);
    if (!isValid) throw new AppError("Mã OTP không chính xác.", 400);

    // 3. Đánh dấu mã đã xác thực để không thể tái sử dụng
    await this.otpRepo.markVerified(record.id);

    // 4. Lấy thông tin user hiện tại để đưa vào Token
    const user = await this.userRepo.findByEmail(email);
    if (!user) throw new AppError("Người dùng không còn tồn tại.", 404);

    // 5. Tạo Reset Token (JWT) có thời hạn ngắn để thực hiện bước đổi pass
    const resetSecret = process.env.JWT_RESET_SECRET;
    if (!resetSecret) throw new AppError("Lỗi cấu hình bảo mật hệ thống.", 500);

    const resetToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        scope: "reset_password",
      },
      resetSecret,
      { expiresIn: "15m" },
    );

    return new OtpVerifiedResponseDto(resetToken);
  }
}
