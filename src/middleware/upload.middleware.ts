import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { StorageEngine } from "multer";
import { Request } from "express";
import AppError from "@/utils/appError";

// Custom storage engine: upload stream trực tiếp lên Cloudinary
class CloudinaryStorage implements StorageEngine {
  _handleFile(
    _req: Request,
    file: Express.Multer.File,
    cb: (error?: any, info?: Partial<Express.Multer.File>) => void,
  ): void {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "products",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        transformation: [
          { width: 1200, height: 1200, crop: "limit", quality: "auto:good" },
        ],
      },
      (error, result) => {
        if (error || !result) {
          return cb(error ?? new Error("Upload thất bại"));
        }

        cb(undefined, {
          path: result.secure_url,
          filename: result.public_id,
        });
      },
    );

    file.stream.pipe(uploadStream);
  }

  _removeFile(
    _req: Request,
    file: Express.Multer.File & { filename: string },
    cb: (error: Error | null) => void,
  ): void {
    cloudinary.uploader.destroy(file.filename, (error) => {
      cb(error ?? null);
    });
  }
}

// Kiểm tra loại file được phép
const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void => {
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError("Chỉ chấp nhận ảnh JPG, PNG, WEBP", 400));
  }
};

// Cấu hình multer với CloudinaryStorage
const upload = multer({
  storage: new CloudinaryStorage(),
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 11, // 10 gallery + 1 thumbnail
  },
});

// Upload ảnh sản phẩm (10 ảnh gallery + 1 ảnh thumbnail)
export const uploadProductImages = upload.fields([
  { name: "images", maxCount: 10 },
  { name: "thumbnail", maxCount: 1 },
]);

// Upload ảnh danh mục (1 ảnh)
export const uploadCategoryThumbnail = upload.single("thumbnail");
