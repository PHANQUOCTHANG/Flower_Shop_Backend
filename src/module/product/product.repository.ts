import { PrismaClient, Product, Prisma } from "@prisma/client";
import { BaseQuery, IPaginatedResult } from "@/utils/query";

export interface IProductRepository {
  create(data: Prisma.ProductCreateInput): Promise<Product>;
  findAll(query: BaseQuery): Promise<IPaginatedResult<Product>>;
  findById(id: bigint): Promise<Product | null>;
  findBySlug(slug: string): Promise<Product | null>;
  updateById(id: bigint, data: Prisma.ProductUpdateInput): Promise<Product | null>;
  softDelete(id: bigint): Promise<void>;
}

export class ProductRepository implements IProductRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // Tạo sản phẩm mới
  async create(data: Prisma.ProductCreateInput): Promise<Product> {
    return this.prisma.product.create({ data });
  }

  // Lấy danh sách kèm phân trang & search
  async findAll(query: BaseQuery): Promise<IPaginatedResult<Product>> {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(query.limit ?? 10, 100);

    const where: Prisma.ProductWhereInput = {
      deletedAt: null, // Lọc bản ghi chưa xóa mềm
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: "insensitive" } },
          { sku: { contains: query.search, mode: "insensitive" } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Tìm theo ID chưa xóa
  async findById(id: bigint) {
    return this.prisma.product.findFirst({
      where: { id, deletedAt: null },
    });
  }

  // Tìm theo Slug (SEO)
  async findBySlug(slug: string) {
    return this.prisma.product.findFirst({
      where: { slug, deletedAt: null },
    });
  }

  // Cập nhật theo ID
  async updateById(id: bigint, data: Prisma.ProductUpdateInput) {
    try {
      return await this.prisma.product.update({ where: { id }, data });
    } catch (error: any) {
      if (error.code === "P2025") return null;
      throw error;
    }
  }

  // Xóa mềm: Gán deletedAt và ẩn sản phẩm
  async softDelete(id: bigint) {
    await this.prisma.product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: "hidden",
      },
    });
  }
}