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
}

export class AuthService implements IAuthService {
  private readonly CACHE_KEY_REFRESH = "auth:refresh:";
  private readonly CACHE_KEY_BLACKLIST = "auth:blacklist:";

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
    if (!refreshToken) throw new AppError("Không tìm thấy Refresh Token", 401);

    // 1. Kiểm tra trong Redis trước để tối ưu tốc độ
    const cacheKey = `${this.CACHE_KEY_REFRESH}${refreshToken}`;
    let userId = await getCache<string>(cacheKey);

    // 2. Nếu không có trong Redis, fallback kiểm tra database
    if (!userId) {
      const stored = await this.refreshRepo.findValid(refreshToken);
      if (!stored) throw new AppError("Phiên làm việc hết hạn", 401);
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

    // 1. Thu hồi Refresh Token
    await Promise.all([
      this.refreshRepo.revoke(refreshToken),
      deleteCache(`${this.CACHE_KEY_REFRESH}${refreshToken}`),
    ]);

    // 2. [Quan trọng] Đưa Access Token vào Blacklist (nếu có)
    // Giúp token này không thể sử dụng cho đến khi nó tự hết hạn
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

    // 3. Bảo mật: Thu hồi TOÀN BỘ phiên đăng nhập cũ
    await Promise.all([
      this.refreshRepo.revokeAllByUser(user.id),
      this.otpRepo.deleteByEmail(dto.email),
      // Xóa cache OTP (nếu bạn có dùng redis cho OTP ở phần trước)
      deleteCache(`otp:${dto.email}`),
    ]);

    const result = await this.generateAuthResult(user);
    return AuthResponseDto.from(
      result.user,
      result.accessToken,
      result.refreshToken,
    );
  }

  // Hàm tạo JWT và lưu vào song song DB & Redis
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

    // Lưu vào cả Database và Redis để tối ưu việc verify sau này
    await Promise.all([
      this.refreshRepo.createOrUpdate({
        userId: userIdStr,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }),
      setCache(
        `${this.CACHE_KEY_REFRESH}${refreshToken}`,
        userIdStr,
        7 * 24 * 60 * 60,
      ),
    ]);

    return { accessToken, refreshToken, user };
  }
}
