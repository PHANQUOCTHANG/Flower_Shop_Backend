import RefreshTokenModel from "@/models/refreshToken.model";

export interface IRefreshTokenRepository {
  create(data: any): Promise<any>;
  findValid(token: string): Promise<any>;
  revoke(token: string): Promise<any>;
  revokeAllByUser(userId: string): Promise<any>;
}

export class RefreshTokenRepository implements IRefreshTokenRepository {
  // Tạo hoặc cập nhật refresh token
  async create(data: any) {
    return RefreshTokenModel.findOneAndUpdate(
      { userId: data.userId },
      {
        token: data.token,
        expiresAt: data.expiresAt,
        revoked: false,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );
  }

  // Tìm refresh token hợp lệ
  async findValid(token: string) {
    return RefreshTokenModel.findOne({ token, revoked: false });
  }

  // Thu hồi refresh token
  async revoke(token: string) {
    return RefreshTokenModel.updateOne({ token }, { revoked: true });
  }

  // Thu hồi tất cả token của user
  async revokeAllByUser(userId: string) {
    return RefreshTokenModel.updateMany({ userId }, { revoked: true });
  }
}
