import slugify from "slugify";
import AppError from "@/utils/appError";
import { IProductRepository } from "./product.repository";
import { ProductResponseDto } from "./product.response";
import { CreateProductDto, UpdateProductDto } from "./product.request";
import { ProductQuery } from "@/module/product/product.type";

export interface IProductService {
  create(dto: CreateProductDto): Promise<ProductResponseDto>;
  findAll(query?: ProductQuery): Promise<any>;
  findById(id: string): Promise<ProductResponseDto>;
  findBySlug(slug: string): Promise<ProductResponseDto>;
  update(id: string, dto: UpdateProductDto): Promise<ProductResponseDto>;
  delete(id: string): Promise<void>;
}

export class ProductService implements IProductService {
  constructor(private readonly productRepo: IProductRepository) {}

  // [POST] Tạo sản phẩm mới kèm ảnh và danh mục
  async create(dto: CreateProductDto): Promise<ProductResponseDto> {
    // 1. Tự động tạo slug từ tên sản phẩm
    const slug = slugify(dto.name, { lower: true, strict: true });

    // 2. Kiểm tra trùng lặp slug trong hệ thống
    const existed = await this.productRepo.findBySlug(slug);
    if (existed) {
      throw new AppError("Sản phẩm với tên này đã tồn tại", 400);
    }

    // 3. Gọi repository để thực hiện ghi lồng (Nested Writes) vào nhiều bảng
    const product = await this.productRepo.create({
      ...dto,
      slug,
    });

    return ProductResponseDto.from(product);
  }

  // [GET] Lấy danh sách sản phẩm (hỗ trợ phân trang, search, filter)
  async findAll(query: ProductQuery) {
    const result = await this.productRepo.findAll(query);

    return {
      ...result,
      data: ProductResponseDto.fromList(result.data),
    };
  }

  // [GET] Chi tiết sản phẩm theo ID (kèm full ảnh và danh mục)
  async findById(id: string): Promise<ProductResponseDto> {
    const productId = BigInt(id);
    const product = await this.productRepo.findById(productId);

    if (!product) {
      throw new AppError("Không tìm thấy sản phẩm", 404);
    }

    return ProductResponseDto.from(product);
  }
  // [GET] Chi tiết sản phẩm theo Slug (kèm full ảnh và danh mục)
  async findBySlug(slug: string): Promise<ProductResponseDto> {
    const product = await this.productRepo.findBySlug(slug);

    if (!product) {
      throw new AppError("Không tìm thấy sản phẩm", 404);
    }

    return ProductResponseDto.from(product);
  }

  // [PATCH] Cập nhật thông tin sản phẩm
  async update(id: string, dto: UpdateProductDto): Promise<ProductResponseDto> {
    const productId = BigInt(id);

    // 1. Kiểm tra sự tồn tại của sản phẩm
    const exists = await this.productRepo.findById(productId);
    if (!exists) {
      throw new AppError("Sản phẩm không tồn tại", 404);
    }

    // 2. Nếu người dùng đổi tên, cập nhật lại slug mới
    const updateData: any = { ...dto };
    if (dto.name) {
      updateData.slug = slugify(dto.name, { lower: true, strict: true });
    }

    // 3. Thực hiện cập nhật đồng bộ qua Repository
    const updated = await this.productRepo.updateById(productId, updateData);
    if (!updated) {
      throw new AppError("Cập nhật sản phẩm thất bại", 500);
    }

    return ProductResponseDto.from(updated);
  }

  // [DELETE] Xóa mềm sản phẩm (Soft Delete)
  async delete(id: string): Promise<void> {
    const productId = BigInt(id);

    // 1. Kiểm tra sản phẩm trước khi thực hiện xóa
    const exists = await this.productRepo.findById(productId);
    if (!exists) {
      throw new AppError("Sản phẩm không tồn tại để xóa", 404);
    }

    // 2. Gọi Repo để gán deletedAt và chuyển trạng thái sang hidden
    await this.productRepo.softDelete(productId);
  }
}
