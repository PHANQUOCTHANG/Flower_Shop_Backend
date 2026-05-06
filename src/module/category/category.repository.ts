import { PrismaClient, Category, Prisma } from "@prisma/client";
import { BaseQuery, IPaginatedResult } from "@/utils/query";
import { getSearchPattern } from "@/utils/searchUtils";

export interface ICategoryRepository {
  create(data: Prisma.CategoryCreateInput): Promise<Category>;
  findAll(query: BaseQuery): Promise<IPaginatedResult<Category>>;
  findById(id: string): Promise<Category | null>;
  findBySlug(slug: string): Promise<Category | null>;
  updateById(
    id: string,
    data: Prisma.CategoryUpdateInput,
  ): Promise<Category | null>;
  softDelete(id: string): Promise<void>;
}

export class CategoryRepository implements ICategoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // Tạo danh mục mới
  async create(data: Prisma.CategoryCreateInput): Promise<Category> {
    return this.prisma.category.create({ data });
  }

  // Lấy danh sách danh mục (hỗ trợ tìm kiếm và phân trang)
  async findAll(query: BaseQuery): Promise<IPaginatedResult<Category>> {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(query.limit ?? 100, 100);

    const where: Prisma.CategoryWhereInput = {
      deletedAt: null,
      ...(query.search && {
        name: { contains: getSearchPattern(query.search), mode: "insensitive" },
      }),
    };

    // Sắp xếp dữ liệu
    let orderBy: any = { createdAt: "desc" };
    switch (query.sort) {
      case "oldest":
        orderBy = { createdAt: "asc" };
        break;
      case "price-asc":
        orderBy = { sortOrder: "asc" };
        break;
      case "price-desc":
        orderBy = { sortOrder: "desc" };
        break;
    }

    // Truy vấn song song để tối ưu hành
    const [data, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
      }),
      this.prisma.category.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Tìm danh mục theo ID
  async findById(id: string): Promise<Category | null> {
    return this.prisma.category.findFirst({
      where: { id, deletedAt: null },
    });
  }

  // Tìm danh mục theo slug (dành cho khách hàng)
  async findBySlug(slug: string): Promise<Category | null> {
    return this.prisma.category.findFirst({
      where: { slug, deletedAt: null },
    });
  }

  // Cập nhật danh mục
  async updateById(
    id: string,
    data: Prisma.CategoryUpdateInput,
  ): Promise<Category | null> {
    return this.prisma.category.update({
      where: { id },
      data,
    });
  }

  // Xóa mềm danh mục
  async softDelete(id: string): Promise<void> {
    await this.prisma.category.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: "hidden",
      },
    });
  }
}
