import cloudinary from "@/config/cloudinary";

export class ImageService {
  // Called after middleware has already uploaded to Cloudinary
  // Files already have path (URL) and filename (publicId) set by middleware
  convertUploadedFilesToImages(files: Express.Multer.File[]) {
    return files.map((file, index) => ({
      imageUrl: file.path, // URL from middleware (file.path = result.secure_url)
      publicId: file.filename, // publicId from middleware (file.filename = result.public_id)
      isPrimary: index === 0,
      sortOrder: index,
    }));
  }

  // Legacy method - for direct uploads (if middleware is not used)
  async uploadMultiple(files: Express.Multer.File[]) {
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
      imageUrl: item.secure_url, // Match schema field name
      publicId: item.public_id,
      isPrimary: index === 0,
      sortOrder: index,
    }));
  }

  async deleteMultiple(publicIds: string[]) {
    return Promise.all(publicIds.map((id) => cloudinary.uploader.destroy(id)));
  }
}
