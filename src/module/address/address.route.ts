import { Router } from "express";
import * as addressController from "./address.controller";

const addressRouter = Router();

// ─── Routes ────────────────────────────────────────────────────────────────

// GET /addresses - Lấy danh sách tất cả địa chỉ
addressRouter.get("/", addressController.getAddresses);

// GET /addresses/:id - Lấy chi tiết một địa chỉ
addressRouter.get("/:id", addressController.getAddress);

// POST /addresses - Tạo mới một địa chỉ
addressRouter.post("/", addressController.createAddress);

// PATCH /addresses/:id - Cập nhật một địa chỉ
addressRouter.patch("/:id", addressController.updateAddress);

// DELETE /addresses/:id - Xóa một địa chỉ
addressRouter.delete("/:id", addressController.deleteAddress);

// PATCH /addresses/:id/set-default - Đặt địa chỉ làm mặc định
addressRouter.patch("/:id/set-default", addressController.setDefaultAddress);

export default addressRouter;
