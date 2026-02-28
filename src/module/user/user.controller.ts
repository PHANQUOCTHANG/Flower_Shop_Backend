import { Request, Response } from "express";
import asyncHandler from "@/utils/asyncHandler";
import { ApiResponse } from "@/utils/apiResponse";
import { userService } from "@/config/container";
import { normalizeQuery } from "@/utils/query";

/**
 * User Controller
 * Xử lý HTTP layer, không chứa business logic
 */

// [POST] /api/v1/users - Tạo người dùng
export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const data = await userService.create(req.body);

  return res
    .status(201)
    .json(ApiResponse.success(data, "Tạo người dùng thành công"));
});

// [GET] /api/v1/users - Lấy danh sách người dùng (phân trang)
export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const query = normalizeQuery(req.query);

  const result = await userService.findAll(query);

  return res.status(200).json(ApiResponse.paginate(result));
});

// [GET] /api/v1/users/:id - Lấy chi tiết người dùng
export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const data = await userService.findById(req.params.id as string);

  return res.status(200).json(ApiResponse.success(data));
});

// [PATCH] /api/v1/users/:id - Cập nhật người dùng
export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const data = await userService.update(req.params.id as string, req.body);

  return res.status(200).json(ApiResponse.success(data, "Cập nhật thành công"));
});

// [DELETE] /api/v1/users/:id - Xóa mềm người dùng
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  await userService.delete(req.params.id as string);

  return res.status(200).json(ApiResponse.success(null, "Đã xóa người dùng"));
});
