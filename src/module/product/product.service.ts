import slugify from "slugify";
import AppError from "@/utils/appError";
import { IProductRepository } from "./product.repository";
import { ProductResponseDto } from "./product.response";
import { CreateProductDto, UpdateProductDto } from "./product.request";
import { ProductQuery } from "@/module/product/product.type";
import {
  getCache,
  setCache,
  deleteCache,
  deleteCacheByPattern,
} from "@/utils/cache";

export interface IProductService {
  create(dto: CreateProductDto): Promise<ProductResponseDto>;
  findAll(query?: ProductQuery): Promise<any>;
  findById(id: string): Promise<ProductResponseDto>;
  findBySlug(slug: string): Promise<ProductResponseDto>;
  update(id: string, dto: UpdateProductDto): Promise<ProductResponseDto>;
  delete(id: string): Promise<void>;
  findGroupedByCategory(limit: number): Promise<any>;
}

export class ProductService implements IProductService {
  private readonly CACHE_KEY = "products";
  private readonly CACHE_TTL_LIST = 600; // 10 phút - danh sách sản phẩm (ít thay đổi)
  private readonly CACHE_TTL_DETAIL = 900; // 15 phút - chi tiết sản phẩm (rất ít thay đổi)
  private readonly CACHE_TTL_SEARCH = 300; // 5 phút - tìm kiếm/lọc (hay thay đổi)

  constructor(private readonly productRepo: IProductRepository) {}

  // Tạo sản phẩm mới
  async create(dto: CreateProductDto): Promise<ProductResponseDto> {
    // Tự động tạo slug chuẩn SEO từ tên sản phẩm
    const slug = slugify(dto.name, { lower: true, strict: true });

    // Kiểm tra slug có trùng lặp không
    const existed = await this.productRepo.findBySlug(slug);
    if (existed) {
      throw new AppError("Sản phẩm với tên này đã tồn tại", 400);
    }

    // Ghi dữ liệu vào DB
    const product = await this.productRepo.create({
      ...dto,
      slug,
    });

    // Xóa cache danh sách và hiển thị trang chủ (sản phẩm mới được thêm)
    await Promise.all([
      deleteCacheByPattern(`${this.CACHE_KEY}:list:*`),
      deleteCacheByPattern(`${this.CACHE_KEY}:grouped:*`),
    ]);

    return ProductResponseDto.from(product);
  }

  // Lấy danh sách sản phẩm (hỗ trợ phân trang, tìm kiếm, lọc)
  async findAll(query: ProductQuery): Promise<any> {
    // Tạo cache key từ query parameters
    const cacheKey = `${this.CACHE_KEY}:list:${JSON.stringify(query)}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) return cached;

    // Lấy từ DB nếu không có cache
    const result = await this.productRepo.findAll(query);
    const response = {
      ...result,
      data: ProductResponseDto.fromList(result.data),
    };

    // Xác định TTL dựa trên tính chất của query
    let ttl = this.CACHE_TTL_LIST;
    if (query.search || (query.category && query.category.length > 0)) {
      ttl = this.CACHE_TTL_SEARCH; // Tìm kiếm/lọc: cache ngắn hơn
    }

    // Lưu cache
    await setCache(cacheKey, response, ttl);

    return response;
  }

  // Lấy chi tiết sản phẩm theo ID
  async findById(id: string): Promise<ProductResponseDto> {
    // Kiểm tra cache trước
    const cacheKey = `${this.CACHE_KEY}:id:${id}`;
    const cached = await getCache<ProductResponseDto>(cacheKey);
    if (cached) return cached;

    // Lấy từ DB nếu không có trong cache
    const product = await this.productRepo.findById(id);
    if (!product) {
      throw new AppError("Không tìm thấy sản phẩm", 404);
    }

    const response = ProductResponseDto.from(product);

    // Lưu cache (15 phút - chi tiết sản phẩm ít thay đổi)
    await setCache(cacheKey, response, this.CACHE_TTL_DETAIL);

    return response;
  }

  // Lấy sản phẩm theo slug (dành cho khách hàng)
  async findBySlug(slug: string): Promise<ProductResponseDto> {
    // Kiểm tra cache
    const cacheKey = `${this.CACHE_KEY}:slug:${slug}`;
    const cached = await getCache<ProductResponseDto>(cacheKey);
    if (cached) {
      return cached;
    }

    // Truy vấn từ DB
    const product = await this.productRepo.findBySlug(slug);
    if (!product) {
      throw new AppError("Không tìm thấy sản phẩm", 404);
    }

    const response = ProductResponseDto.from(product);

    // Cập nhật cache (15 phút - chi tiết sản phẩm ít thay đổi)
    await setCache(cacheKey, response, this.CACHE_TTL_DETAIL);

    return response;
  }

  // Cập nhật sản phẩm
  async update(id: string, dto: UpdateProductDto): Promise<ProductResponseDto> {
    // Kiểm tra sản phẩm có tồn tại
    const exists = await this.productRepo.findById(id);
    if (!exists) {
      throw new AppError("Sản phẩm không tồn tại", 404);
    }

    const updateData: any = { ...dto };

    // Cập nhật slug nếu tên sản phẩm thay đổi
    if (dto.name) {
      updateData.slug = slugify(dto.name, { lower: true, strict: true });
    }

    // Thực hiện cập nhật
    const updated = await this.productRepo.updateById(id, updateData);
    if (!updated) {
      throw new AppError("Cập nhật sản phẩm thất bại", 500);
    }

    // Xóa cache liên quan
    const cacheInvalidations = [
      deleteCache(`${this.CACHE_KEY}:id:${id}`), // Cache chi tiết ID
      deleteCache(`${this.CACHE_KEY}:slug:${exists.slug}`), // Cache chi tiết slug cũ
      deleteCacheByPattern(`${this.CACHE_KEY}:list:*`), // Cache danh sách (giá/thông tin thay đổi)
      deleteCacheByPattern(`${this.CACHE_KEY}:grouped:*`), // Cache hiển thị nhóm danh mục trang chủ
    ];

    // Nếu slug thay đổi, xóa cache slug mới
    if (dto.name) {
      cacheInvalidations.push(
        deleteCache(`${this.CACHE_KEY}:slug:${updateData.slug}`),
      );
    }

    await Promise.all(cacheInvalidations);

    return ProductResponseDto.from(updated);
  }

  // Xóa mềm sản phẩm
  async delete(id: string): Promise<void> {
    // Kiểm tra sản phẩm có tồn tại
    const exists = await this.productRepo.findById(id);
    if (!exists) {
      throw new AppError("Sản phẩm không tồn tại để xóa", 404);
    }

    // Đánh dấu xóa mềm
    await this.productRepo.softDelete(id);

    // Xóa cache liên quan
    await Promise.all([
      deleteCache(`${this.CACHE_KEY}:id:${id}`), // Cache chi tiết ID
      deleteCache(`${this.CACHE_KEY}:slug:${exists.slug}`), // Cache chi tiết slug
      deleteCacheByPattern(`${this.CACHE_KEY}:list:*`), // Cache danh sách (bị ảnh hưởng bởi xóa)
      deleteCacheByPattern(`${this.CACHE_KEY}:grouped:*`), // Xóa luôn grouped cache
    ]);
  }

  // Lấy sản phẩm nhóm theo danh mục
  async findGroupedByCategory(limit: number): Promise<any> {
    const cacheKey = `${this.CACHE_KEY}:grouped:${limit}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) return cached;

    const result = await this.productRepo.findGroupedByCategory(limit);
    
    const response = result.map(group => ({
      category: group.category,
      products: ProductResponseDto.fromList(group.products)
    }));

    await setCache(cacheKey, response, this.CACHE_TTL_LIST);
    return response;
  }
}
