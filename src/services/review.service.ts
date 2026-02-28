import AppError from "@/utils/appError";
import { IReviewRepository } from "@/repositories/review.repository";
import { IProductRepository } from "@/repositories/product.repository";
import { CreateReviewRequestDto } from "@/dto/request/review.request";
import { IReviewDocument } from "@/interface/review.interface";
import { BaseQuery, IPaginatedResult, normalizeQuery } from "@/utils/query";

export interface IReviewService {
  create(userId: string, dto: CreateReviewRequestDto): Promise<any>;
  findAll(query: any, productId?: string): Promise<any>;
  delete(id: string): Promise<void>;
}

export class ReviewService implements IReviewService {
  constructor(
    private readonly reviewRepo: IReviewRepository,
    private readonly productRepo: IProductRepository,
  ) {}

  // Tạo đánh giá và cập nhật lại điểm trung bình của sản phẩm
  async create(userId: string, dto: CreateReviewRequestDto): Promise<any> {
    // Kiểm tra xem người dùng đã đánh giá sản phẩm này chưa
    const existed = await this.reviewRepo.findOne({
      user: userId,
      product: dto.product,
    });
    if (existed) throw new AppError("Bạn đã đánh giá sản phẩm này rồi", 400);

    // Lưu đánh giá mới
    const review = await this.reviewRepo.create({ ...dto, user: userId });

    // Tính toán lại rating trung bình và số lượng đánh giá
    const stats = await this.reviewRepo.calculateAverageRating(dto.product);

    // Cập nhật thông tin vào bảng Product
    await this.productRepo.updateById(dto.product, {
      rating: stats.avgRating,
      amountBuy: stats.totalReviews, // Số lượng đánh giá thực tế
    });

    return this.mapToResponse(review);
  }

  // Lấy danh sách đánh giá kèm filter sản phẩm (nếu có)
  async findAll(query: any, productId?: string): Promise<any> {
    const normalizedQuery = normalizeQuery(query);
    const filter = productId ? { product: productId } : {};

    const result = await this.reviewRepo.findAll(normalizedQuery, filter);

    return {
      ...result,
      data: result.data.map((rev: any) => this.mapToResponse(rev)),
    };
  }

  // Xóa đánh giá và cập nhật lại rating cho sản phẩm
  async delete(id: string): Promise<void> {
    const review = await this.reviewRepo.findById(id);
    if (!review) throw new AppError("Đánh giá không tồn tại", 404);

    const productId = review.product.toString();

    // Gọi xóa mềm từ Repository
    await this.reviewRepo.deleteById(id);

    // Tính toán lại rating trung bình sau khi một đánh giá bị ẩn
    const stats = await this.reviewRepo.calculateAverageRating(productId);

    await this.productRepo.updateById(productId, {
      rating: stats.avgRating,
      amountBuy: stats.totalReviews,
    });
  }

  // Chuyển đổi dữ liệu sang Response DTO sạch
  private mapToResponse(review: IReviewDocument): any {
    return {
      id: review._id || review.id,
      user: review.user,
      product: review.product.toString(),
      rating: review.rating,
      comment: review.comment || "",
      images: review.images || [],
      createdAt: review.createdAt,
    };
  }
}
