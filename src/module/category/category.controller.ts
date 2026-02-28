import { Request, Response } from "express";
import { categoryService } from "@/config/container";
import { ApiResponse } from "@/utils/apiResponse";
import { normalizeQuery } from "@/utils/query";
import asyncHandler from "@/utils/asyncHandler";

// [POST] /api/v1/categories - Tạo danh mục
export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const data = await categoryService.create(req.body);
  res.status(201).json(ApiResponse.success(data, "Tạo danh mục thành công"));
});

// [GET] /api/v1/categories - Danh sách danh mục
export const getCategories = asyncHandler(async (req: Request, res: Response) => {
  const query = normalizeQuery(req.query);
  const result = await categoryService.findAll(query);
  res.status(200).json(ApiResponse.paginate(result));
});

// [PATCH] /api/v1/categories/:id - Cập nhật danh mục
export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const data = await categoryService.update(req.params.id as string, req.body);
  res.status(200).json(ApiResponse.success(data, "Cập nhật thành công"));
});

// [DELETE] /api/v1/categories/:id - Xóa mềm
export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  await categoryService.delete(req.params.id as string);
  res.status(200).json(ApiResponse.success(null, "Đã xóa danh mục"));
});