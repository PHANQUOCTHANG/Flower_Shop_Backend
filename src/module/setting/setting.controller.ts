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
}

export default new SettingController();
