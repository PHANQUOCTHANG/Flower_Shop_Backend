import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { StorageEngine } from "multer";
import { Request } from "express";
import AppError from "@/utils/appError";

// Custom StorageEngine — upload stream thẳng lên Cloudinary v2
class CloudinaryStorage implements StorageEngine {
  _handleFile(
    _req: Request,
    file: Express.Multer.File,
    cb: (error?: any, info?: Partial<Express.Multer.File>) => void,
  ) {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "products",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        transformation: [
          { width: 1200, height: 1200, crop: "limit", quality: "auto:good" },
        ],
      },
      (error, result) => {
        if (error || !result) return cb(error ?? new Error("Upload thất bại"));
        cb(undefined, {
          path: result.secure_url, // URL ảnh công khai
          filename: result.public_id, // public_id để xóa sau
        });
      },
    );

    // FIX: với custom StorageEngine, multer cấp file.stream (Readable) chứ không
    // populate file.buffer — dùng file.stream.pipe() thay vì streamifier
    file.stream.pipe(uploadStream);
  }

  _removeFile(
    _req: Request,
    file: Express.Multer.File & { filename: string },
    cb: (error: Error | null) => void,
  ) {
    cloudinary.uploader.destroy(file.filename, (error) => cb(error ?? null));
  }
}

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError("Chỉ chấp nhận ảnh JPG, PNG, WEBP", 400));
  }
};

const upload = multer({
  storage: new CloudinaryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 11 }, // 10 gallery + 1 thumbnail
});

// FIX: .fields() nhận đồng thời "images" và "thumbnail"
// .array("images") cũ chỉ nhận gallery, bỏ qua thumbnail hoàn toàn
export const uploadProductImages = upload.fields([
  { name: "images", maxCount: 10 },
  { name: "thumbnail", maxCount: 1 },
]);
