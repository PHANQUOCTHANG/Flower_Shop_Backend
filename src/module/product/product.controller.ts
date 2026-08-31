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
    const thumbnailWidth = thumbnailFile?.width ?? undefined;
    const thumbnailHeight = thumbnailFile?.height ?? undefined;

    // Gọi service tạo sản phẩm
    const data = await productService.create({
      ...req.body,
      ...(thumbnailUrl && { thumbnailUrl }),
      ...(thumbnailPublicId && { thumbnailPublicId }),
      ...(thumbnailWidth && { thumbnailWidth }),
      ...(thumbnailHeight && { thumbnailHeight }),
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
      imageOrder = [],
      primaryImageId,
      ...updateBody
    } = req.body;

    const productId = req.params.id as string;
    const existing = await productService.findById(productId);

    // Cập nhật gallery images nếu có ảnh mới, có ảnh bị xóa, hoặc admin đã
    // kéo-thả sắp xếp lại thứ tự (imageOrder được FE gửi kèm ở cả 3 trường hợp).
    if (
      galleryFiles.length > 0 ||
      deletedImageIds.length > 0 ||
      imageOrder.length > 0
    ) {
      // Xóa ảnh cũ đã bị xóa trên giao diện
      const oldPublicIds =
        existing.images
          ?.filter((img: any) => deletedImageIds.includes(img.id))
          .map((img: any) => img.publicId) ?? [];

      if (oldPublicIds.length > 0) {
        await imageService.deleteMultiple(oldPublicIds);
      }

      // Ảnh còn giữ lại. existing.images là DTO ({id, url, publicId, width,
      // height}) chứ không phải Multer.File nên map trực tiếp sang record lưu
      // DB — KHÔNG đi qua convertUploadedFilesToImages (hàm đó chỉ dành cho
      // file mới upload có file.path/file.filename, dùng nhầm cho DTO sẽ làm
      // imageUrl/publicId của ảnh giữ lại bị mất).
      const remainingImages = (existing.images ?? []).filter(
        (img: any) => !deletedImageIds.includes(img.id),
      );
      const remainingById = new Map(
        remainingImages.map((img: any) => [img.id, img]),
      );
      const toRecord = (img: any) => ({
        imageUrl: img.url,
        publicId: img.publicId,
        width: img.width ?? null,
        height: img.height ?? null,
      });

      const newRecords = imageService
        .convertUploadedFilesToImages(galleryFiles)
        .map(({ isPrimary: _isPrimary, sortOrder: _sortOrder, ...rest }) => rest);

      // Thứ tự cuối cùng theo imageOrder do FE gửi lên (kéo-thả ở admin): mỗi
      // token là id thật (ảnh cũ giữ lại) hoặc "new:<index>" (ảnh mới, theo
      // đúng thứ tự file trong field "images"). Ảnh nào không có token tương
      // ứng (client cũ chưa gửi imageOrder, hoặc token thiếu) sẽ tự nối cuối.
      const usedOldIds = new Set<string>();
      const usedNewIdx = new Set<number>();
      const combinedTokens: string[] = [];
      const combinedRecords: any[] = [];

      for (const token of imageOrder as string[]) {
        if (token.startsWith("new:")) {
          const idx = parseInt(token.slice(4), 10);
          if (newRecords[idx] && !usedNewIdx.has(idx)) {
            combinedTokens.push(token);
            combinedRecords.push(newRecords[idx]);
            usedNewIdx.add(idx);
          }
        } else if (remainingById.has(token) && !usedOldIds.has(token)) {
          combinedTokens.push(token);
          combinedRecords.push(toRecord(remainingById.get(token)));
          usedOldIds.add(token);
        }
      }
      remainingImages.forEach((img: any) => {
        if (!usedOldIds.has(img.id)) {
          combinedTokens.push(img.id);
          combinedRecords.push(toRecord(img));
        }
      });
      newRecords.forEach((rec, idx) => {
        if (!usedNewIdx.has(idx)) {
          combinedTokens.push(`new:${idx}`);
          combinedRecords.push(rec);
        }
      });

      // Ảnh đại diện: theo lựa chọn tường minh của admin nếu có, mặc định là
      // ảnh đầu tiên trong danh sách cuối cùng (giữ hành vi cũ khi không chọn).
      let primaryIndex = primaryImageId
        ? combinedTokens.indexOf(primaryImageId)
        : 0;
      if (primaryIndex === -1) primaryIndex = 0;

      // Bỏ qua nếu không có gì thực sự thay đổi (chỉ gửi imageOrder trùng thứ
      // tự hiện có, không thêm/xóa ảnh nào) — tránh xóa-tạo-lại ProductImage
      // (đổi id) một cách vô ích trên mỗi lần lưu sản phẩm.
      const originalOrder = remainingImages.map((img: any) => img.id);
      const isUnchanged =
        newRecords.length === 0 &&
        deletedImageIds.length === 0 &&
        combinedTokens.length === originalOrder.length &&
        combinedTokens.every((token, i) => token === originalOrder[i]);

      if (!isUnchanged) {
        updateBody.images = combinedRecords.map((img, index) => ({
          ...img,
          isPrimary: index === primaryIndex,
          sortOrder: index,
        }));
      }
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
        updateBody.thumbnailWidth = null;
        updateBody.thumbnailHeight = null;
      } else {
        updateBody.thumbnailUrl = thumbnailFile.path;
        updateBody.thumbnailPublicId = thumbnailFile.filename;
        updateBody.thumbnailWidth = thumbnailFile.width ?? null;
        updateBody.thumbnailHeight = thumbnailFile.height ?? null;
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
