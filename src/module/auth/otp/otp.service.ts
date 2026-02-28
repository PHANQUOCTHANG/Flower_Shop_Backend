import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import AppError from "@/utils/appError";
import { IOtpRepository } from "@/module/auth/otp/otp.repository";
import { IUserRepository } from "@/module/user/user.repository";
import { emailService } from "@/config/container";

export interface IOtpService {
  send(email: string): Promise<void>;
  verify(email: string, otp: string): Promise<string>;
}

export class OtpService implements IOtpService {
  constructor(
    private readonly otpRepo: IOtpRepository,
    private readonly userRepo: IUserRepository,
  ) {}

  // Tạo, lưu trữ mã OTP và gửi qua email
  async send(email: string): Promise<void> {
    // 1. Kiểm tra email người dùng
    const user = await this.userRepo.findByEmail(email);
    if (!user) throw new AppError("Email không tồn tại trên hệ thống.", 404);

    // 2. Tạo mã 6 số ngẫu nhiên và mã hóa
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);

    // 3. Dọn dẹp các mã cũ của email này để tránh xung đột
    await this.otpRepo.deleteByEmail(email);

    // 4. Lưu mã mới vào database với thời hạn 5 phút
    await this.otpRepo.create({
      email,
      otpHash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      verified: false,
    });

    // 5. Gửi email (Nếu lỗi thì xóa bản ghi OTP vừa tạo để rollback)
    try {
      await emailService.sendOtp(email, otp);
    } catch (error) {
      await this.otpRepo.deleteByEmail(email);
      throw error;
    }
  }

  // So khớp mã OTP người dùng nhập vào và trả về reset token
  async verify(email: string, otp: string): Promise<string> {
    // 1. Tìm bản ghi OTP hợp lệ (chưa hết hạn)
    const record = await this.otpRepo.findValidByEmail(email);
    if (!record)
      throw new AppError("Mã OTP đã hết hạn hoặc không tồn tại.", 400);

    // 2. Kiểm tra xem mã đã được dùng chưa
    if (record.verified) throw new AppError("Mã OTP này đã được sử dụng.", 400);

    // 3. So sánh mã hash
    const isValid = await bcrypt.compare(otp, record.otpHash);
    if (!isValid) throw new AppError("Mã OTP không chính xác.", 400);

    // 4. Đánh dấu mã đã sử dụng thành công
    await this.otpRepo.markVerified(record.id);

    // 5. Kiểm tra email tồn tại
    const user = await this.userRepo.findByEmail(email);
    if (!user) throw new AppError("Người dùng không tồn tại", 404);

    // 6. Tạo reset password token
    const resetSecret = process.env.JWT_RESET_SECRET;
    if (!resetSecret) {
      throw new AppError("Lỗi cấu hình hệ thống: JWT Secret", 500);
    }

    const resetToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        scope: "reset_password",
      },
      resetSecret,
      { expiresIn: "15m" },
    );

    return resetToken;
  }
}
