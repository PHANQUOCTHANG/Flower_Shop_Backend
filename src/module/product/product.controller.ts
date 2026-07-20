import { Request, Response } from "express";
import { productService, imageService } from "@/config/container";
import { ApiResponse } from "@/utils/apiResponse";
import asyncHandler from "@/utils/asyncHandler";
import { normalizeQueryProduct } from "@/module/product/product.type";

// Trích xuất file từ request theo field name
function extractFiles(req: Request, field: string): Express.Multer.File[] {
  const files = req.files;
  if (!files) return [];
  if (Array.isArray(files)) return files.filter((f) => f.fieldname === field);
  return files[field] ?? [];
}

// [POST] /api/v1/products - Tạo sản phẩm mới
export const createProduct = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {

    // Xử lý ảnh gallery từ middleware upload
    const galleryFiles = extractFiles(req, "images");
    const images =
      galleryFiles.length > 0
        ? imageService.convertUploadedFilesToImages(galleryFiles)
        : [];

    // Xử lý ảnh thumbnail
    const [thumbnailFile] = extractFiles(req, "thumbnail");
    const thumbnailUrl = thumbnailFile?.path ?? undefined;
    const thumbnailPublicId = thumbnailFile?.filename ?? undefined;

    // Gọi service tạo sản phẩm
    const data = await productService.create({
      ...req.body,
      ...(thumbnailUrl && { thumbnailUrl }),
      ...(thumbnailPublicId && { thumbnailPublicId }),
      images,
    });

    return res
      .status(201)
      .json(ApiResponse.success(data, "Tạo sản phẩm thành công"));
  },
);

// [GET] /api/v1/products - Lấy danh sách sản phẩm
export const getProducts = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const query = normalizeQueryProduct(req.query);
    const result = await productService.findAll(query);
    return res.status(200).json(ApiResponse.paginate(result));
  },
);

// [GET] /api/v1/products/:id - Lấy chi tiết sản phẩm theo ID
export const getProduct = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const data = await productService.findById(req.params.id as string);
    return res.status(200).json(ApiResponse.success(data));
  },
);

// [GET] /api/v1/products/grouped-by-category - Lấy sản phẩm gom theo danh mục
export const getProductsGroupedByCategory = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const limit = parseInt(req.query.limit as string) || 20;
    const data = await productService.findGroupedByCategory(limit);
    return res.status(200).json(ApiResponse.success(data));
  },
);


// [GET] /api/v1/products/slug/:slug - Lấy sản phẩm theo slug
export const getProductBySlug = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const data = await productService.findBySlug(req.params.slug as string);
    return res.status(200).json(ApiResponse.success(data));
  },
);

// [PATCH] /api/v1/products/:id - Cập nhật sản phẩm
export const updateProduct = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    const galleryFiles = extractFiles(req, "images");
    const {
      thumbnailEmpty = false,        
      deletedImageIds = [],
      ...updateBody
    } = req.body;

    const productId = req.params.id as string;
    const existing = await productService.findById(productId);

    // Cập nhật gallery images nếu có ảnh mới hoặc có ảnh bị xóa
    if (galleryFiles.length > 0 || deletedImageIds.length > 0) {
      // Xóa ảnh cũ đã bị xóa trên giao diện
      const oldPublicIds =
        existing.images
          ?.filter((img: any) => deletedImageIds.includes(img.id))
          .map((img: any) => img.publicId) ?? [];

      if (oldPublicIds.length > 0) {
        await imageService.deleteMultiple(oldPublicIds);
      }

      // Giữ lại ảnh chưa bị xóa và thêm ảnh mới
      const remainingImages = existing.images?.filter(
        (img: any) => !deletedImageIds.includes(img.id),
      );

      updateBody.images = imageService.convertUploadedFilesToImages([
        ...remainingImages,
        ...galleryFiles,
      ]);
    }

    // Cập nhật thumbnail
    const [thumbnailFile] = extractFiles(req, "thumbnail");

    if ((thumbnailFile?.path && thumbnailFile?.filename) || thumbnailEmpty) {
      // Xóa thumbnail cũ nếu có
      if (existing?.thumbnailPublicId) {
        await imageService.deleteMultiple([existing.thumbnailPublicId]);
      }

      if (thumbnailEmpty) {
        updateBody.thumbnailUrl = null;
        updateBody.thumbnailPublicId = null;
      } else {
        updateBody.thumbnailUrl = thumbnailFile.path;
        updateBody.thumbnailPublicId = thumbnailFile.filename;
      }
    }

    // Thực hiện cập nhật
    const data = await productService.update(productId, updateBody);

    return res
      .status(200)
      .json(ApiResponse.success(data, "Cập nhật sản phẩm thành công"));
  },
);

// [DELETE] /api/v1/products/:id - Xóa sản phẩm
export const deleteProduct = asyncHandler(
  async (req: Request, res: Response): Promise<Response> => {
    await productService.delete(req.params.id as string);
    return res
      .status(200)
      .json(ApiResponse.success(null, "Đã xóa sản phẩm thành công"));
  },
);
