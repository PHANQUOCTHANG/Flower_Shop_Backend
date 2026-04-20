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
  ChangePasswordRequest,
} from "./auth.request";
import { AuthResponseDto } from "./auth.response";
import {
  getCache,
  setCache,
  deleteCache,
  deleteCacheByPattern,
} from "@/utils/cache";

// Kết quả nội bộ — thêm refreshTokenExpiresAt để controller set cookie chính xác
interface AuthResult {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date; // <-- thêm mới
  user: any;
}

export interface IAuthService {
  register(dto: RegisterRequest): Promise<AuthResponseDto>;
  login(dto: LoginRequest): Promise<AuthResponseDto>;
  refresh(refreshToken: string): Promise<AuthResponseDto>;
  logout(refreshToken: string): Promise<void>;
  resetPassword(dto: ResetPasswordRequest): Promise<AuthResponseDto>;
  changePassword(userId: string, dto: ChangePasswordRequest): Promise<void>;
}

export class AuthService implements IAuthService {
  private readonly CACHE_KEY_REFRESH = "auth:refresh:";
  private readonly CACHE_KEY_BLACKLIST = "auth:blacklist:";
  private readonly CACHE_TTL_OTP = 300; // 5 phút - OTP verification

  constructor(
    private readonly userRepo: IUserRepository,
    private readonly refreshRepo: IRefreshTokenRepository,
    private readonly otpRepo: IOtpRepository,
  ) {}

  async register(dto: RegisterRequest): Promise<AuthResponseDto> {
    const existed = await this.userRepo.findByEmail(dto.email);
    if (existed) throw new AppError("Email đã tồn tại trên hệ thống", 409);

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.userRepo.create({
      ...dto,
      password: hashedPassword,
      role: dto.role || "CUSTOMER",
    });

    const result = await this.generateAuthResult(user, false);
    return AuthResponseDto.from(
      result.user,
      result.accessToken,
      result.refreshToken,
      result.refreshTokenExpiresAt, // <-- truyền xuống DTO
    );
  }

  async login(dto: LoginRequest): Promise<AuthResponseDto> {
    const user = await this.userRepo.findByEmail(dto.email);
    if (!user || !user.password || user.role !== dto.role) {
      throw new AppError("Email hoặc mật khẩu không chính xác", 401);
    }

    const isValid = await bcrypt.compare(dto.password, user.password);
    if (!isValid)
      throw new AppError("Email hoặc mật khẩu không chính xác", 401);

    if (!user.isActive)
      throw new AppError("Tài khoản đã bị khóa hoặc chưa kích hoạt", 403);

    const result = await this.generateAuthResult(user, dto.rememberMe || false);
    return AuthResponseDto.from(
      result.user,
      result.accessToken,
      result.refreshToken,
      result.refreshTokenExpiresAt,
    );
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    if (!refreshToken) throw new AppError("Không tìm thấy Refresh Token", 401);

    const cacheKey = `${this.CACHE_KEY_REFRESH}${refreshToken}`;
    let userId = await getCache<string>(cacheKey);

    if (!userId) {
      const stored = await this.refreshRepo.findValid(refreshToken);
      if (!stored) throw new AppError("Phiên làm việc hết hạn", 401);
      userId = stored.userId;
    }

    const user = await this.userRepo.findById(userId);
    if (!user) throw new AppError("Người dùng không tồn tại", 404);

    await Promise.all([
      this.refreshRepo.revoke(refreshToken),
      deleteCache(cacheKey),
    ]);

    const result = await this.generateAuthResult(user);
    return AuthResponseDto.from(
      result.user,
      result.accessToken,
      result.refreshToken,
      result.refreshTokenExpiresAt,
    );
  }

  async logout(refreshToken: string, accessToken?: string): Promise<void> {
    if (!refreshToken) throw new AppError("Không tìm thấy Refresh Token", 401);

    await Promise.all([
      this.refreshRepo.revoke(refreshToken),
      deleteCache(`${this.CACHE_KEY_REFRESH}${refreshToken}`),
    ]);

    if (accessToken) {
      const decoded: any = jwt.decode(accessToken);
      const remainingTime = decoded.exp - Math.floor(Date.now() / 1000);
      if (remainingTime > 0) {
        await setCache(
          `${this.CACHE_KEY_BLACKLIST}${accessToken}`,
          "true",
          remainingTime,
        );
      }
    }
  }

  async resetPassword(dto: ResetPasswordRequest): Promise<AuthResponseDto> {
    const record = await this.otpRepo.findValidByEmail(dto.email);
    if (!record || !record.verified) {
      throw new AppError("Mã OTP không hợp lệ hoặc chưa được xác thực", 400);
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    const user = await this.userRepo.updateByEmail(dto.email, {
      password: hashedPassword,
    });
    if (!user) throw new AppError("Người dùng không tồn tại", 404);

    await Promise.all([
      this.refreshRepo.revokeAllByUser(user.id),
      this.otpRepo.deleteByEmail(dto.email),
      deleteCache(`otp:${dto.email}`),
    ]);

    const result = await this.generateAuthResult(user, false);
    return AuthResponseDto.from(
      result.user,
      result.accessToken,
      result.refreshToken,
      result.refreshTokenExpiresAt,
    );
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordRequest,
  ): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user || !user.password) {
      throw new AppError("Người dùng không tồn tại", 404);
    }

    const isValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isValid) {
      throw new AppError("Mật khẩu hiện tại không chính xác", 401);
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepo.updateById(userId, { password: hashedPassword });

    await Promise.all([
      this.refreshRepo.revokeAllByUser(userId),
      deleteCacheByPattern(`${this.CACHE_KEY_REFRESH}*`),
    ]);
  }

  private async generateAuthResult(
    user: any,
    rememberMe: boolean = false,
  ): Promise<AuthResult> {
    const accessSecret = process.env.JWT_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!accessSecret || !refreshSecret)
      throw new AppError("Lỗi cấu hình JWT", 500);

    const userIdStr = user.id.toString();

    const accessToken = jwt.sign(
      { userId: userIdStr, role: user.role },
      accessSecret,
      { expiresIn: "15m" },
    );

    const refreshTokenTTL = rememberMe
      ? 14 * 24 * 60 * 60 * 1000 // 14 ngày (ms)
      : 24 * 60 * 60 * 1000; //  1 ngày  (ms)

    // Tính chính xác một lần, dùng lại nhất quán ở cả DB, Redis, và cookie
    const refreshTokenExpiresAt = new Date(Date.now() + refreshTokenTTL);

    const refreshToken = jwt.sign({ userId: userIdStr }, refreshSecret, {
      expiresIn: rememberMe ? "14d" : "1d",
    });

    await Promise.all([
      this.refreshRepo.createOrUpdate({
        userId: userIdStr,
        token: refreshToken,
        expiresAt: refreshTokenExpiresAt,
      }),
      setCache(
        `${this.CACHE_KEY_REFRESH}${refreshToken}`,
        userIdStr,
        Math.floor(refreshTokenTTL / 1000), // Redis nhận giây
      ),
    ]);

    return { accessToken, refreshToken, refreshTokenExpiresAt, user };
  }
}
