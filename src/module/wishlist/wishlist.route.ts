import { Router } from "express";
import { WishlistController } from "./wishlist.controller";

const router = Router();
const controller = new WishlistController();

router.get("/", controller.getWishlist);
router.get("/ids", controller.getWishlistIds);
router.post("/toggle", controller.toggleWishlist);

export default router;
