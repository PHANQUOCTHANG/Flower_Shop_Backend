import { UserRole } from "@prisma/client";

// DTO phản hồi sau khi đăng nhập hoặc làm mới token thành công
export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date; // Thời điểm hết hạn để controller set cookie chính xác
  rememberMe: boolean;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: UserRole;
    phone?: string | null;
    avatar?: string | null;
  };

  constructor(
    user: any,
    accessToken: string,
    refreshToken: string,
    refreshTokenExpiresAt: Date,
    rememberMe: boolean,
  ) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.refreshTokenExpiresAt = refreshTokenExpiresAt;
    this.rememberMe = rememberMe;

    this.user = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      phone: user.phone,
      avatar: user.avatar,
    };
  }

  static from(
    user: any,
    accessToken: string,
    refreshToken: string,
    refreshTokenExpiresAt: Date,
    rememberMe: boolean,
  ): AuthResponseDto {
    return new AuthResponseDto(user, accessToken, refreshToken, refreshTokenExpiresAt, rememberMe);
  }
}