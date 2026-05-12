import { Request, Response } from "express";
import { categoryService } from "@/config/container";
import { ApiResponse } from "@/utils/apiResponse";
import { normalizeQuery } from "@/utils/query";
import asyncHandler from "@/utils/asyncHandler";

// [POST] /api/v1/categories - Tạo danh mục mới
export const createCategory = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    // Xử lý ảnh từ middleware upload
    if (req.file) {
      req.body.thumbnailUrl = req.file.path;
    }

    const data = await categoryService.create(req.body);

    return res
      .status(201)
      .json(ApiResponse.success(data, "Tạo danh mục thành công"));
  },
);

// [GET] /api/v1/categories - Lấy danh sách danh mục
export const getCategories = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const query = req.query;
    const result = await categoryService.findAll(query);
    console.log("Query params:", query);

    return res.status(200).json(ApiResponse.paginate(result));
  },
);

// [PATCH] /api/v1/categories/:id - Cập nhật danh mục
export const updateCategory = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    // Ghi đè URL ảnh nếu có upload mới
    if (req.file) {
      req.body.thumbnailUrl = req.file.path;
    }

    const data = await categoryService.update(
      req.params.id as string,
      req.body,
    );

    return res
      .status(200)
      .json(ApiResponse.success(data, "Cập nhật danh mục thành công"));
  },
);

// [DELETE] /api/v1/categories/:id - Xóa danh mục
export const deleteCategory = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    await categoryService.delete(req.params.id as string);

    return res
      .status(200)
      .json(ApiResponse.success(null, "Đã xóa danh mục thành công"));
  },
);
