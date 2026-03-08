import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import AppError from "@/utils/appError";
import { IUserRepository } from "@/module/user/user.repository";
import { IRefreshTokenRepository } from "@/module/auth/refreshToken/refreshToken.repository";
import { IOtpRepository } from "@/module/auth/otp/otp.repository";
import {
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from "./auth.request";
import { AuthResponseDto } from "./auth.response";

// Định nghĩa kết quả trả về nội bộ cho Service
interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: any;
}

export interface IAuthService {
  register(dto: RegisterRequest): Promise<AuthResponseDto>;
  login(dto: LoginRequest): Promise<AuthResponseDto>;
  refresh(refreshToken: string): Promise<AuthResponseDto>;
  logout(refreshToken: string): Promise<void>;
  resetPassword(dto: ResetPasswordRequest): Promise<AuthResponseDto>;
}

export class AuthService implements IAuthService {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly refreshRepo: IRefreshTokenRepository,
    private readonly otpRepo: IOtpRepository,
  ) {}

  // Đăng ký tài khoản và cấp token ngay lập tức
  async register(dto: RegisterRequest): Promise<AuthResponseDto> {
    // 1. Kiểm tra email đã tồn tại chưa
    const existed = await this.userRepo.findByEmail(dto.email);
    if (existed) throw new AppError("Email đã tồn tại trên hệ thống", 409);

    // 2. Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // 3. Tạo user mới trong DB
    const user = await this.userRepo.create({
      ...dto,
      password: hashedPassword,
      role: dto.role || "CUSTOMER",
    });

    const result = await this.generateAuthResult(user);
    return AuthResponseDto.from(
      result.user,
      result.accessToken,
      result.refreshToken,
    );
  }

  // Đăng nhập bằng Email/Password
  async login(dto: LoginRequest): Promise<AuthResponseDto> {
    // 1. Tìm user (Prisma mặc định lấy cả password nếu không bị loại trừ trong select)
    const user = await this.userRepo.findByEmail(dto.email);
    if (!user || !user.password) {
      throw new AppError("Email hoặc mật khẩu không chính xác", 401);
    }

    // 2. So sánh mật khẩu
    const isValid = await bcrypt.compare(dto.password, user.password);
    if (!isValid)
      throw new AppError("Email hoặc mật khẩu không chính xác", 401);

    // 3. Kiểm tra trạng thái hoạt động (isActive thay vì status)
    if (!user.isActive)
      throw new AppError("Tài khoản đã bị khóa hoặc chưa kích hoạt", 403);

    const result = await this.generateAuthResult(user);
    return AuthResponseDto.from(
      result.user,
      result.accessToken,
      result.refreshToken,
    );
  }

  // Làm mới Access Token (Token Rotation)
  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    if (!refreshToken) throw new AppError("Không tìm thấy Refresh Token", 401);

    // 1. Xác thực token trong database
    const stored = await this.refreshRepo.findValid(refreshToken);
    if (!stored)
      throw new AppError("Phiên làm việc hết hạn, vui lòng đăng nhập lại", 401);

    // 2. Lấy thông tin user
    const user = await this.userRepo.findById(stored.userId);
    if (!user) throw new AppError("Người dùng không tồn tại", 404);

    // 3. Thu hồi token cũ để cấp bộ mới (Rotation)
    await this.refreshRepo.revoke(refreshToken);

    const result = await this.generateAuthResult(user);
    return AuthResponseDto.from(
      result.user,
      result.accessToken,
      result.refreshToken,
    );
  }

  // Đăng xuất và vô hiệu hóa token
  async logout(refreshToken: string): Promise<void> {
    console.log("logout", refreshToken);
    if (!refreshToken) throw new AppError("Không tìm thấy Refresh Token", 401);
    await this.refreshRepo.revoke(refreshToken);
  }

  // Đổi mật khẩu sau khi đã verify OTP thành công
  async resetPassword(dto: ResetPasswordRequest): Promise<AuthResponseDto> {
    console.log("resetPassword", dto);
    // 1. Kiểm tra trạng thái verify của OTP
    const record = await this.otpRepo.findValidByEmail(dto.email);
    console.log("record", record);
    if (!record || !record.verified) {
      throw new AppError("Mã OTP không hợp lệ hoặc chưa được xác thực", 400);
    }

    // 2. Mã hóa mật khẩu mới và cập nhật
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    const user = await this.userRepo.updateByEmail(dto.email, {
      password: hashedPassword,
    });
    if (!user) throw new AppError("Người dùng không tồn tại", 404);

    // 3. Bảo mật: Thu hồi toàn bộ token cũ và xóa OTP đã dùng
    await Promise.all([
      this.refreshRepo.revokeAllByUser(user.id),
      this.otpRepo.deleteByEmail(dto.email),
    ]);

    const result = await this.generateAuthResult(user);
    return AuthResponseDto.from(
      result.user,
      result.accessToken,
      result.refreshToken,
    );
  }

  // Hàm private để tạo JWT và lưu Refresh Token vào DB
  private async generateAuthResult(user: any): Promise<AuthResult> {
    const accessSecret = process.env.JWT_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;

    if (!accessSecret || !refreshSecret) {
      throw new AppError("Lỗi cấu hình JWT Secret", 500);
    }

    // Ép kiểu ID BigInt sang String để đưa vào JWT
    const userIdStr = user.id.toString();

    // Access Token (15 phút)
    const accessToken = jwt.sign(
      { sub: userIdStr, role: user.role },
      accessSecret,
      { expiresIn: "15m" },
    );

    // Refresh Token (7 ngày)
    const refreshToken = jwt.sign({ sub: userIdStr }, refreshSecret, {
      expiresIn: "7d",
    });

    // Lưu vào DB (Sử dụng createOrUpdate để tối ưu bản ghi)
    await this.refreshRepo.createOrUpdate({
      userId: userIdStr,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return { accessToken, refreshToken, user };
  }
}
