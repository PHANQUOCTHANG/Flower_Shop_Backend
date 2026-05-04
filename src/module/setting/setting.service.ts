import settingRepository from "./setting.repository";
import { AIService } from "@/module/chat/ai.service";

class SettingService {
  async getAllSettings() {
    return await settingRepository.getAllSettings();
  }

  async updateSetting(key: string, value: any) {
    if (!key) throw new Error("Key is required");
    const updated = await settingRepository.updateSetting(key, value);
    // Xoá cache AI để AI cập nhật cấu hình shop mới
    await AIService.invalidateKnowledgeCache();
    return updated;
  }
}

export default new SettingService();
