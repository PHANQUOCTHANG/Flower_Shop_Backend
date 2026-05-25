import settingRepository from "./setting.repository";
import { AIService } from "@/module/chat/ai.service";
import { getCache, setCache, deleteCache } from "@/utils/cache";

class SettingService {
  private readonly CACHE_KEY = "settings:all";
  private readonly CACHE_TTL = 3600; // 1 tiếng — settings rất ít thay đổi

  async getAllSettings() {
    // Kiểm tra cache — settings rất ít thay đổi, cache 1 tiếng
    const cached = await getCache<any>(this.CACHE_KEY);
    if (cached) return cached;

    const settings = await settingRepository.getAllSettings();
    await setCache(this.CACHE_KEY, settings, this.CACHE_TTL);
    return settings;
  }

  async updateSetting(key: string, value: any) {
    if (!key) throw new Error("Key is required");
    const updated = await settingRepository.updateSetting(key, value);

    // Xóa cache settings và cache AI khi có thay đổi cấu hình
    await Promise.all([
      deleteCache(this.CACHE_KEY),            // Cache settings list
      AIService.invalidateKnowledgeCache(),   // AI cập nhật cấu hình shop mới
    ]);

    return updated;
  }
}

export default new SettingService();

