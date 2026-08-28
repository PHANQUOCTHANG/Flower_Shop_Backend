import AppError from "@/utils/appError";
import { IReviewRepository } from "./review.repository";
import { IOrderService } from "../order/order.service";
import { CreateReviewDto } from "./review.request";
import { ReviewResponseDto } from "./review.response";
import {
  getCache,
  setCache,
  deleteCacheByPattern,
} from "@/utils/cache";

// Extend DTO với media — do controller inject sau khi multer upload xong
interface ReviewMediaItem {
  url: string;
  publicId: string;
  type: "image" | "video";
}

interface CreateReviewInput extends CreateReviewDto {
  media?: ReviewMediaItem[];
}

export interface IReviewService {
  createReview(
    userId: string,
    input: CreateReviewInput,
  ): Promise<ReviewResponseDto>;
  getProductReviews(
    productId: string,
    query: Record<string, unknown>,
  ): Promise<any>;
  getProductReviewsBySlug(
    slug: string,
    query: Record<string, unknown>,
  ): Promise<any>;
  deleteReview(
    userId: string,
    reviewId: string,
    userRole: string,
  ): Promise<void>;
}

export class ReviewService implements IReviewService {
  private readonly CACHE_KEY = "reviews";
  private readonly CACHE_TTL = 180; // 3 phút — review có thể cập nhật rating

  constructor(
    private readonly reviewRepo: IReviewRepository,
    private readonly orderService: IOrderService,
  ) {}

  // [POST] Tạo đánh giá — nhận cả file media đã được upload qua multer
  async createReview(
    userId: string,
    input: CreateReviewInput,
  ): Promise<ReviewResponseDto> {
    // Kiểm tra điều kiện mua hàng
    const hasPurchased = await this.reviewRepo.checkUserPurchased(
      userId,
      input.productId,
    );
    if (!hasPurchased) {
      throw new AppError(
        "Bạn cần hoàn tất mua sản phẩm này để có thể đánh giá",
        403,
      );
    }

    // Kiểm tra đã review sản phẩm này chưa — ngăn duplicate review
    const alreadyReviewed = await this.reviewRepo.checkUserAlreadyReviewed(
      userId,
      input.productId,
    );
    if (alreadyReviewed) {
      throw new AppError(
        "Bạn đã đánh giá sản phẩm này rồi. Xóa đánh giá cũ nếu muốn đánh giá lại.",
        409,
      );
    }

    // Lưu Review (Prisma nested write tạo media cùng lúc)
    const review = await this.reviewRepo.create(userId, input);

    // Cập nhật trạng thái đã đánh giá của OrderItem (nếu có orderId)
    // Cache của order detail và list sẽ được xử lý trong hàm updateOrderItemReviewStatus
    if (review.orderId) {
      await this.orderService.updateOrderItemReviewStatus(
        review.orderId,
        review.productId,
        true,
      );
    }

    // Invalidate Cache — xóa cache sản phẩm (rating thay đổi) và cache review của sản phẩm này
    await Promise.all([
      deleteCacheByPattern(`products:*`),
      deleteCacheByPattern(`${this.CACHE_KEY}:product:${input.productId}:*`),
    ]);

    return ReviewResponseDto.from(review);
  }

  // [GET] Lấy danh sách đánh giá theo productId
  async getProductReviews(productId: string, query: Record<string, unknown>) {
    const cacheKey = `${this.CACHE_KEY}:product:${productId}:${JSON.stringify(query)}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) return cached;

    const result = await this.reviewRepo.findByProductId(productId, query);
    const response = { ...result, data: ReviewResponseDto.fromList(result.data) };

    await setCache(cacheKey, response, this.CACHE_TTL);
    return response;
  }

  // [GET] Lấy danh sách đánh giá theo slug sản phẩm (dùng cho trang chi tiết)
  async getProductReviewsBySlug(slug: string, query: Record<string, unknown>) {
    const cacheKey = `${this.CACHE_KEY}:slug:${slug}:${JSON.stringify(query)}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) return cached;

    const result = await this.reviewRepo.findByProductSlug(slug, query);
    const response = { ...result, data: ReviewResponseDto.fromList(result.data) };

    await setCache(cacheKey, response, this.CACHE_TTL);
    return response;
  }

  // [DELETE] Xóa đánh giá (Người dùng tự xóa hoặc Admin xóa)
  async deleteReview(
    userId: string,
    reviewId: string,
    userRole: string,
  ): Promise<void> {
    const review = await this.reviewRepo.findById(reviewId);

    if (!review) {
      throw new AppError("Đánh giá không tồn tại", 404);
    }

    // Chỉ chủ nhân review hoặc ADMIN/STAFF mới có quyền xóa
    if (review.userId !== userId && userRole === "CUSTOMER") {
      throw new AppError("Bạn không có quyền xóa đánh giá này", 403);
    }

    await this.reviewRepo.softDelete(reviewId);

    // Xóa cache sản phẩm (rating thay đổi) và cache review liên quan
    await Promise.all([
      deleteCacheByPattern(`products:*`),
      deleteCacheByPattern(`${this.CACHE_KEY}:product:${review.productId}:*`),
    ]);
  }
}

