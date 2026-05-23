import AppError from "@/utils/appError";
import { IReviewRepository } from "./review.repository";
import { IOrderService } from "../order/order.service";
import { CreateReviewDto } from "./review.request";
import { ReviewResponseDto } from "./review.response";
import { deleteCacheByPattern } from "@/utils/cache";

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

    // Invalidate Cache (xóa cache sản phẩm để cập nhật rating mới)
    await deleteCacheByPattern(`products:*`);

    return ReviewResponseDto.from(review);
  }

  // [GET] Lấy danh sách đánh giá theo productId
  async getProductReviews(productId: string, query: Record<string, unknown>) {
    const result = await this.reviewRepo.findByProductId(productId, query);
    return { ...result, data: ReviewResponseDto.fromList(result.data) };
  }

  // [GET] Lấy danh sách đánh giá theo slug sản phẩm (dùng cho trang chi tiết)
  async getProductReviewsBySlug(slug: string, query: Record<string, unknown>) {
    const result = await this.reviewRepo.findByProductSlug(slug, query);
    return { ...result, data: ReviewResponseDto.fromList(result.data) };
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
    await deleteCacheByPattern(`products:*`);
  }
}
