import { Request, Response } from "express";
import { reviewService, reviewImageService } from "@/config/container";
import { ApiResponse } from "@/utils/apiResponse";
import asyncHandler from "@/utils/asyncHandler";
import { getUserId } from "@/helpers/getUserId";

// [POST] /api/v1/reviews
// Khách hàng gửi đánh giá — upload file và tạo review trong cùng 1 request (giống product)
export const createReview = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = getUserId(req);

    // Xử lý file media nếu có (multer đã upload lên Cloudinary qua middleware)
    const files = req.files as Express.Multer.File[] | undefined;
    const media =
      files && files.length > 0
        ? reviewImageService.convertUploadedFilesToMedia(files)
        : undefined;

    const data = await reviewService.createReview(userId, {
      ...req.body,
      ...(media && { media }),
    });

    return res
      .status(201)
      .json(ApiResponse.success(data, "Đánh giá của bạn đã được ghi lại"));
  },
);

// [GET] /api/v1/reviews/product/:productId
// Lấy danh sách đánh giá theo productId
export const getProductReviews = asyncHandler(
  async (req: Request, res: Response) => {
    const { productId } = req.params as { productId: string };
    const result = await reviewService.getProductReviews(productId, req.query);

    return res.status(200).json(ApiResponse.paginate(result));
  },
);

// [GET] /api/v1/reviews/product/slug/:slug
// Lấy đánh giá theo slug sản phẩm (dùng cho trang chi tiết — không cần biết productId)
export const getReviewsByProductSlug = asyncHandler(
  async (req: Request, res: Response) => {
    const { slug } = req.params as { slug: string };
    const result = await reviewService.getProductReviewsBySlug(slug, req.query);

    return res.status(200).json(ApiResponse.paginate(result));
  },
);

// [DELETE] /api/v1/reviews/:id
// Xóa đánh giá (Người dùng tự xóa hoặc Admin xóa)
export const deleteReview = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const userRole = req.user?.role || "CUSTOMER";
    const reviewId = req.params.id as string;

    await reviewService.deleteReview(userId, reviewId, userRole);

    return res
      .status(200)
      .json(ApiResponse.success(null, "Xóa đánh giá thành công"));
  },
);
