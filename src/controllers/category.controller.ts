import { categoryService } from "@/config/container";
import { normalizeQuery } from "@/utils/query";
import asyncHandler from "@/utils/asyncHandler";
import { Request, Response } from "express";

// POST | /api/v1/categories | Tạo danh mục mới
export const createCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const data = await categoryService.create(req.body);

    res.status(201).json({
      status: "success",
      data,
    });
  },
);

// GET | /api/v1/categories | Lấy danh sách danh mục (Phân trang & Search)
export const getCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const query = normalizeQuery(req.query);
    const result = await categoryService.findAll(query);

    res.status(200).json({
      status: "success",
      results: result.data.length,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
      data: result.data,
    });
  },
);

// GET | /api/v1/categories/:id | Chi tiết một danh mục
export const getCategory = asyncHandler(async (req: Request, res: Response) => {
  const data = await categoryService.findById(req.params.id);

  res.status(200).json({
    status: "success",
    data,
  });
});

// PATCH | /api/v1/categories/:id | Cập nhật thông tin danh mục
export const updateCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const data = await categoryService.update(req.params.id, req.body);

    res.status(200).json({
      status: "success",
      data,
    });
  },
);

// DELETE | /api/v1/categories/:id | Xóa danh mục (Xóa mềm)
export const deleteCategory = asyncHandler(
  async (req: Request, res: Response) => {
    await categoryService.delete(req.params.id);

    // Trả về 204 No Content cho hành động xóa thành công
    res.status(204).json({
      status: "success",
      data: null,
    });
  },
);
