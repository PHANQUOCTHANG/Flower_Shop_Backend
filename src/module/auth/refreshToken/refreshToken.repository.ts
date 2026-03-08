import { PrismaClient, RefreshToken } from "@prisma/client";

export interface IRefreshTokenRepository {
  createOrUpdate(data: any): Promise<RefreshToken>;
  findValid(token: string): Promise<RefreshToken | null>;
  revoke(token: string): Promise<void>;
  revokeAllByUser(userId: string): Promise<void>;
}

export class RefreshTokenRepository implements IRefreshTokenRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // Tạo mới hoặc cập nhật lại Token cho User
  async createOrUpdate(data: any): Promise<RefreshToken> {
    // Xóa token cũ rồi tạo token mới (tối ưu hơn upsert vì userId không unique)
    await this.prisma.refreshToken.deleteMany({
      where: { userId: data.userId },
    });

    return this.prisma.refreshToken.create({
      data: {
        userId: data.userId,
        token: data.token,
        expiresAt: data.expiresAt,
        revoked: false,
      },
    });
  }

  // Tìm kiếm token chưa bị thu hồi và còn hạn dùng
  async findValid(token: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findFirst({
      where: {
        token,
        revoked: false,
        expiresAt: {
          gt: new Date(), // Phải lớn hơn thời gian hiện tại
        },
      },
      include: { user: true }, // Join lấy luôn thông tin user
    });
  }

  // Thu hồi một token cụ thể (đăng xuất)
  async revoke(token: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { token },
      data: { revoked: true },
    });
  }

  // Thu hồi toàn bộ phiên đăng nhập của user (đổi mật khẩu/bảo mật)
  async revokeAllByUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { revoked: true },
    });
  }
}
