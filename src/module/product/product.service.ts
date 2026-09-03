import slugify from "slugify";
import AppError from "@/utils/appError";
import { IProductRepository } from "./product.repository";
import { ProductResponseDto } from "./product.response";
import { CreateProductDto, UpdateProductDto } from "./product.request";
import { ProductQuery } from "@/module/product/product.type";
import { IImageService } from "@/module/product/image.service";
import {
  getCache,
  setCache,
  deleteCache,
  deleteCacheByPattern,
  CACHE_NULL,
  isCacheNull,
} from "@/utils/cache";
import { AIService } from "@/module/chat/ai.service";

export interface IProductService {
  create(dto: CreateProductDto): Promise<ProductResponseDto>;
  findAll(query?: ProductQuery): Promise<any>;
  findById(id: string): Promise<ProductResponseDto>;
  findBySlug(slug: string): Promise<ProductResponseDto>;
  update(id: string, dto: UpdateProductDto): Promise<ProductResponseDto>;
  delete(id: string): Promise<void>;
  findGroupedByCategory(limit: number): Promise<any>;
  // Thùng rác (sản phẩm đã xóa mềm)
  findTrash(query: ProductQuery): Promise<any>;
  hardDelete(id: string): Promise<void>;
  restore(id: string): Promise<ProductResponseDto>;
}

export class ProductService implements IProductService {
  private readonly CACHE_KEY = "products";
  private readonly CACHE_TTL_LIST = 600; // 10 phút - danh sách sản phẩm (ít thay đổi)
  private readonly CACHE_TTL_DETAIL = 900; // 15 phút - chi tiết sản phẩm (rất ít thay đổi)
  private readonly CACHE_TTL_SEARCH = 300; // 5 phút - tìm kiếm/lọc (hay thay đổi)
  private readonly CACHE_TTL_NOT_FOUND = 30; // 30 giây - chống penetration cho id/slug không tồn tại

  constructor(
    private readonly productRepo: IProductRepository,
    private readonly imageService: IImageService,
  ) {}

  // Xóa toàn bộ cache liên quan tới một sản phẩm cụ thể
  private async invalidateProductCache(id: string, slug: string) {
    await Promise.all([
      deleteCache(`${this.CACHE_KEY}:id:${id}`),
      deleteCache(`${this.CACHE_KEY}:slug:${slug}`),
      deleteCacheByPattern(`${this.CACHE_KEY}:list:*`),
      deleteCacheByPattern(`${this.CACHE_KEY}:grouped:*`),
      AIService.invalidateKnowledgeCache(),
    ]);
  }

  // Tạo sản phẩm mới
  async create(dto: CreateProductDto): Promise<ProductResponseDto> {
    // Tự động tạo slug chuẩn SEO từ tên sản phẩm
    const slug = slugify(dto.name, { lower: true, strict: true });

    // Kiểm tra slug có trùng lặp không
    const existed = await this.productRepo.findBySlug(slug);
    console.log("CREATE: ", existed);
    if (existed && existed.status === "active") {
      throw new AppError("Sản phẩm với tên này đã tồn tại", 400);
    }

    // Ghi dữ liệu vào DB
    const product = await this.productRepo.create({
      ...dto,
      slug,
    });

    // Xóa cache danh sách, trang chủ và AI knowledge cache
    await Promise.all([
      deleteCacheByPattern(`${this.CACHE_KEY}:list:*`),
      deleteCacheByPattern(`${this.CACHE_KEY}:grouped:*`),
      AIService.invalidateKnowledgeCache(),
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
    const cached = await getCache<ProductResponseDto | typeof CACHE_NULL>(cacheKey);
    if (cached) {
      if (isCacheNull(cached)) throw new AppError("Không tìm thấy sản phẩm", 404);
      return cached as ProductResponseDto;
    }

    // Lấy từ DB nếu không có trong cache
    const product = await this.productRepo.findById(id);
    if (!product) {
      await setCache(cacheKey, CACHE_NULL, this.CACHE_TTL_NOT_FOUND);
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
    const cached = await getCache<ProductResponseDto | typeof CACHE_NULL>(cacheKey);
    if (cached) {
      if (isCacheNull(cached)) throw new AppError("Không tìm thấy sản phẩm", 404);
      return cached as ProductResponseDto;
    }

    // Truy vấn từ DB
    const product = await this.productRepo.findBySlug(slug);
    if (!product) {
      await setCache(cacheKey, CACHE_NULL, this.CACHE_TTL_NOT_FOUND);
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

    // Xóa cache liên quan và cache của AI
    const cacheInvalidations = [
      deleteCache(`${this.CACHE_KEY}:id:${id}`), // Cache chi tiết ID
      deleteCache(`${this.CACHE_KEY}:slug:${exists.slug}`), // Cache chi tiết slug cũ
      deleteCacheByPattern(`${this.CACHE_KEY}:list:*`), // Cache danh sách (giá/thông tin thay đổi)
      deleteCacheByPattern(`${this.CACHE_KEY}:grouped:*`), // Cache hiển thị nhóm danh mục trang chủ
      AIService.invalidateKnowledgeCache(),
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

    await this.invalidateProductCache(id, exists.slug);
  }

  // Lấy danh sách sản phẩm trong thùng rác (đã xóa mềm)
  async findTrash(query: ProductQuery): Promise<any> {
    const result = await this.productRepo.findTrash(query);
    return {
      ...result,
      data: ProductResponseDto.fromList(result.data),
    };
  }

  // Xóa vĩnh viễn sản phẩm khỏi DB — chỉ áp dụng cho sản phẩm đang ở thùng rác
  async hardDelete(id: string): Promise<void> {
    const exists = await this.productRepo.findTrashedById(id);
    if (!exists) {
      throw new AppError("Sản phẩm không tồn tại trong thùng rác", 404);
    }

    // Thu thập toàn bộ publicId ảnh (thumbnail + gallery) để dọn trên Cloudinary
    const publicIds = [
      ...(exists.thumbnailPublicId ? [exists.thumbnailPublicId] : []),
      ...((exists as any).images ?? [])
        .map((img: any) => img.publicId)
        .filter(Boolean),
    ];

    await this.productRepo.hardDelete(id);

    if (publicIds.length > 0) {
      // Không chặn thao tác xóa nếu dọn ảnh trên Cloudinary thất bại
      await this.imageService.deleteMultiple(publicIds).catch(() => {});
    }

    await this.invalidateProductCache(id, exists.slug);
  }

  // Khôi phục sản phẩm từ thùng rác
  async restore(id: string): Promise<ProductResponseDto> {
    const exists = await this.productRepo.findTrashedById(id);
    if (!exists) {
      throw new AppError("Sản phẩm không tồn tại trong thùng rác", 404);
    }

    const restored = await this.productRepo.restore(id);
    if (!restored) {
      throw new AppError("Khôi phục sản phẩm thất bại", 500);
    }

    await this.invalidateProductCache(id, exists.slug);

    return ProductResponseDto.from(restored);
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
