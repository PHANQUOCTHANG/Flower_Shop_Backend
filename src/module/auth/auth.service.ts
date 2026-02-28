import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import AppError from "@/utils/appError";

import { IUserRepository } from "@/module/user/user.repository";
import { IRefreshTokenRepository } from "@/module/auth/refreshToken/refreshToken.repository";
import { IOtpRepository } from "@/module/auth/otp/otp.repository";

import {
  LoginRequestDto,
  RegisterRequestDto,
} from "@/module/auth/auth.request";

export interface IAuthService {
  register(dto: RegisterRequestDto): Promise<AuthResult>;
  login(dto: LoginRequestDto): Promise<AuthResult>;
  refresh(refreshToken: string): Promise<AuthResult>;
  logout(refreshToken: string): Promise<void>;
  resetPassword(
    email: string,
    otp: string,
    newPassword: string,
  ): Promise<AuthResult>;
}

// Kết quả xác thực (dùng nội bộ backend)
interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
}

export class AuthService implements IAuthService {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly refreshRepo: IRefreshTokenRepository,
    private readonly otpRepo: IOtpRepository,
  ) {}

  // Đăng ký tài khoản
  async register(dto: RegisterRequestDto): Promise<AuthResult> {
    const existed = await this.userRepo.findByEmail(dto.email);
    if (existed) throw new AppError("Email đã tồn tại", 409);

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.userRepo.create({
      ...dto,
      passwordHash,
      status: "ACTIVE",
    });

    return this.generateAuthResult(user);
  }

  // Đăng nhập
  async login(dto: LoginRequestDto): Promise<AuthResult> {
    const user = await this.userRepo.findByEmail(dto.email);
    if (!user || !user.passwordHash) {
      throw new AppError("Sai email hoặc mật khẩu", 401);
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) throw new AppError("Sai email hoặc mật khẩu", 401);

    if (user.status !== "ACTIVE") {
      throw new AppError("Tài khoản bị khóa", 403);
    }

    return this.generateAuthResult(user);
  }

  // Làm mới access token (rotate refresh token)
  async refresh(refreshToken: string): Promise<AuthResult> {
    if (!refreshToken) {
      throw new AppError("Refresh token không tồn tại", 401);
    }

    const stored = await this.refreshRepo.findValid(refreshToken);
    if (!stored) {
      throw new AppError("Refresh token không hợp lệ hoặc đã hết hạn", 401);
    }

    const user = await this.userRepo.findById(stored.userId.toString());
    if (!user) throw new AppError("User không tồn tại", 404);

    // Thu hồi refresh token cũ
    await this.refreshRepo.revoke(refreshToken);

    return this.generateAuthResult(user);
  }

  // Đăng xuất
  async logout(refreshToken: string): Promise<void> {
    if (!refreshToken) return;
    await this.refreshRepo.revoke(refreshToken);
  }

  // Reset mật khẩu sau khi OTP hợp lệ

  async resetPassword(
    email: string,
    otp: string,
    newPassword: string,
  ): Promise<AuthResult> {
    // Kiểm tra OTP hợp lệ
    const record = await this.otpRepo.findValidByEmail(email);

    console.log(record);
    if (!record || !record.verified) {
      throw new AppError("Mã OTP không hợp lệ hoặc chưa được xác thực", 400);
    }

    // Cập nhật mật khẩu mới cho người dùng
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Sử dụng hàm updateByEmail từ UserRepository đã viết trước đó
    const user = await this.userRepo.updateByEmail(email, { passwordHash });
    if (!user) throw new AppError("Không tìm thấy người dùng", 404);

    // Bảo mật: Đăng xuất tất cả các thiết bị sau khi đổi mật khẩu
    await this.refreshRepo.revokeAllByUser(user.id);

    // Dọn dẹp OTP sau khi sử dụng thành công
    await this.otpRepo.deleteByEmail(email);

    // Cấp token mới cho user
    return this.generateAuthResult(user);
  }

  // Sinh access token + refresh token
  private async generateAuthResult(user: any): Promise<AuthResult> {
    const accessSecret = process.env.JWT_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;

    if (!accessSecret || !refreshSecret) {
      throw new AppError("JWT Secret chưa được cấu hình", 500);
    }

    const accessToken = jwt.sign(
      { sub: user.id, role: user.role },
      accessSecret,
      { expiresIn: "15m" },
    );

    const refreshToken = jwt.sign({ sub: user.id }, refreshSecret, {
      expiresIn: "7d",
    });

    // Lưu refresh token vào DB
    await this.refreshRepo.create({
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    };
  }
}
