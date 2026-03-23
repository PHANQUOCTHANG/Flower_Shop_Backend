import slugify from "slugify";
import AppError from "@/utils/appError";
import { ICategoryRepository } from "./category.repository";
import { CategoryResponseDto } from "./category.response";
import { CreateCategoryDto, UpdateCategoryDto } from "./category.request";
import { getCache, setCache, deleteCache, deleteCacheByPattern } from "@/utils/cache";

export interface ICategoryService {
  create(dto: CreateCategoryDto): Promise<CategoryResponseDto>;
  findAll(query?: any): Promise<any>;
  findById(id: string): Promise<CategoryResponseDto>;
  update(id: string, dto: UpdateCategoryDto): Promise<CategoryResponseDto>;
  delete(id: string): Promise<void>;
}

export class CategoryService implements ICategoryService {
  private readonly CACHE_KEY = "categories";
  private readonly CACHE_TTL = 3600; // 1 giờ

  constructor(private readonly categoryRepo: ICategoryRepository) {}

  // [POST] Tạo danh mục + Tự động tạo slug
  async create(dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    const slug = slugify(dto.name, { lower: true, strict: true });

    const existed = await this.categoryRepo.findBySlug(slug);
    if (existed) throw new AppError("Danh mục này đã tồn tại", 400);

    // Chuyển parentId sang string nếu có
    const createData: any = {
      ...dto,
      slug,
      parent: dto.parentId ? { connect: { id: dto.parentId } } : undefined,
    };
    delete createData.parentId;

    const category = await this.categoryRepo.create(createData);

    // [Cache] Xóa cache danh sách vì dữ liệu đã thay đổi
    await deleteCacheByPattern(`${this.CACHE_KEY}:all:*`);

    return CategoryResponseDto.from(category);
  }

  async findAll(query: any) {
    // [Cache] Tạo key dựa trên query để phân biệt phân trang/filter
    const cacheKey = `${this.CACHE_KEY}:all:${JSON.stringify(query)}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) return cached;

    const result = await this.categoryRepo.findAll(query);

    const response = {
      ...result,
      data: CategoryResponseDto.fromList(result.data),
    };

    // [Cache] Lưu dữ liệu vào redis (TTL 10 phút cho danh sách)
    await setCache(cacheKey, response, 600);

    return response;
  }

  async findById(id: string) {
    // [Cache] Kiểm tra cache theo ID
    const cacheKey = `${this.CACHE_KEY}:id:${id}`;
    const cached = await getCache<CategoryResponseDto>(cacheKey);
    if (cached) return cached;

    const category = await this.categoryRepo.findById(id);
    if (!category) throw new AppError("Không tìm thấy danh mục", 404);

    const response = CategoryResponseDto.from(category);

    // [Cache] Lưu cache chi tiết
    await setCache(cacheKey, response, this.CACHE_TTL);

    return response;
  }

  // [PATCH] Cập nhật danh mục
  async update(id: string, dto: UpdateCategoryDto) {
    const exists = await this.categoryRepo.findById(id);
    if (!exists) throw new AppError("Danh mục không tồn tại", 404);

    const updateData: any = { ...dto };
    if (dto.name)
      updateData.slug = slugify(dto.name, { lower: true, strict: true });

    // Xử lý quan hệ parent
    if (dto.parentId) {
      if (dto.parentId === id)
        throw new AppError("Không thể chọn chính nó làm danh mục cha", 400);
      updateData.parent = { connect: { id: dto.parentId } };
      delete updateData.parentId;
    }

    const updated = await this.categoryRepo.updateById(id, updateData);

    // [Cache] Xóa các cache liên quan để đảm bảo dữ liệu mới
    await Promise.all([
      deleteCache(`${this.CACHE_KEY}:id:${id}`),
      deleteCache(`${this.CACHE_KEY}:slug:${exists.slug}`), // Xóa theo slug cũ
      deleteCacheByPattern(`${this.CACHE_KEY}:all:*`),
    ]);

    return CategoryResponseDto.from(updated!);
  }

  // [DELETE] Xóa mềm
  async delete(id: string) {
    const exists = await this.categoryRepo.findById(id);
    if (!exists) throw new AppError("Danh mục không tồn tại", 404);

    await this.categoryRepo.softDelete(id);

    // [Cache] Xóa sạch các cache liên quan sau khi xóa
    await Promise.all([
      deleteCache(`${this.CACHE_KEY}:id:${id}`),
      deleteCache(`${this.CACHE_KEY}:slug:${exists.slug}`),
      deleteCacheByPattern(`${this.CACHE_KEY}:all:*`),
    ]);
  }
}
