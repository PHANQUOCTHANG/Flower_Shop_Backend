import slugify from "slugify";
import AppError from "@/utils/appError";
import { ICategoryRepository } from "./category.repository";
import { CategoryResponseDto } from "./category.response";
import { CreateCategoryDto, UpdateCategoryDto } from "./category.request";

export interface ICategoryService {
  create(dto: CreateCategoryDto): Promise<CategoryResponseDto>;
  findAll(query?: any): Promise<any>;
  findById(id: string): Promise<CategoryResponseDto>;
  update(id: string, dto: UpdateCategoryDto): Promise<CategoryResponseDto>;
  delete(id: string): Promise<void>;
}

export class CategoryService implements ICategoryService {
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
    return CategoryResponseDto.from(category);
  }

  async findAll(query: any) {
    const result = await this.categoryRepo.findAll(query);
    return { ...result, data: CategoryResponseDto.fromList(result.data) };
  }

  async findById(id: string) {
    const category = await this.categoryRepo.findById(id);
    if (!category) throw new AppError("Không tìm thấy danh mục", 404);
    return CategoryResponseDto.from(category);
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
    return CategoryResponseDto.from(updated!);
  }

  // [DELETE] Xóa mềm
  async delete(id: string) {
    const exists = await this.categoryRepo.findById(id);
    if (!exists) throw new AppError("Danh mục không tồn tại", 404);
    await this.categoryRepo.softDelete(id);
  }
}
