import { PrismaClient, Prisma, User } from "@prisma/client";
import { BaseQuery, IPaginatedResult } from "@/utils/query";
import { getSearchPattern } from "@/utils/searchUtils";

export interface IUserRepository {
  create(data: Prisma.UserCreateInput): Promise<User>;
  findAll(query: BaseQuery): Promise<IPaginatedResult<User>>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  updateById(id: string, data: Prisma.UserUpdateInput): Promise<User | null>;
  updateByEmail(email: string, data: any): Promise<User | null>;
  softDelete(id: string): Promise<void>;
}

export class UserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // Tạo người dùng mới (chuẩn hóa email)
  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data: {
        ...data,
        email: data.email.toLowerCase(), // Chuẩn hóa email (lowercase)
      },
    });
  }

  // Lấy danh sách người dùng (phân trang + tìm kiếm theo fullName/email)
  async findAll(query: BaseQuery): Promise<IPaginatedResult<User>> {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(query.limit ?? 10, 100);

    // Xây dựng điều kiện tìm kiếm (không phân biệt hoa thường và dấu)
    const where: Prisma.UserWhereInput = {
      deletedAt: null, // Chỉ lấy user chưa bị xóa mềm
      ...(query.search && {
        OR: [
          {
            fullName: {
              contains: getSearchPattern(query.search),
              mode: "insensitive",
            },
          },
          { email: { contains: query.search, mode: "insensitive" } },
        ],
      }),
    };

    // Lấy dữ liệu song song
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Lấy chi tiết người dùng theo ID (không lấy bị xóa mềm)
  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
  }

  // Lấy người dùng theo email (không lấy bị xóa mềm)
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
  }

  // Cập nhật người dùng theo ID
  async updateById(
    id: string,
    data: Prisma.UserUpdateInput,
  ): Promise<User | null> {
    try {
      return await this.prisma.user.update({ where: { id }, data });
    } catch (error: any) {
      if (error.code === "P2025") return null; // User không tồn tại
      throw error;
    }
  }

  // Cập nhật người dùng theo email (dùng cho Reset Password)
  async updateByEmail(email: string, data: any): Promise<User | null> {
    return this.prisma.user.update({
      where: { email },
      data,
    });
  }

  // Xóa mềm người dùng (đánh dấu xóa, không xóa cứng)
  async softDelete(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }
}
