import { PrismaClient, Product, Prisma } from "@prisma/client";
import { IPaginatedResult } from "@/utils/query";
import { ProductQuery } from "@/module/product/product.type";

export interface IProductRepository {
  create(data: any): Promise<Product>;
  findAll(query: ProductQuery): Promise<IPaginatedResult<Product>>;
  findById(id: string): Promise<Product | null>;
  findBySlug(slug: string): Promise<Product | null>;
  updateById(id: string, data: any): Promise<Product | null>;
  softDelete(id: string): Promise<void>;
}

export class ProductRepository implements IProductRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // Tạo sản phẩm mới kèm theo ảnh và danh mục
  async create(data: any): Promise<Product> {
    const { categoryIds, images, ...productData } = data;

    return this.prisma.product.create({
      data: {
        ...productData,
        // Lưu vào bảng trung gian product_categories
        // Prisma tự động map productId dựa trên quan hệ đã định nghĩa
        categories: categoryIds
          ? {
              create: categoryIds.map((catId: string) => ({
                categoryId: catId,
              })),
            }
          : undefined,
        // Lưu vào bảng product_images
        images: images
          ? {
              create: images,
            }
          : undefined,
      },
      // Trả về dữ liệu kèm theo ảnh và danh mục sau khi tạo thành công
      include: {
        images: true,
        categories: true,
      },
    });
  }

  // Lấy danh sách sản phẩm có phân trang, tìm kiếm và lọc xóa mềm
  async findAll(query: ProductQuery): Promise<IPaginatedResult<Product>> {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(query.limit ?? 10, 100);

    // Khởi tạo điều kiện where với softDelete
    const where: Prisma.ProductWhereInput = {
      deletedAt: null, // Chỉ lấy sản phẩm chưa bị xóa mềm
    };

    // Thêm filter search nếu có
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { sku: { contains: query.search, mode: "insensitive" } },
      ];
    }

    // Thêm filter category nếu có
    if (query.category) {
      (where as any).categories = {
        some: {
          category: {
            slug: { contains: query.category, mode: "insensitive" },
          },
        },
      };
    }

    // Thêm filter giá tối thiểu nếu có
    if (query.priceMin !== undefined) {
      (where as any).price = {
        ...(where as any).price,
        gte: query.priceMin,
      };
    }

    // Thêm filter giá tối đa nếu có
    if (query.priceMax !== undefined) {
      (where as any).price = {
        ...(where as any).price,
        lte: query.priceMax,
      };
    }

    // Xây dựng orderBy từ sort query (mặc định: -createdAt)
    let orderBy: any = { createdAt: "desc" };
    switch (query.sort) {
      case "price-asc":
        orderBy = { price: "asc" };
        break;
      case "price-desc":
        orderBy = { price: "desc" };
        break;
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          categories: {
            include: {
              category: true, // Lấy chi tiết danh mục để hiển thị badge/tag ở danh sách
            },
          },
        },
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

  // Tìm chi tiết sản phẩm theo ID (Bao gồm tất cả ảnh và danh mục)
  async findById(id: string) {
    return this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: {
        images: { orderBy: { sortOrder: "asc" } }, // Sắp xếp ảnh theo thứ tự hiển thị
        categories: {
          include: {
            category: true, // Lấy chi tiết danh mục
          },
        },
      },
    });
  }

  // Tìm sản phẩm theo Slug (Dùng cho SEO - Chi tiết sản phẩm phía Client)
  async findBySlug(slug: string) {
    return this.prisma.product.findFirst({
      where: { slug, deletedAt: null },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        categories: {
          include: {
            category: true, // Lấy chi tiết danh mục
          },
        },
      },
    });
  }

  // Cập nhật thông tin sản phẩm
  // Tự động xóa các liên kết cũ và ghi đè mới cho Categories/Images
  async updateById(id: string, data: any) {
    const { categoryIds, images, ...productData } = data;

    try {
      return await this.prisma.product.update({
        where: { id },
        data: {
          ...productData,
          // Đồng bộ danh mục: Xóa liên kết cũ, thêm mới theo mảng categoryIds
          categories: categoryIds
            ? {
                deleteMany: {},
                create: categoryIds.map((catId: string) => ({
                  categoryId: catId,
                })),
              }
            : undefined,
          // Đồng bộ ảnh: Xóa toàn bộ ảnh cũ và lưu lại bộ ảnh mới
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
      if (error.code === "P2025") return null; // Lỗi không tìm thấy bản ghi để update
      throw error;
    }
  }

  // Xóa mềm sản phẩm bằng cách gán ngày xóa và ẩn trạng thái
  async softDelete(id: string) {
    await this.prisma.product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: "hidden",
      },
    });
  }
}
