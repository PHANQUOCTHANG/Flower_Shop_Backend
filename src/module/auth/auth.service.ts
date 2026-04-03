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
import { getCache, setCache, deleteCache } from "@/utils/cache";

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
  changePassword(userId: string, dto: ChangePasswordRequest): Promise<void>;
}

export class AuthService implements IAuthService {
  private readonly CACHE_KEY_REFRESH = "auth:refresh:";
  private readonly CACHE_KEY_BLACKLIST = "auth:blacklist:";
  private readonly CACHE_TTL_REFRESH = 7 * 24 * 60 * 60; // 7 ngày - Refresh token (match JWT expiry)
  private readonly CACHE_TTL_OTP = 300; // 5 phút - OTP verification (bảo mật, code tạm)

  constructor(
    private readonly userRepo: IUserRepository,
    private readonly refreshRepo: IRefreshTokenRepository,
    private readonly otpRepo: IOtpRepository,
  ) {}

  // Đăng ký tài khoản và cấp token ngay lập tức
  async register(dto: RegisterRequest): Promise<AuthResponseDto> {
    const existed = await this.userRepo.findByEmail(dto.email);
    if (existed) throw new AppError("Email đã tồn tại trên hệ thống", 409);

    const hashedPassword = await bcrypt.hash(dto.password, 10);

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
    const user = await this.userRepo.findByEmail(dto.email);
    if (!user || !user.password || user.role !== dto.role) {
      throw new AppError("Email hoặc mật khẩu không chính xác", 401);
    }

    const isValid = await bcrypt.compare(dto.password, user.password);
    if (!isValid)
      throw new AppError("Email hoặc mật khẩu không chính xác", 401);

    if (!user.isActive)
      throw new AppError("Tài khoản đã bị khóa hoặc chưa kích hoạt", 403);

    const result = await this.generateAuthResult(user);
    return AuthResponseDto.from(
      result.user,
      result.accessToken,
      result.refreshToken,
    );
  }

  // Làm mới Access Token (Token Rotation + Redis Cache)
  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    console.log("RefreshToken: ", refreshToken);
    if (!refreshToken) throw new AppError("Không tìm thấy Refresh Token", 401);

    // 1. Kiểm tra Redis trước - Cache refresh token (7 ngày)
    const cacheKey = `${this.CACHE_KEY_REFRESH}${refreshToken}`;
    let userId = await getCache<string>(cacheKey);

    // 2. Nếu không có cache, kiểm tra database (fallback)
    if (!userId) {
      const stored = await this.refreshRepo.findValid(refreshToken);
      console.log(stored);
      if (!stored) {
        console.log("OOKKKK");
        throw new AppError("Phiên làm việc hết hạn", 401);
      }
      userId = stored.userId;
    }

    const user = await this.userRepo.findById(userId);
    if (!user) throw new AppError("Người dùng không tồn tại", 404);

    // 3. Thu hồi token cũ (Xóa cả DB và Redis)
    await Promise.all([
      this.refreshRepo.revoke(refreshToken),
      deleteCache(cacheKey),
    ]);

    const result = await this.generateAuthResult(user);
    return AuthResponseDto.from(
      result.user,
      result.accessToken,
      result.refreshToken,
    );
  }

  // Đăng xuất và vô hiệu hóa token
  async logout(refreshToken: string, accessToken?: string): Promise<void> {
    if (!refreshToken) throw new AppError("Không tìm thấy Refresh Token", 401);

    // 1. Thu hồi Refresh Token (xóa DB + Redis cache)
    await Promise.all([
      this.refreshRepo.revoke(refreshToken),
      deleteCache(`${this.CACHE_KEY_REFRESH}${refreshToken}`),
    ]);

    // 2. [Bảo mật] Đưa Access Token vào Blacklist
    // Ngăn token này sử dụng cho đến khi hết hạn
    // TTL = thời gian còn lại của token
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

  // Đổi mật khẩu sau khi đã verify OTP thành công
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

    // 3. Bảo mật: Thu hồi tất cả phiên đăng nhập cũ
    await Promise.all([
      this.refreshRepo.revokeAllByUser(user.id), // Xóa DB
      this.otpRepo.deleteByEmail(dto.email), // Xóa DB
      deleteCache(`otp:${dto.email}`), // Xóa OTP cache (5 phút)
    ]);

    const result = await this.generateAuthResult(user);
    return AuthResponseDto.from(
      result.user,
      result.accessToken,
      result.refreshToken,
    );
  }

  // Thay đổi mật khẩu khi người dùng đã đăng nhập
  async changePassword(
    userId: string,
    dto: ChangePasswordRequest,
  ): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user || !user.password) {
      throw new AppError("Người dùng không tồn tại", 404);
    }

    // 1. Xác minh mật khẩu hiện tại
    const isValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isValid) {
      throw new AppError("Mật khẩu hiện tại không chính xác", 401);
    }

    // 2. Hash mật khẩu mới
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    // 3. Cập nhật mật khẩu
    await this.userRepo.updateById(userId, {
      password: hashedPassword,
    });

    // 4. Bảo mật: Thu hồi tất cả phiên đăng nhập cũ
    // Người dùng phải đăng nhập lại với mật khẩu mới
    await Promise.all([
      this.refreshRepo.revokeAllByUser(userId), // Xóa DB
      deleteCache(`${this.CACHE_KEY_REFRESH}*`), // Xóa Redis (pattern)
    ]);
  }

  // Tạo JWT và lưu vào song song DB & Redis
  private async generateAuthResult(user: any): Promise<AuthResult> {
    const accessSecret = process.env.JWT_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!accessSecret || !refreshSecret)
      throw new AppError("Lỗi cấu hình JWT", 500);

    const userIdStr = user.id.toString();

    const accessToken = jwt.sign(
      { sub: userIdStr, role: user.role },
      accessSecret,
      { expiresIn: "15m" },
    );

    const refreshToken = jwt.sign({ sub: userIdStr }, refreshSecret, {
      expiresIn: "7d",
    });

    // Lưu refresh token vào cả DB và Redis (7 ngày - match JWT expiry)
    // Redis: nhanh lookup khi refresh token
    // DB: fallback + lưu trữ lâu dài
    await Promise.all([
      this.refreshRepo.createOrUpdate({
        userId: userIdStr,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }),
      setCache(
        `${this.CACHE_KEY_REFRESH}${refreshToken}`,
        userIdStr,
        this.CACHE_TTL_REFRESH,
      ),
    ]);

    return { accessToken, refreshToken, user };
  }
}
