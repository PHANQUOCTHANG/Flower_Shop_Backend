import { PrismaClient, Category, Prisma } from "@prisma/client";
import { BaseQuery, IPaginatedResult } from "@/utils/query";

export interface ICategoryRepository {
  create(data: Prisma.CategoryCreateInput): Promise<Category>;
  findAll(query: BaseQuery): Promise<IPaginatedResult<Category>>;
  findById(id: bigint): Promise<Category | null>;
  findBySlug(slug: string): Promise<Category | null>;
  updateById(id: bigint, data: Prisma.CategoryUpdateInput): Promise<Category | null>;
  softDelete(id: bigint): Promise<void>;
}

export class CategoryRepository implements ICategoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // Tạo danh mục
  async create(data: Prisma.CategoryCreateInput): Promise<Category> {
    return this.prisma.category.create({ data });
  }

  // Lấy danh sách + Search + Phân trang
  async findAll(query: BaseQuery): Promise<IPaginatedResult<Category>> {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(query.limit ?? 10, 100);

    const where: Prisma.CategoryWhereInput = {
      deletedAt: null,
      ...(query.search && {
        name: { contains: query.search, mode: "insensitive" },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.category.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      }),
      this.prisma.category.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: bigint) {
    return this.prisma.category.findFirst({ where: { id, deletedAt: null } });
  }

  async findBySlug(slug: string) {
    return this.prisma.category.findFirst({ where: { slug, deletedAt: null } });
  }

  async updateById(id: bigint, data: Prisma.CategoryUpdateInput) {
    return this.prisma.category.update({ where: { id }, data });
  }

  // Xóa mềm
  async softDelete(id: bigint) {
    await this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date(), status: "hidden" },
    });
  }
}