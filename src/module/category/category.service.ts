import slugify from "slugify";
import AppError from "@/utils/appError";
import { ICategoryRepository } from "./category.repository";
import { CategoryResponseDto } from "./category.response";
import { CreateCategoryDto, UpdateCategoryDto } from "./category.request";
import {
  getCache,
  setCache,
  deleteCache,
  deleteCacheByPattern,
} from "@/utils/cache";
import { AIService } from "@/module/chat/ai.service";

export interface ICategoryService {
  create(dto: CreateCategoryDto): Promise<CategoryResponseDto>;
  findAll(query?: any): Promise<any>;
  findById(id: string): Promise<CategoryResponseDto>;
  update(id: string, dto: UpdateCategoryDto): Promise<CategoryResponseDto>;
  delete(id: string): Promise<void>;
}

export class CategoryService implements ICategoryService {
  private readonly CACHE_KEY = "categories";
  private readonly CACHE_TTL_LIST = 900; // 15 phút - danh sách danh mục (ít thay đổi)
  private readonly CACHE_TTL_DETAIL = 1800; // 30 phút - chi tiết danh mục (rất ít thay đổi)

  constructor(private readonly categoryRepo: ICategoryRepository) {}

  // Tạo danh mục mới
  async create(dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    // Tự động tạo slug chuẩn SEO từ tên danh mục
    const slug = slugify(dto.name, { lower: true, strict: true });

    // Kiểm tra slug có trùng lặp không
    const existed = await this.categoryRepo.findBySlug(slug);
    if (existed) {
      throw new AppError("Danh mục này đã tồn tại", 400);
    }

    // Chuẩn bị dữ liệu với parent relation
    const createData: any = {
      ...dto,
      slug,
      parent: dto.parentId ? { connect: { id: dto.parentId } } : undefined,
    };
    delete createData.parentId;

    const category = await this.categoryRepo.create(createData);

    // Xóa cache danh sách và cache AI
    await Promise.all([
      deleteCacheByPattern(`${this.CACHE_KEY}:all:*`),
      AIService.invalidateKnowledgeCache(),
    ]);

    return CategoryResponseDto.from(category);
  }

  // Lấy danh sách danh mục (hỗ trợ tìm kiếm và phân trang)
  async findAll(query: any): Promise<any> {
    // Kiểm tra cache
    const cacheKey = `${this.CACHE_KEY}:all:${JSON.stringify(query)}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) return cached;

    const result = await this.categoryRepo.findAll(query);

    const response = {
      ...result,
      data: CategoryResponseDto.fromList(result.data),
    };

    // Lưu cache (15 phút - danh mục ít thay đổi)
    await setCache(cacheKey, response, this.CACHE_TTL_LIST);

    return response;
  }

  // Lấy chi tiết danh mục theo ID
  async findById(id: string): Promise<CategoryResponseDto> {
    // Kiểm tra cache
    const cacheKey = `${this.CACHE_KEY}:id:${id}`;
    const cached = await getCache<CategoryResponseDto>(cacheKey);
    if (cached) return cached;

    const category = await this.categoryRepo.findById(id);
    if (!category) {
      throw new AppError("Không tìm thấy danh mục", 404);
    }

    const response = CategoryResponseDto.from(category);

    // Lưu cache (30 phút - chi tiết danh mục rất ít thay đổi)
    await setCache(cacheKey, response, this.CACHE_TTL_DETAIL);

    return response;
  }

  // Cập nhật danh mục
  async update(
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const exists = await this.categoryRepo.findById(id);
    if (!exists) {
      throw new AppError("Danh mục không tồn tại", 404);
    }

    const updateData: any = { ...dto };

    // Cập nhật slug nếu tên danh mục thay đổi
    if (dto.name) {
      updateData.slug = slugify(dto.name, { lower: true, strict: true });
    }

    // Kiểm tra logic khi cập nhật parent
    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new AppError(
          "Không thể chọn chính nó làm danh mục trực thuộc",
          400,
        );
      }
      updateData.parent = { connect: { id: dto.parentId } };
      delete updateData.parentId;
    }

    const updated = await this.categoryRepo.updateById(id, updateData);

    // Xóa cache liên quan và AI cache
    await Promise.all([
      deleteCache(`${this.CACHE_KEY}:id:${id}`), // Cache chi tiết ID
      deleteCacheByPattern(`${this.CACHE_KEY}:all:*`), // Cache danh sách (thông tin thay đổi)
      AIService.invalidateKnowledgeCache(),
    ]);

    return CategoryResponseDto.from(updated!);
  }

  // Xóa mềm danh mục
  async delete(id: string): Promise<void> {
    const exists = await this.categoryRepo.findById(id);
    if (!exists) {
      throw new AppError("Danh mục không tồn tại", 404);
    }

    await this.categoryRepo.softDelete(id);

    // Xóa cache liên quan và AI cache
    await Promise.all([
      deleteCache(`${this.CACHE_KEY}:id:${id}`), // Cache chi tiết ID
      deleteCacheByPattern(`${this.CACHE_KEY}:all:*`), // Cache danh sách (bị ảnh hưởng bởi xóa)
      AIService.invalidateKnowledgeCache(),
    ]);
  }
}
