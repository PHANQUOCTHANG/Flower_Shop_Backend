import { Router } from "express";
import * as cartController from "./cart.controller";
import validationMiddleware from "@/middleware/validate.middleware";
import { addToCartSchema, updateQuantitySchema } from "./cart.request";

const router = Router();
router.get("/", cartController.getMyCart);
router.post("/add", validationMiddleware(addToCartSchema), cartController.addToCart);
router.patch("/update", validationMiddleware(updateQuantitySchema), cartController.updateCartQuantity);
router.delete("/items/:productId", cartController.removeItemFromCart);
router.delete("/clear", cartController.clearMyCart);

export default router;