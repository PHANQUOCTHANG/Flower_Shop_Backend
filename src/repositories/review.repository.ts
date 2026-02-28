import { BaseQuery, IPaginatedResult } from "@/utils/query";
import { IReview, IReviewDocument } from "@/interface/review.interface";
import Review from "@/models/review.model";
import mongoose from "mongoose";

export interface IReviewRepository {
  create(data: Partial<IReview>): Promise<IReviewDocument>;
  findAll(
    query: BaseQuery,
    filter?: object,
  ): Promise<IPaginatedResult<IReviewDocument>>;
  findById(id: string): Promise<IReviewDocument | null>;
  findOne(filter: object): Promise<IReviewDocument | null>;
  updateById(
    id: string,
    data: Partial<IReview>,
  ): Promise<IReviewDocument | null>;
  deleteById(id: string): Promise<void>;
  calculateAverageRating(
    productId: string,
  ): Promise<{ avgRating: number; totalReviews: number }>;
}

export class ReviewRepository implements IReviewRepository {
  // Tạo đánh giá mới
  async create(data: Partial<IReview>): Promise<IReviewDocument> {
    return Review.create(data);
  }

  // Lấy danh sách kèm phân trang, tìm kiếm và lọc bản ghi chưa xóa
  async findAll(
    query: BaseQuery,
    filter: object = {},
  ): Promise<IPaginatedResult<IReviewDocument>> {
    const { page = 1, limit = 10, sort, search } = query;

    // Filter mặc định loại bỏ đánh giá đã xóa
    const finalFilter: any = { ...filter, deleted: { $ne: true } };
    if (search) {
      finalFilter.comment = { $regex: search, $options: "i" };
    }

    const [data, total] = await Promise.all([
      Review.find(finalFilter)
        .sort(sort || { createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("user", "fullName")
        .populate("product", "name")
        .lean(),
      Review.countDocuments(finalFilter),
    ]);

    return {
      data: data as IReviewDocument[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Tìm theo ID (bỏ qua bản ghi đã xóa)
  async findById(id: string): Promise<IReviewDocument | null> {
    return Review.findOne({ _id: id, deleted: { $ne: true } }).populate(
      "user",
      "fullName",
    );
  }

  // Tìm một bản ghi theo điều kiện lọc
  async findOne(filter: object): Promise<IReviewDocument | null> {
    return Review.findOne({ ...filter, deleted: { $ne: true } }).populate(
      "user",
      "fullName",
    );
  }

  // Cập nhật theo ID kèm kiểm tra schema
  async updateById(
    id: string,
    data: Partial<IReview>,
  ): Promise<IReviewDocument | null> {
    return Review.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }

  // Xóa mềm bằng cách cập nhật flag deleted
  async deleteById(id: string): Promise<void> {
    await Review.findByIdAndUpdate(id, {
      deleted: true,
      deletedAt: new Date(),
    });
  }

  // Tính toán rating trung bình cho sản phẩm bằng Aggregate
  async calculateAverageRating(
    productId: string,
  ): Promise<{ avgRating: number; totalReviews: number }> {
    const stats = await Review.aggregate([
      {
        $match: {
          product: new mongoose.Types.ObjectId(productId),
          deleted: { $ne: true }, // Chỉ tính các đánh giá chưa bị xóa
        },
      },
      {
        $group: {
          _id: "$product",
          avgRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    if (stats.length > 0) {
      return {
        avgRating: Math.round(stats[0].avgRating * 10) / 10, // Làm tròn 1 chữ số thập phân
        totalReviews: stats[0].totalReviews,
      };
    }

    return { avgRating: 0, totalReviews: 0 };
  }
}
