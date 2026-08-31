/**
 * Audit ảnh sản phẩm: quét toàn bộ thumbnail + gallery, xác định ảnh nào đang
 * có độ phân giải thấp (không đủ nét khi hiển thị to ở trang chi tiết) để biết
 * chính xác sản phẩm nào cần chụp/upload lại — thay vì đoán mò.
 *
 * - Ảnh đã có width/height lưu sẵn trong DB (upload sau khi thêm 2 cột này)
 *   thì dùng luôn.
 * - Ảnh cũ chưa có (upload trước đó) thì gọi Cloudinary Admin API lấy kích
 *   thước thật, đồng thời backfill luôn vào DB để lần audit sau không cần gọi
 *   lại API cho ảnh đó nữa.
 *
 * Chạy: npx ts-node scripts/audit-product-images.ts
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";
import cloudinary from "@/config/cloudinary";

// Ngưỡng "đủ nét" — khớp với RECOMMENDED_IMAGE_DIMENSION phía admin (frontend)
const SHARP_THRESHOLD = 1600;
// Nghỉ giữa các lần gọi Cloudinary Admin API để tránh vượt rate limit
const API_DELAY_MS = 150;

interface ReportRow {
  productId: string;
  productName: string;
  sku: string;
  imageType: "thumbnail" | "gallery";
  width: number | null;
  height: number | null;
  cloudinaryUrl: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchDimensions(
  publicId: string,
): Promise<{ width: number; height: number } | null> {
  try {
    const result = await cloudinary.api.resource(publicId);
    return { width: result.width, height: result.height };
  } catch (error) {
    console.warn(`  ⚠️  Không lấy được kích thước cho publicId="${publicId}":`, (error as Error).message);
    return null;
  }
}

function csvEscape(value: string | number | null): string {
  const str = value === null ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function isLowRes(width: number | null, height: number | null): boolean {
  const longEdge = Math.max(width ?? 0, height ?? 0);
  return longEdge < SHARP_THRESHOLD;
}

async function main() {
  console.log("🔍 Đang quét ảnh sản phẩm...\n");

  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      sku: true,
      thumbnailUrl: true,
      thumbnailPublicId: true,
      thumbnailWidth: true,
      thumbnailHeight: true,
      images: {
        select: {
          id: true,
          imageUrl: true,
          publicId: true,
          width: true,
          height: true,
        },
      },
    },
  });

  const rows: ReportRow[] = [];
  let checked = 0;
  let backfilled = 0;

  for (const product of products) {
    // ─ Thumbnail ─
    if (product.thumbnailUrl && product.thumbnailPublicId) {
      let width = product.thumbnailWidth;
      let height = product.thumbnailHeight;

      if (width == null || height == null) {
        const dims = await fetchDimensions(product.thumbnailPublicId);
        checked++;
        await sleep(API_DELAY_MS);
        if (dims) {
          width = dims.width;
          height = dims.height;
          await prisma.product.update({
            where: { id: product.id },
            data: { thumbnailWidth: width, thumbnailHeight: height },
          });
          backfilled++;
        }
      }

      if (isLowRes(width, height)) {
        rows.push({
          productId: product.id,
          productName: product.name,
          sku: product.sku ?? "",
          imageType: "thumbnail",
          width,
          height,
          cloudinaryUrl: product.thumbnailUrl,
        });
      }
    }

    // ─ Gallery ─
    for (const img of product.images) {
      let width = img.width;
      let height = img.height;

      if (width == null || height == null) {
        const dims = await fetchDimensions(img.publicId);
        checked++;
        await sleep(API_DELAY_MS);
        if (dims) {
          width = dims.width;
          height = dims.height;
          await prisma.productImage.update({
            where: { id: img.id },
            data: { width, height },
          });
          backfilled++;
        }
      }

      if (isLowRes(width, height)) {
        rows.push({
          productId: product.id,
          productName: product.name,
          sku: product.sku ?? "",
          imageType: "gallery",
          width,
          height,
          cloudinaryUrl: img.imageUrl,
        });
      }
    }
  }

  const outputDir = path.join(__dirname, "output");
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, "low-res-products-report.csv");

  const header = "productId,productName,sku,imageType,width,height,cloudinaryUrl";
  const csvLines = rows.map((r) =>
    [
      csvEscape(r.productId),
      csvEscape(r.productName),
      csvEscape(r.sku),
      csvEscape(r.imageType),
      csvEscape(r.width),
      csvEscape(r.height),
      csvEscape(r.cloudinaryUrl),
    ].join(","),
  );
  fs.writeFileSync(outputPath, [header, ...csvLines].join("\n"), "utf-8");

  console.log(`\n✅ Hoàn tất.`);
  console.log(`   Sản phẩm đã quét: ${products.length}`);
  console.log(`   Ảnh gọi Cloudinary API để lấy kích thước: ${checked} (backfill vào DB: ${backfilled})`);
  console.log(`   Ảnh độ phân giải thấp (< ${SHARP_THRESHOLD}px cạnh dài): ${rows.length}`);
  console.log(`   Báo cáo: ${outputPath}`);
}

main()
  .catch((error) => {
    console.error("❌ Lỗi khi audit ảnh sản phẩm:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
