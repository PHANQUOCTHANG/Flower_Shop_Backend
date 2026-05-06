import { PrismaClient, Product, Prisma } from "@prisma/client";
import { IPaginatedResult } from "@/utils/query";
import { ProductQuery } from "@/module/product/product.type";
import { getSearchPattern } from "@/utils/searchUtils";

export interface IProductRepository {
  create(data: any): Promise<Product>;
  findAll(query: ProductQuery): Promise<IPaginatedResult<Product>>;
  findById(id: string): Promise<Product | null>;
  findBySlug(slug: string): Promise<Product | null>;
  updateById(id: string, data: any): Promise<Product | null>;
  softDelete(id: string): Promise<void>;
  findGroupedByCategory(
    limit: number,
  ): Promise<{ category: any; products: Product[] }[]>;
}

export class ProductRepository implements IProductRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // Tạo SKU duy nhất tự động
  private async generateSKU(productName: string): Promise<string> {
    // Lấy 3 chữ cái đầu tiên làm tiền tố
    const prefix = productName
      .substring(0, 3)
      .toUpperCase()
      .replace(/[^A-Z]/g, "");

    // Đếm số sản phẩm để tạo số thứ tự
    const count = await this.prisma.product.count();
    const sequentialNum = String(count + 1).padStart(6, "0");

    let sku = `${prefix || "PRD"}${sequentialNum}`;
    let isUnique = false;
    let attempts = 0;

    // Kiểm tra tính duy nhất, tránh trùng SKU
    while (!isUnique && attempts < 5) {
      const exists = await this.prisma.product.count({ where: { sku } });

      if (exists === 0) {
        isUnique = true;
      } else {
        // Thêm hậu tố ngẫu nhiên nếu SKU bị trùng
        const randomSuffix = Math.random()
          .toString(36)
          .substring(2, 5)
          .toUpperCase();
        sku = `${prefix || "PRD"}${sequentialNum}${randomSuffix}`;
        attempts++;
      }
    }

    return sku;
  }

  // Tạo sản phẩm mới với hình ảnh và danh mục
  async create(data: any): Promise<Product> {
    const { categoryIds, images, ...productData } = data;

    // Sinh SKU nếu không được cung cấp
    if (!productData.sku) {
      productData.sku = await this.generateSKU(productData.name);
    }

    return this.prisma.product.create({
      data: {
        ...productData,
        // Liên kết sản phẩm với danh mục
        categories: categoryIds
          ? {
              create: categoryIds.map((catId: string) => ({
                categoryId: catId,
              })),
            }
          : undefined,
        // Lưu và liên kết hình ảnh
        images: images ? { create: images } : undefined,
      },
      include: {
        images: true,
        categories: true,
      },
    });
  }

  // Lấy danh sách sản phẩm với phân trang và lọc
  async findAll(query: ProductQuery): Promise<IPaginatedResult<Product>> {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(query.limit ?? 10, 100);

    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
    };

    // Lọc theo trạng thái
    if (query.status === "all") {
      // Bỏ qua lọc để admin xem tất cả
    } else if (query.status) {
      where.status = query.status;
    } else {
      where.status = "active";
    }

    // Tìm kiếm theo tên và SKU (không phân biệt hoa thường và dấu)
    if (query.search) {
      const normalizedSearch = getSearchPattern(query.search);
      where.OR = [
        { name: { contains: normalizedSearch, mode: "insensitive" } },
        { sku: { contains: query.search, mode: "insensitive" } },
      ];
    }

    // Lọc theo danh mục
    if (query.category) {
      (where as any).categories = {
        some: {
          category: {
            slug: { contains: query.category, mode: "insensitive" },
          },
        },
      };
    }

    // Lọc theo khoảng giá
    if (query.priceMin !== undefined) {
      (where as any).price = { ...(where as any).price, gte: query.priceMin };
    }
    if (query.priceMax !== undefined) {
      (where as any).price = { ...(where as any).price, lte: query.priceMax };
    }

    // Sắp xếp dữ liệu
    let orderBy: any = { createdAt: "desc" };
    switch (query.sort) {
      case "oldest":
        orderBy = { createdAt: "asc" };
        break;
      case "price-asc":
        orderBy = { price: "asc" };
        break;
      case "price-desc":
        orderBy = { price: "desc" };
        break;
    }

    // Truy vấn song song để tối ưu hiệu năng
    const [data, total, statusCounts] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          categories: { include: { category: true } },
        },
      }),
      this.prisma.product.count({ where }),
      this.getStatusCounts(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      statusCounts,
    };
  }

  // Đếm số sản phẩm theo trạng thái
  private async getStatusCounts(): Promise<Record<string, number>> {
    const results = await this.prisma.product.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: true,
    });

    const statusCounts: Record<string, number> = {};
    results.forEach((result) => {
      statusCounts[result.status] = result._count;
    });

    return statusCounts;
  }

  // Tìm sản phẩm theo ID (dành cho admin)
  async findById(id: string): Promise<Product | null> {
    return this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        categories: { include: { category: true } },
      },
    }) as Promise<Product | null>;
  }

  // Tìm sản phẩm theo slug (dành cho khách hàng)
  async findBySlug(slug: string): Promise<Product | null> {
    return this.prisma.product.findFirst({
      where: { slug, deletedAt: null },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        categories: { include: { category: true } },
      },
    }) as Promise<Product | null>;
  }

  // Cập nhật sản phẩm
  async updateById(id: string, data: any): Promise<Product | null> {
    const { categoryIds, images, ...productData } = data;

    try {
      return await this.prisma.product.update({
        where: { id },
        data: {
          ...productData,
          // Đồng bộ danh mục
          categories: categoryIds
            ? {
                deleteMany: {},
                create: categoryIds.map((catId: string) => ({
                  categoryId: catId,
                })),
              }
            : undefined,
          // Đồng bộ hình ảnh
          images: images
            ? {
                deleteMany: {},
                create: images,
              }
            : undefined,
        },
        include: {
          images: true,
          categories: true,
        },
      });
    } catch (error: any) {
      // Bắt lỗi "Record to update not found" của Prisma
      if (error.code === "P2025") return null;
      throw error;
    }
  }

  // Xóa mềm sản phẩm
  async softDelete(id: string): Promise<void> {
    await this.prisma.product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: "hidden",
      },
    });
  }

  // Lấy danh sách sản phẩm gom theo danh mục
  async findGroupedByCategory(
    limit: number = 20,
  ): Promise<{ category: any; products: Product[] }[]> {
    // 1. Lấy tất cả danh mục đang hoạt động (có thể chỉ lấy những danh mục có sản phẩm tùy rules, bài này lấy hết)
    const categories = await this.prisma.category.findMany({
      orderBy: { createdAt: "desc" },
    });

    // 2. Fetch parallel top X products cho mỗi category
    const results = await Promise.all(
      categories.map(async (category) => {
        const products = await this.prisma.product.findMany({
          where: {
            deletedAt: null,
            status: "active",
            categories: {
              some: { categoryId: category.id },
            },
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          include: {
            images: { where: { isPrimary: true }, take: 1 },
            categories: { include: { category: true } },
          },
        });

        return {
          category,
          products,
        };
      }),
    );

    // Xóa các mảng trống để giao diện mượt
    return results.filter((group) => group.products.length > 0);
  }
}
