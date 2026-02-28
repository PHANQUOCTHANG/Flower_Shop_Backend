import slugify from "slugify";
import AppError from "@/utils/appError";
import { IProductRepository } from "./product.repository";
import { ProductResponseDto } from "./product.response";
import { CreateProductDto, UpdateProductDto } from "./product.request";


export interface IProductService {
  create(dto: CreateProductDto): Promise<ProductResponseDto>;
  findAll(query?: any): Promise<any>;
  findById(id: string): Promise<ProductResponseDto>;
  update(id: string, dto: UpdateProductDto): Promise<ProductResponseDto>;
  delete(id: string): Promise<void>;
}
export class ProductService implements IProductService {
  constructor(private readonly productRepo: IProductRepository) {}

  // Tạo sản phẩm: Tự động tạo slug + Check trùng
  async create(dto: CreateProductDto): Promise<ProductResponseDto> {
    const slug = slugify(dto.name, { lower: true, strict: true });

    const existed = await this.productRepo.findBySlug(slug);
    if (existed) throw new AppError("Sản phẩm với tên này đã tồn tại", 400);

    const product = await this.productRepo.create({ ...dto, slug });
    return ProductResponseDto.from(product);
  }

  // Lấy danh sách sản phẩm
  async findAll(query: any) {
    const result = await this.productRepo.findAll(query);
    return { ...result, data: ProductResponseDto.fromList(result.data) };
  }

  // Chi tiết sản phẩm
  async findById(id: string) {
    const product = await this.productRepo.findById(BigInt(id));
    if (!product) throw new AppError("Không tìm thấy sản phẩm", 404);

    return ProductResponseDto.from(product);
  }

  // Cập nhật: Tự động cập nhật slug nếu đổi tên
  async update(id: string, dto: UpdateProductDto) {
    const productId = BigInt(id);
    const exists = await this.productRepo.findById(productId);
    if (!exists) throw new AppError("Sản phẩm không tồn tại", 404);

    const updateData: any = { ...dto };
    if (dto.name) {
      updateData.slug = slugify(dto.name, { lower: true, strict: true });
    }

    const updated = await this.productRepo.updateById(productId, updateData);
    if (!updated) throw new AppError("Cập nhật thất bại", 500);

    return ProductResponseDto.from(updated);
  }

  // Xóa mềm sản phẩm
  async delete(id: string) {
    const productId = BigInt(id);
    const exists = await this.productRepo.findById(productId);
    if (!exists) throw new AppError("Sản phẩm không tồn tại", 404);

    await this.productRepo.softDelete(productId);
  }
}