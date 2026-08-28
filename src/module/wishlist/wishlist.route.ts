import { Router } from "express";
import * as wishlistController from "./wishlist.controller";

const router = Router();

// requireAuth đã được apply tại index.route.ts (app.use("/wishlist", requireAuth, wishlistRoute))
// nên không cần khai báo lại ở đây

// Lấy danh sách sản phẩm yêu thích (có phân trang)
router.get("/", wishlistController.getWishlist);

// Lấy danh sách productId (để FE check trạng thái yêu thích)
router.get("/ids", wishlistController.getWishlistIds);

// Toggle thêm/xóa khỏi wishlist
router.post("/toggle", wishlistController.toggleWishlist);

export default router;
