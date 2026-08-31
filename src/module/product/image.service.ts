import cloudinary from "@/config/cloudinary";

export interface IImageService {
  convertUploadedFilesToImages(files: Express.Multer.File[]): any[];
  uploadMultiple(files: Express.Multer.File[]): Promise<any[]>;
  deleteMultiple(publicIds: string[]): Promise<any[]>;
}

export class ImageService implements IImageService {
  // Chuyển đổi file từ multer thành định dạng chuẩn lưu vào DB
  convertUploadedFilesToImages(files: Express.Multer.File[]) {
    return files.map((file, index) => ({
      imageUrl: file.path,
      publicId: file.filename,
      width: file.width ?? null,
      height: file.height ?? null,
      isPrimary: index === 0,
      sortOrder: index,
    }));
  }

  // Upload trực tiếp nhiều file lên Cloudinary
  async uploadMultiple(files: Express.Multer.File[]): Promise<any[]> {
    const uploadPromises = files.map((file) => {
      return new Promise<any>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream({ folder: "products" }, (error, result) => {
            if (error) reject(error);
            else resolve(result);
          })
          .end(file.buffer);
      });
    });

    const results = await Promise.all(uploadPromises);

    return results.map((item, index) => ({
      imageUrl: item.secure_url,
      publicId: item.public_id,
      width: item.width ?? null,
      height: item.height ?? null,
      isPrimary: index === 0,
      sortOrder: index,
    }));
  }

  // Xóa nhiều ảnh trên Cloudinary
  async deleteMultiple(publicIds: string[]): Promise<any[]> {
    return Promise.all(publicIds.map((id) => cloudinary.uploader.destroy(id)));
  }
}
