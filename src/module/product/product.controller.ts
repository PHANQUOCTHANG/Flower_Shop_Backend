import { Request, Response } from "express";
import { productService } from "@/config/container";
import { ApiResponse } from "@/utils/apiResponse";
import asyncHandler from "@/utils/asyncHandler";
import { normalizeQueryProduct } from "@/module/product/product.type";

// [POST] /api/v1/products - Tạo sản phẩm
export const createProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const data = await productService.create(req.body);
    return res
      .status(201)
      .json(ApiResponse.success(data, "Tạo sản phẩm thành công"));
  },
);

// [GET] /api/v1/products - Lấy danh sách sản phẩm
export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const query = normalizeQueryProduct(req.query);
  const result = await productService.findAll(query);
  return res.status(200).json(ApiResponse.paginate(result));
});

// [GET] /api/v1/products/:id - Chi tiết sản phẩm
export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const data = await productService.findById(req.params.id as string);
  return res.status(200).json(ApiResponse.success(data));
});

// [GET] /api/v1/products/:id - Chi tiết sản phẩm
export const getProductBySlug = asyncHandler(async (req: Request, res: Response) => {
  const data = await productService.findBySlug(req.params.slug as string);
  return res.status(200).json(ApiResponse.success(data));
});

// [PATCH] /api/v1/products/:id - Cập nhật sản phẩm
export const updateProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const data = await productService.update(req.params.id as string, req.body);
    return res
      .status(200)
      .json(ApiResponse.success(data, "Cập nhật thành công"));
  },
);

// [DELETE] /api/v1/products/:id - Xóa mềm sản phẩm
export const deleteProduct = asyncHandler(
  async (req: Request, res: Response) => {
    await productService.delete(req.params.id as string);
    return res.status(200).json(ApiResponse.success(null, "Đã xóa sản phẩm"));
  },
);
