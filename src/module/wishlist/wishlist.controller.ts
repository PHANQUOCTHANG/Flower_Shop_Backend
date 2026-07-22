import { NextFunction, Request, Response } from "express";
import { WishlistService } from "./wishlist.service";
import { ApiResponse } from "@/utils/apiResponse";

export class WishlistController {
  private service = new WishlistService();

  getWishlist = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const page = Math.max(1, parseInt(String(req.query.page || "1"), 10));
      const limit = Math.min(40, Math.max(1, parseInt(String(req.query.limit || "8"), 10)));
      
      const result = await this.service.getWishlist(userId, page, limit);
      res.status(200).json({
        status: "success",
        data: result.items,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  };

  getWishlistIds = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const ids = await this.service.getWishlistProductIds(userId);
      res.status(200).json(ApiResponse.success(ids));
    } catch (error) {
      next(error);
    }
  };

  toggleWishlist = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { productId } = req.body;
      const result = await this.service.toggleWishlist(userId, productId);
      res.status(200).json(ApiResponse.success(result, result.added ? "Đã thêm vào yêu thích" : "Đã bỏ khỏi yêu thích"));
    } catch (error) {
      next(error);
    }
  };
}
