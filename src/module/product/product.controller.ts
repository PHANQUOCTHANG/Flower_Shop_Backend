import { Request, Response } from "express";
import { productService, imageService } from "@/config/container";
import { ApiResponse } from "@/utils/apiResponse";
import asyncHandler from "@/utils/asyncHandler";
import { normalizeQueryProduct } from "@/module/product/product.type";

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Trích xuất files theo field name.
 * Hỗ trợ cả hai kiểu req.files từ multer:
 *   - .array()  → Express.Multer.File[]           (lọc theo fieldname)
 *   - .fields() → { [field]: Express.Multer.File[] }
 */
function extractFiles(req: Request, field: string): Express.Multer.File[] {
  const files = req.files;
  if (!files) return [];
  if (Array.isArray(files)) return files.filter((f) => f.fieldname === field);
  return files[field] ?? [];
}

// ─── Controllers ──────────────────────────────────────────────────────────────

// [POST] /api/v1/products
export const createProduct = asyncHandler(
  async (req: Request, res: Response) => {
    // Gallery images — middleware đã upload lên Cloudinary
    const galleryFiles = extractFiles(req, "images");
    const images =
      galleryFiles.length > 0
        ? imageService.convertUploadedFilesToImages(galleryFiles)
        : [];

    // Thumbnail — lấy secure_url từ file.path (đã được middleware gán)
    const [thumbnailFile] = extractFiles(req, "thumbnail");
    const thumbnailUrl = thumbnailFile?.path ?? undefined;

    const data = await productService.create({
      ...req.body,
      ...(thumbnailUrl && { thumbnailUrl }),
      images,
    });

    return res
      .status(201)
      .json(ApiResponse.success(data, "Tạo sản phẩm thành công"));
  },
);

// [GET] /api/v1/products
export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const query = normalizeQueryProduct(req.query);
  const result = await productService.findAll(query);
  return res.status(200).json(ApiResponse.paginate(result));
});

// [GET] /api/v1/products/:id
export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const data = await productService.findById(req.params.id as string);
  return res.status(200).json(ApiResponse.success(data));
});

// [GET] /api/v1/products/slug/:slug
export const getProductBySlug = asyncHandler(
  async (req: Request, res: Response) => {
    const data = await productService.findBySlug(req.params.slug as string);
    return res.status(200).json(ApiResponse.success(data));
  },
);

// [PATCH] /api/v1/products/:id
export const updateProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const galleryFiles = extractFiles(req, "images");
    const updateBody: Record<string, any> = { ...req.body };

    if (galleryFiles.length > 0) {
      const existing = await productService.findById(req.params.id as string);

      // Xóa ảnh cũ trên Cloudinary
      const oldPublicIds =
        existing.images?.map((img: any) => img.publicId ?? img.filename) ?? [];
      if (oldPublicIds.length > 0) {
        await imageService.deleteMultiple(oldPublicIds);
      }

      updateBody.images =
        imageService.convertUploadedFilesToImages(galleryFiles);
    }

    // Cập nhật thumbnail nếu có file mới
    const [thumbnailFile] = extractFiles(req, "thumbnail");
    if (thumbnailFile?.path) {
      updateBody.thumbnailUrl = thumbnailFile.path;
    }

    const data = await productService.update(req.params.id as string, updateBody);
    return res
      .status(200)
      .json(ApiResponse.success(data, "Cập nhật thành công"));
  },
);

// [DELETE] /api/v1/products/:id
export const deleteProduct = asyncHandler(
  async (req: Request, res: Response) => {
    await productService.delete(req.params.id as string);
    return res.status(200).json(ApiResponse.success(null, "Đã xóa sản phẩm"));
  },
);
