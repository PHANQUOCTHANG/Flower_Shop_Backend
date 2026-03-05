import { UserRole } from "@prisma/client";

// DTO phản hồi sau khi đăng nhập hoặc làm mới token thành công
export class AuthResponseDto {
  accessToken: string; // JWT ngắn hạn (ví dụ: 15p)
  refreshToken: string; // JWT dài hạn (ví dụ: 7 ngày)

  user: {
    id: string; // Chuyển BigInt id sang string
    fullName: string;
    email: string;
    role: UserRole; // Sử dụng enum trực tiếp từ Prisma
    avatar?: string | null;
  };

  constructor(user: any, accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;

    // Map dữ liệu từ bản ghi database sang định dạng response
    this.user = {
      id: user.id.toString(), // Quan trọng: BigInt phải toString()
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
    };
  }

  // Hàm static để tạo response nhanh gọn
  static from(
    user: any,
    accessToken: string,
    refreshToken: string,
  ): AuthResponseDto {
    return new AuthResponseDto(user, accessToken, refreshToken);
  }
}
