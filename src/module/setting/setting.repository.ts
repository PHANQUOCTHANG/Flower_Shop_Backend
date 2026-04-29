import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Cấu hình mặc định ban đầu
const DEFAULT_SETTINGS: Record<string, any> = {
  shopConfig: {
    shopName: "FlowerShop",
    phone: "1900 6868",
    email: "support@flowershop.vn",
    address: "273 Đ. An Dương Vương, Phường 3, Quận 5, Hồ Chí Minh, Việt Nam",
    slogan: "Trạm dừng chân của những tâm hồn yêu hoa. Hệ thống đặt hoa uy tín cung cấp hàng ngàn mẫu hoa đẹp nhất mỗi ngày.",
    mapIframeUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.651037812557!2d106.67914751525983!3d10.757579192334065!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752f1b7c3ed289%3A0xa06651894598e488!2s273%20An%20D.%20V%C6%B0%C6%A1ng%2C%20Ph%C6%B0%E1%BB%9Dng%203%2C%20Qu%E1%BA%ADn%205%2C%20H%E1%BB%93%20Ch%C3%AD%20Minh!5e0!3m2!1sen!2s!4v1680509614488!5m2!1sen!2s"
  },
  socialLinks: {
    zalo: "https://zalo.me/0931838465",
    facebook: "#",
    instagram: "#",
    tiktok: "#"
  },
  chatSettings: {
    welcomeMessage: "Xin chào! 👋 Tôi có thể giúp gì cho bạn?",
    waitMessage: "Chúng tôi thường trả lời trong vài phút"
  },
  homeBanners: [
    {
      image: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?q=80&w=1920",
      badgeText: "GIAO HỎA TỐC 2 GIỜ",
      title: "Đặt hoa online - Giao nhanh trong 2 giờ",
      titleHighlight: "Giao nhanh",
      description: "Tươi mới mỗi ngày, thiết kế sang trọng, giao hàng tận nơi chuyên nghiệp trong khu vực nội thành.",
      primaryBtn: "ĐẶT HOA NGAY",
      secondaryBtn: "Xem mẫu mới nhất",
      primaryLink: "/products",
      secondaryLink: "/products?sort=newest"
    },
    {
      image: "https://images.unsplash.com/photo-1563241527-3004b7be0ffd?q=80&w=1920",
      badgeText: "BỘ SƯU TẬP TÌNH YÊU",
      title: "Gửi trọn tình cảm - Hoa lãng mạn nhất 2024",
      titleHighlight: "Hoa lãng mạn",
      description: "Khám phá ngay bộ sưu tập hoa tươi đặc biệt dành trọn cho người thương với vô vàn ưu đãi và thiết kế độc quyền.",
      primaryBtn: "MUA NGAY",
      secondaryBtn: "Tư vấn chọn hoa",
      primaryLink: "/products?category=tinh-yeu",
      secondaryLink: "/products"
    }
  ],
  aboutPage: {
    heroImage: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&q=80&w=1000",
    badgeText: "Về chúng tôi",
    title: "Câu chuyện của chúng tôi",
    titleItalic: "chúng tôi",
    description: [
      "Khởi nguồn từ niềm đam mê mãnh liệt với vẻ đẹp thuần khiết của những đóa hoa, Flower Shop không chỉ là một cửa hàng, mà là nơi những cảm xúc được kết tinh qua đôi bàn tay khéo léo.",
      "Suốt hơn 10 năm qua, chúng tôi đã đồng hành cùng hàng ngàn khách hàng trong những khoảnh khắc đáng nhớ nhất, mang sứ mệnh kết nối những tâm hồn qua ngôn ngữ của cái đẹp."
    ],
    coreValues: [
      {
        title: "Hoa tươi nhập mới",
        description: "Chúng tôi tuyển chọn khắt khe những bông hoa tươi nhất từ các nông trại uy tín quốc tế và Đà Lạt mỗi sớm mai.",
        iconName: "Leaf"
      },
      {
        title: "Thiết kế độc bản",
        description: "Mỗi bó hoa là một tác phẩm nghệ thuật riêng biệt, được cá nhân hóa theo phong cách và thông điệp bạn muốn gửi gắm.",
        iconName: "Paintbrush"
      },
      {
        title: "Giao hoa hỏa tốc",
        description: "Cam kết giao hàng trong 60-120 phút nội thành, đảm bảo hoa luôn giữ được độ tươi mới khi đến tay người nhận.",
        iconName: "Zap"
      }
    ]
  }
};

class SettingRepository {
  /**
   * Lấy toàn bộ settings
   */
  async getAllSettings() {
    let settings = await prisma.systemSetting.findMany();
    
    // Auto seed default data if completely empty
    if (settings.length === 0) {
      await this.seedDefaultSettings();
      settings = await prisma.systemSetting.findMany();
    }
    
    // Chuyển array thành object
    const result: Record<string, any> = {};
    settings.forEach((s) => {
      result[s.key] = s.value;
    });
    
    return result;
  }

  /**
   * Cập nhật 1 setting
   */
  async updateSetting(key: string, value: any) {
    return await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });
  }

  /**
   * Khởi tạo data mặc định
   */
  async seedDefaultSettings() {
    const keys = Object.keys(DEFAULT_SETTINGS);
    for (const key of keys) {
      await prisma.systemSetting.upsert({
        where: { key },
        update: {},
        create: {
          key,
          value: DEFAULT_SETTINGS[key]
        }
      });
    }
  }
}

export default new SettingRepository();
