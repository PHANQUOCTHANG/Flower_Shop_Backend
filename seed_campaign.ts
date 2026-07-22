import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Bắt đầu tạo dữ liệu mock Sale Campaign...');

  // Lấy tất cả sản phẩm active (để thấy phân trang)
  const products = await prisma.product.findMany({
    where: { status: 'active' },
  });

  if (products.length === 0) {
    console.log('❌ Không tìm thấy sản phẩm nào trong DB để làm sale. Vui lòng thêm sản phẩm trước!');
    return;
  }

  // Lấy thời gian hiện tại
  const now = new Date();
  
  // Thời gian bắt đầu: hôm qua
  const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  // Thời gian kết thúc: ngày mai (sau 24h)
  const endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Xóa các campaign cũ để tránh trùng lặp
  await prisma.saleCampaign.deleteMany({});

  const campaign = await prisma.saleCampaign.create({
    data: {
      name: '⚡ Giờ Vàng Giá Sốc',
      description: 'Chương trình sale mock data',
      type: 'FLASH_SALE',
      status: 'ACTIVE',
      isActive: true,
      startDate: startDate,
      endDate: endDate,
      items: {
        create: products.map((product, index) => {
          // Tính giá giảm 20%
          const originalPrice = Number(product.price);
          const salePrice = originalPrice * 0.8;
          
          return {
            productId: product.id,
            discountValue: 20,
            discountType: 'PERCENTAGE',
            salePrice: salePrice,
            limitQuantity: 50 + index * 10,
            soldQuantity: 15 + index * 5,
          };
        }),
      },
    },
    include: {
      items: true
    }
  });

  console.log(`✅ Đã tạo chiến dịch: ${campaign.name}`);
  console.log(`🕒 Thời gian: ${campaign.startDate.toLocaleString()} - ${campaign.endDate.toLocaleString()}`);
  console.log(`🎁 Số lượng sản phẩm sale: ${campaign.items.length}`);
  
  for (const item of campaign.items) {
    console.log(`  - Product ID: ${item.productId} | Giá sale: ${item.salePrice}đ`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
