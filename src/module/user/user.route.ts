import { Router } from "express";
import * as userCtrl from "./user.controller";
import validationMiddleware from "@/middleware/validate.middleware";
import {
  CreateUserSchema,
  UpdateUserSchema,
  IdParamSchema,
} from "./user.request";

const router = Router();

// Route collection
router
  .route("/")
  .get(userCtrl.getUsers)
  .post(validationMiddleware(CreateUserSchema), userCtrl.createUser);

// Route theo ID
router
  .route("/:id")
  .get(validationMiddleware(IdParamSchema, "params"), userCtrl.getUser)
  .patch(
    validationMiddleware(IdParamSchema, "params"),
    validationMiddleware(UpdateUserSchema),
    userCtrl.updateUser
  )
  .delete(validationMiddleware(IdParamSchema, "params"), userCtrl.deleteUser);

export default router;