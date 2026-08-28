import { Request, Response } from "express";
import { wishlistService } from "@/config/container";
import { ApiResponse } from "@/utils/apiResponse";
import asyncHandler from "@/utils/asyncHandler";
import { getUserId } from "@/helpers/getUserId";

// [GET] /api/v1/wishlist
// Lấy danh sách sản phẩm yêu thích (có phân trang)
export const getWishlist = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10));
  const limit = Math.min(40, Math.max(1, parseInt(String(req.query.limit || "8"), 10)));

  const result = await wishlistService.getWishlist(userId, page, limit);
  return res.status(200).json({
    status: "success",
    data: result.items,
    meta: result.meta,
  });
});

// [GET] /api/v1/wishlist/ids
// Lấy danh sách productId để check trạng thái yêu thích nhanh trên FE
export const getWishlistIds = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const ids = await wishlistService.getWishlistProductIds(userId);
  return res.status(200).json(ApiResponse.success(ids));
});

// [POST] /api/v1/wishlist/toggle
// Thêm hoặc bỏ sản phẩm khỏi wishlist
export const toggleWishlist = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { productId } = req.body;
  const result = await wishlistService.toggleWishlist(userId, productId);
  return res.status(200).json(
    ApiResponse.success(result, result.added ? "Đã thêm vào yêu thích" : "Đã bỏ khỏi yêu thích")
  );
});
