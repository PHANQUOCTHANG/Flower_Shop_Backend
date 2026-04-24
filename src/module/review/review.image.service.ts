import cloudinary from "@/config/cloudinary";

// Service xử lý media (ảnh/video) cho review — pattern giống ImageService của product
export class ReviewImageService {
  // Chuyển file multer thành định dạng lưu DB (lấy path/filename do CloudinaryStorage set)
  convertUploadedFilesToMedia(files: Express.Multer.File[]) {
    return files.map((file) => ({
      url: file.path,
      publicId: file.filename,
      type: file.mimetype.startsWith("video") ? "video" : "image",
    }));
  }

  // Xóa nhiều media trên Cloudinary (hỗ trợ cả ảnh và video)
  async deleteMultiple(publicIds: string[]): Promise<any[]> {
    return Promise.all(
      publicIds.map((id) =>
        cloudinary.uploader.destroy(id, { resource_type: "auto" }),
      ),
    );
  }
}
