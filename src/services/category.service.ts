import AppError from "@/utils/appError";
import { ICategoryRepository } from "@/repositories/category.repository";
import {
  CreateCategoryRequestDto,
  UpdateCategoryRequestDto,
} from "@/dto/request/category.request";
import { ICategoryDocument } from "@/interface/category.interface";
import { BaseQuery, IPaginatedResult, normalizeQuery } from "@/utils/query";
import slugify from "slugify";

export interface ICategoryService {
  create(dto: CreateCategoryRequestDto): Promise<any>;
  findAll(query: any): Promise<any>;
  findById(id: string): Promise<any>;
  update(id: string, dto: UpdateCategoryRequestDto): Promise<any>;
  delete(id: string): Promise<void>;
}

export class CategoryService implements ICategoryService {
  constructor(private readonly categoryRepo: ICategoryRepository) {}

  // Tạo mới, kiểm tra trùng tên và xử lý slug
  async create(dto: CreateCategoryRequestDto): Promise<any> {
    const existed = await this.categoryRepo.findByName(dto.name);
    if (existed) throw new AppError("Tên danh mục đã tồn tại", 400);

    const slug = slugify(dto.name, { lower: true, strict: true });
    const nameNoAccent = dto.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const category = await this.categoryRepo.create({
      ...dto,
      slug,
      nameNoAccent,
    });
    return this.mapToResponse(category);
  }

  // Lấy danh sách kèm chuẩn hóa query
  async findAll(query: any): Promise<any> {
    const normalizedQuery = normalizeQuery(query);
    const result = await this.categoryRepo.findAll(normalizedQuery);
    return {
      ...result,
      data: result.data.map((cat: any) => this.mapToResponse(cat)),
    };
  }

  // Tìm chi tiết theo ID
  async findById(id: string): Promise<any> {
    const category = await this.categoryRepo.findById(id);
    if (!category) throw new AppError("Không tìm thấy danh mục", 404);
    return this.mapToResponse(category);
  }

  // Cập nhật thông tin và làm mới slug nếu đổi tên
  async update(id: string, dto: UpdateCategoryRequestDto): Promise<any> {
    const updateData: any = { ...dto };
    if (dto.name) {
      updateData.slug = slugify(dto.name, { lower: true, strict: true });
      updateData.nameNoAccent = dto.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    }

    const category = await this.categoryRepo.updateById(id, updateData);
    if (!category)
      throw new AppError("Không tìm thấy danh mục để cập nhật", 404);
    return this.mapToResponse(category);
  }

  // Thực hiện xóa mềm thông qua Repository
  async delete(id: string): Promise<void> {
    const category = await this.categoryRepo.findById(id);
    if (!category) throw new AppError("Không tìm thấy danh mục để xóa", 404);

    await this.categoryRepo.deleteById(id);
  }

  // Ánh xạ dữ liệu trả về sạch sẽ
  private mapToResponse(category: ICategoryDocument): any {
    return {
      id: category._id || category.id,
      name: category.name,
      slug: category.slug,
      images: category.images || [],
      image: category.image || "",
      description: category.description || "",
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }
}
