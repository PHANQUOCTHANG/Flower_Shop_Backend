import { Request, Response, NextFunction } from "express";
import settingService from "./setting.service";
import { ApiResponse } from "@/utils/apiResponse";

class SettingController {
  getAllSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = await settingService.getAllSettings();
      return res.status(200).json(ApiResponse.success(settings, "Lấy cấu hình thành công"));
    } catch (error) {
      next(error);
    }
  };

  updateSetting = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = req.params.key as string;
      const value = req.body;
      const updatedSetting = await settingService.updateSetting(key, value);
      return res.status(200).json(ApiResponse.success(updatedSetting, "Cập nhật thành công"));
    } catch (error) {
      next(error);
    }
  };

  uploadImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json(ApiResponse.error("Không có file nào được tải lên"));
      }

      return res.status(200).json(ApiResponse.success({
        url: req.file.path,
        publicId: req.file.filename
      }, "Upload ảnh thành công"));
    } catch (error) {
      next(error);
    }
  };
}

export default new SettingController();
