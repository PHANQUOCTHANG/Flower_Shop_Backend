import { reviewService } from "@/config/container";
import { normalizeQuery } from "@/utils/query";
import asyncHandler from "@/utils/asyncHandler";
import { Request, Response } from "express";

// POST | /api/v1/reviews | Tạo đánh giá mới cho sản phẩm
export const createReview = asyncHandler(async (req: any, res: Response) => {
  // Lấy userId từ middleware xác thực (req.user)
  const data = await reviewService.create(req.user.id, req.body);

  res.status(201).json({
    status: "success",
    data,
  });
});

// GET | /api/v1/reviews/product/:productId | Lấy danh sách đánh giá của một sản phẩm
export const getReviewsByProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const query = normalizeQuery(req.query);
    const result = await reviewService.findAll(query, req.params.productId);

    res.status(200).json({
      status: "success",
      results: result.data.length,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
      data: result.data,
    });
  },
);

// DELETE | /api/v1/reviews/:id | Xóa đánh giá (Xóa mềm)
export const deleteReview = asyncHandler(
  async (req: Request, res: Response) => {
    await reviewService.delete(req.params.id);

    // Trả về 204 No Content cho hành động xóa thành công
    res.status(204).json({
      status: "success",
      data: null,
    });
  },
);
