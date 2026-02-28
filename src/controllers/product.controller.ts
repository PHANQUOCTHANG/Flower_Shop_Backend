import { productService } from "@/config/container";
import { normalizeQuery } from "@/utils/query";
import asyncHandler from "@/utils/asyncHandler";
import { Request, Response } from "express";

// POST | /api/v1/products | Tạo sản phẩm mới
export const createProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const data = await productService.create(req.body);

    res.status(201).json({
      status: "success",
      data,
    });
  },
);

// GET | /api/v1/products | Lấy danh sách sản phẩm (Phân trang & Search)
export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const query = normalizeQuery(req.query);
  const result = await productService.findAll(query);

  res.status(200).json({
    status: "success",
    results: result.data.length,
    total: result.total,
    page: result.page,
    totalPages: result.totalPages,
    data: result.data,
  });
});

// GET | /api/v1/products/:id | Chi tiết sản phẩm theo ID
export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const data = await productService.findById(req.params.id);

  res.status(200).json({
    status: "success",
    data,
  });
});

// GET | /api/v1/products/slug/:slug | Chi tiết sản phẩm theo Slug
export const getProductBySlug = asyncHandler(
  async (req: Request, res: Response) => {
    const data = await productService.findBySlug(req.params.slug);

    res.status(200).json({
      status: "success",
      data,
    });
  },
);

// PATCH | /api/v1/products/:id | Cập nhật thông tin sản phẩm
export const updateProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const data = await productService.update(req.params.id, req.body);

    res.status(200).json({
      status: "success",
      data,
    });
  },
);

// DELETE | /api/v1/products/:id | Xóa sản phẩm (Xóa mềm)
export const deleteProduct = asyncHandler(
  async (req: Request, res: Response) => {
    await productService.delete(req.params.id);

    res.status(204).json({
      status: "success",
      data: null,
    });
  },
);
