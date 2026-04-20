import { Router } from "express";
import * as userCtrl from "./user.controller";
import validationMiddleware from "@/middleware/validate.middleware";
import { requireRole } from "@/middleware/auth.middleware";
import {
  CreateUserSchema,
  UpdateUserSchema,
  IdParamSchema,
} from "./user.request";

const router = Router();

// [GET] danh sách & [POST] tạo user (chỉ ADMIN)
router
  .route("/")
  .get(requireRole("ADMIN"), userCtrl.getUsers)
  .post(
    requireRole("ADMIN"),
    validationMiddleware(CreateUserSchema),
    userCtrl.createUser,
  );

// [GET] chi tiết & [PATCH] cập nhật & [DELETE] xóa (chỉ ADMIN)
router
  .route("/:id")
  .get(requireRole("ADMIN"), validationMiddleware(IdParamSchema, "params"), userCtrl.getUser)
  .patch(
    requireRole("ADMIN"),
    validationMiddleware(IdParamSchema, "params"),
    validationMiddleware(UpdateUserSchema),
    userCtrl.updateUser,
  )
  .delete(
    requireRole("ADMIN"),
    validationMiddleware(IdParamSchema, "params"),
    userCtrl.deleteUser,
  );

export default router;
