import { PrismaClient, Prisma, User } from "@prisma/client";
import { BaseQuery, IPaginatedResult } from "@/utils/query";

export interface IUserRepository {
  create(data: Prisma.UserCreateInput): Promise<User>;
  findAll(query: BaseQuery): Promise<IPaginatedResult<User>>;
  findById(id: bigint): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  updateById(id: bigint, data: Prisma.UserUpdateInput): Promise<User | null>;
  softDelete(id: bigint): Promise<void>;
}

export class UserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // Tạo user
  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data: {
        ...data,
        email: data.email.toLowerCase(), // Chuẩn hóa email
      },
    });
  }

  // Lấy danh sách có phân trang + search
  async findAll(query: BaseQuery): Promise<IPaginatedResult<User>> {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(query.limit ?? 10, 100);

    const where: Prisma.UserWhereInput = {
      deletedAt: null, // Soft delete filter
      ...(query.search && {
        OR: [
          { fullName: { contains: query.search, mode: "insensitive" } },
          { email: { contains: query.search, mode: "insensitive" } },
        ],
      }),
    };

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

  async findById(id: bigint) {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
  }

  async updateById(id: bigint, data: Prisma.UserUpdateInput) {
    try {
      return await this.prisma.user.update({ where: { id }, data });
    } catch (error: any) {
      if (error.code === "P2025") return null; // Not found
      throw error;
    }
  }

  // Soft delete
  async softDelete(id: bigint) {
    await this.prisma.user.updateMany({
      where: { id, deletedAt: null },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }
}
