import settingRepository from "./setting.repository";

class SettingService {
  async getAllSettings() {
    return await settingRepository.getAllSettings();
  }

  async updateSetting(key: string, value: any) {
    if (!key) throw new Error("Key is required");
    return await settingRepository.updateSetting(key, value);
  }
}

export default new SettingService();
