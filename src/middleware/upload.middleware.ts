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

// Custom storage engine: upload stream trực tiếp lên Cloudinary cho review media
class CloudinaryReviewStorage implements StorageEngine {
  _handleFile(
    _req: Request,
    file: Express.Multer.File,
    cb: (error?: any, info?: Partial<Express.Multer.File>) => void,
  ): void {
    const isVideo = file.mimetype.startsWith("video");
    const uploadOptions: any = {
      folder: "reviews",
      allowed_formats: isVideo
        ? ["mp4", "webm", "mov", "avi"]
        : ["jpg", "jpeg", "png", "webp"],
    };

    // Chỉ apply transformation cho ảnh
    if (!isVideo) {
      uploadOptions.transformation = [
        { width: 1200, height: 1200, crop: "limit", quality: "auto:good" },
      ];
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
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
    cloudinary.uploader.destroy(
      file.filename,
      { resource_type: "auto" },
      (error) => {
        cb(error ?? null);
      },
    );
  }
}

// Kiểm tra loại file được phép cho review (image + video)
const reviewFileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void => {
  const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/jpg",
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-msvideo",
  ];

  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        "Chỉ chấp nhận ảnh (JPG, PNG, WEBP) hoặc video (MP4, WebM, MOV, AVI)",
        400,
      ),
    );
  }
};

// Cấu hình multer cho review media
const reviewUpload = multer({
  storage: new CloudinaryReviewStorage(),
  fileFilter: reviewFileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB cho video
    files: 5, // Tối đa 5 file
  },
});

// Upload media review (tối đa 5 file)
export const uploadReviewMedia = reviewUpload.array("media", 5);

// ─── Custom storage engine cho Chat Media ─────────────────────────────────────
class CloudinaryChatStorage implements StorageEngine {
  _handleFile(
    _req: Request,
    file: Express.Multer.File,
    cb: (error?: any, info?: Partial<Express.Multer.File>) => void,
  ): void {
    const isVideo = file.mimetype.startsWith("video/");
    const isImage = file.mimetype.startsWith("image/");

    const uploadOptions: any = {
      folder: "chat",
      resource_type: isVideo ? "video" : isImage ? "image" : "raw",
    };

    // Tối ưu hóa ảnh, nhưng không resize video/file thô
    if (isImage) {
      uploadOptions.transformation = [
        { width: 1280, height: 1280, crop: "limit", quality: "auto:good" },
      ];
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error || !result) {
          return cb(error ?? new Error("Upload chat media thất bại"));
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
    cloudinary.uploader.destroy(
      file.filename,
      { resource_type: "auto" },
      (error) => { cb(error ?? null); },
    );
  }
}

// Kiểm tra loại file được phép cho Chat
const chatFileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void => {
  const ALLOWED_TYPES = [
    // Ảnh
    "image/jpeg", "image/png", "image/webp", "image/jpg", "image/gif",
    // Video
    "video/mp4", "video/webm", "video/quicktime", "video/x-msvideo",
    // Tài liệu
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    // Nén
    "application/zip",
    "application/x-rar-compressed",
    "application/x-7z-compressed",
  ];

  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError(`Loại file "${file.mimetype}" không được hỗ trợ trong chat`, 400));
  }
};

// Cấu hình multer cho chat media
const chatUpload = multer({
  storage: new CloudinaryChatStorage(),
  fileFilter: chatFileFilter,
  limits: {
    fileSize: 30 * 1024 * 1024, // 30MB — cân bằng giữa hiệu năng và UX
    files: 1,                   // Mỗi lần chỉ gửi 1 file
  },
});

// Export middleware upload 1 file chat media
export const uploadChatMedia = chatUpload.single("file");

// ─── Custom storage engine cho Setting Image ─────────────────────────────────────
class CloudinarySettingStorage implements StorageEngine {
  _handleFile(
    _req: Request,
    file: Express.Multer.File,
    cb: (error?: any, info?: Partial<Express.Multer.File>) => void,
  ): void {
    const uploadOptions: any = {
      folder: "settings",
      allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
      transformation: [
        { width: 1200, height: 1200, crop: "limit", quality: "auto:good" },
      ],
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error || !result) {
          return cb(error ?? new Error("Upload setting image thất bại"));
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

const settingUpload = multer({
  storage: new CloudinarySettingStorage(),
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

export const uploadSettingImage = settingUpload.single("image");
