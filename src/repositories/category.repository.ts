import { BaseQuery, IPaginatedResult } from "@/utils/query";
import { ICategory, ICategoryDocument } from "@/interface/category.interface";
import Category from "@/models/category.model";

export interface ICategoryRepository {
  create(data: Partial<ICategory>): Promise<ICategoryDocument>;
  findAll(query: BaseQuery): Promise<IPaginatedResult<ICategoryDocument>>;
  findById(id: string): Promise<ICategoryDocument | null>;
  findByName(name: string): Promise<ICategoryDocument | null>;
  updateById(
    id: string,
    data: Partial<ICategory>,
  ): Promise<ICategoryDocument | null>;
  deleteById(id: string): Promise<void>;
}

export class CategoryRepository implements ICategoryRepository {
  // Tạo danh mục mới
  async create(data: Partial<ICategory>): Promise<ICategoryDocument> {
    return Category.create(data);
  }

  // Lấy danh sách kèm phân trang, tìm kiếm và lọc bản ghi đã xóa
  async findAll(
    query: BaseQuery,
  ): Promise<IPaginatedResult<ICategoryDocument>> {
    const { page = 1, limit = 10, search, sort } = query;

    // Chỉ lấy danh mục chưa bị xóa mềm
    const filter: any = { deleted: { $ne: true } };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { nameNoAccent: { $regex: search, $options: "i" } },
      ];
    }

    const [data, total] = await Promise.all([
      Category.find(filter)
        .sort(sort || { createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(), // Tối ưu hiệu năng
      Category.countDocuments(filter),
    ]);

    return {
      data: data as ICategoryDocument[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Tìm danh mục theo ID (bỏ qua bản ghi đã xóa)
  async findById(id: string): Promise<ICategoryDocument | null> {
    return Category.findOne({ _id: id, deleted: { $ne: true } });
  }

  // Tìm danh mục theo tên (kiểm tra trùng lặp)
  async findByName(name: string): Promise<ICategoryDocument | null> {
    return Category.findOne({ name, deleted: { $ne: true } });
  }

  // Cập nhật danh mục theo ID
  async updateById(
    id: string,
    data: Partial<ICategory>,
  ): Promise<ICategoryDocument | null> {
    return Category.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }

  // Xóa mềm danh mục
  async deleteById(id: string): Promise<void> {
    await Category.findByIdAndUpdate(id, {
      deleted: true,
      deletedAt: new Date(),
    });
  }
}
