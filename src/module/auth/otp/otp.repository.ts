import { PrismaClient, Otp } from "@prisma/client";

export interface IOtpRepository {
  create(data: any): Promise<Otp>;
  findValidByEmail(email: string): Promise<Otp | null>;
  markVerified(id: string): Promise<void>;
  deleteByEmail(email: string): Promise<void>;
}

export class OtpRepository implements IOtpRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // Lưu mã OTP mới vào database
  async create(data: any): Promise<Otp> {
    return this.prisma.otp.create({
      data: {
        email: data.email,
        otpHash: data.otpHash,
        expiresAt: data.expiresAt,
      },
    });
  }

  // Tìm kiếm mã OTP hợp lệ: chưa dùng, đúng email và còn trong thời gian hiệu lực
  async findValidByEmail(email: string): Promise<Otp | null> {
    return this.prisma.otp.findFirst({
      where: {
        email,
        expiresAt: {
          gt: new Date(), // Phải lớn hơn thời gian hiện tại (gt: greater than)
        },
      },
      // Ưu tiên lấy bản ghi mới nhất nếu có nhiều mã trùng lặp
      orderBy: { createdAt: "desc" },
    });
  }

  // Cập nhật trạng thái đã xác thực (verified = true) cho mã OTP
  async markVerified(id: string): Promise<void> {
    await this.prisma.otp.update({
      where: { id },
      data: { verified: true },
    });
  }

  // Xóa sạch các mã OTP cũ hoặc đã hết hạn của một email để tối ưu dung lượng DB
  async deleteByEmail(email: string): Promise<void> {
    await this.prisma.otp.deleteMany({
      where: { email },
    });
  }
}
