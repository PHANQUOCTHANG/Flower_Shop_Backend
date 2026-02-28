import AppError from "@/utils/appError";
import { IProductRepository } from "@/repositories/product.repository";
import {
  CreateProductRequestDto,
  UpdateProductRequestDto,
} from "@/dto/request/product.request";
import { IProductDocument } from "@/interface/product.interface";
import { BaseQuery, IPaginatedResult, normalizeQuery } from "@/utils/query";
import slugify from "slugify";

export interface IProductService {
  create(dto: CreateProductRequestDto): Promise<any>;
  findAll(query: any): Promise<any>;
  findById(id: string): Promise<any>;
  findBySlug(slug: string): Promise<any>;
  update(id: string, dto: UpdateProductRequestDto): Promise<any>;
  delete(id: string): Promise<void>;
}

export class ProductService implements IProductService {
  constructor(private readonly productRepo: IProductRepository) {}

  // Tạo sản phẩm mới kèm xử lý slug và tên không dấu
  async create(dto: CreateProductRequestDto): Promise<any> {
    const slug = slugify(dto.name, { lower: true, strict: true });
    const nameNoAccent = dto.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const product = await this.productRepo.create({
      ...dto,
      slug,
      nameNoAccent,
    });

    return this.mapToResponse(product);
  }

  // Lấy danh sách sản phẩm kèm chuẩn hóa query
  async findAll(query: any): Promise<any> {
    const normalizedQuery = normalizeQuery(query);
    const result = await this.productRepo.findAll(normalizedQuery);

    return {
      ...result,
      data: result.data.map((p: any) => this.mapToResponse(p)),
    };
  }

  // Lấy chi tiết sản phẩm theo ID
  async findById(id: string): Promise<any> {
    const product = await this.productRepo.findById(id);
    if (!product) throw new AppError("Sản phẩm không tồn tại", 404);

    return this.mapToResponse(product);
  }

  // Tìm kiếm sản phẩm thông qua đường dẫn slug
  async findBySlug(slug: string): Promise<any> {
    const product = await this.productRepo.findBySlug(slug);
    if (!product) throw new AppError("Sản phẩm không tồn tại", 404);

    return this.mapToResponse(product);
  }

  // Cập nhật thông tin sản phẩm và làm mới slug nếu đổi tên
  async update(id: string, dto: UpdateProductRequestDto): Promise<any> {
    const updateData: any = { ...dto };

    if (dto.name) {
      updateData.slug = slugify(dto.name, { lower: true, strict: true });
      updateData.nameNoAccent = dto.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    }

    const product = await this.productRepo.updateById(id, updateData);
    if (!product) throw new AppError("Sản phẩm không tồn tại", 404);

    return this.mapToResponse(product);
  }

  // Xóa sản phẩm (gọi hàm xóa mềm từ repo)
  async delete(id: string): Promise<void> {
    const product = await this.productRepo.findById(id);
    if (!product) throw new AppError("Sản phẩm không tồn tại để xóa", 404);

    await this.productRepo.deleteById(id);
  }

  // Ánh xạ dữ liệu trả về và tính toán giá cuối cùng
  private mapToResponse(product: IProductDocument): any {
    const basePrice = product.price ? Number(product.price.toString()) : 0;
    const discount = product.discount || 0;

    return {
      id: product._id || product.id,
      name: product.name,
      slug: product.slug,
      price: basePrice,
      discount: discount,
      finalPrice: basePrice * (1 - discount / 100),
      description: product.description || "",
      images: product.images || [],
      stock: product.stock || 0,
      status: product.status,
      category: product.category,
      rating: product.rating || 0,
      amountBuy: product.amountBuy || 0,
      productNew: product.productNew,
      color: product.color,
      size: product.size || "",
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
