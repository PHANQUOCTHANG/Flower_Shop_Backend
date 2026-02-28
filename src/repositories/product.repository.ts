import { BaseQuery, IPaginatedResult } from "@/utils/query";
import { IProduct, IProductDocument } from "@/interface/product.interface";
import Product from "@/models/product.model";
import { UpdateQuery } from "mongoose";

export interface IProductRepository {
  create(data: Partial<IProduct>): Promise<IProductDocument>;
  findAll(query: BaseQuery): Promise<IPaginatedResult<IProductDocument>>;
  findById(id: string): Promise<IProductDocument | null>;
  findBySlug(slug: string): Promise<IProductDocument | null>;
  updateById(
    id: string,
    data: UpdateQuery<IProduct>,
  ): Promise<IProductDocument | null>;
  deleteById(id: string): Promise<void>;
}

export class ProductRepository implements IProductRepository {
  // Tạo sản phẩm mới
  async create(data: Partial<IProduct>): Promise<IProductDocument> {
    return Product.create(data);
  }

  // Lấy danh sách kèm phân trang, tìm kiếm và populate category
  async findAll(query: BaseQuery): Promise<IPaginatedResult<IProductDocument>> {
    const { page = 1, limit = 10, search, sort } = query;

    // Chỉ lấy sản phẩm chưa bị xóa mềm
    const filter: any = { deleted: { $ne: true } };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { nameNoAccent: { $regex: search, $options: "i" } },
      ];
    }

    const [data, total] = await Promise.all([
      Product.find(filter)
        .sort(sort || { createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("category")
        .lean(), // Tối ưu hiệu năng truy vấn
      Product.countDocuments(filter),
    ]);

    return {
      data: data as IProductDocument[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Tìm sản phẩm theo ID (loại bỏ bản ghi đã xóa)
  async findById(id: string): Promise<IProductDocument | null> {
    return Product.findOne({ _id: id, deleted: { $ne: true } }).populate(
      "category",
    );
  }

  // Tìm sản phẩm theo Slug (loại bỏ bản ghi đã xóa)
  async findBySlug(slug: string): Promise<IProductDocument | null> {
    return Product.findOne({ slug, deleted: { $ne: true } }).populate(
      "category",
    );
  }

  // Cập nhật sản phẩm theo ID kèm kiểm tra schema
  async updateById(
    id: string,
    data: UpdateQuery<IProduct>,
  ): Promise<IProductDocument | null> {
    return Product.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }

  // Xóa mềm bằng cách cập nhật flag deleted
  async deleteById(id: string): Promise<void> {
    await Product.findByIdAndUpdate(id, {
      deleted: true,
      deletedAt: new Date(),
    });
  }
}
