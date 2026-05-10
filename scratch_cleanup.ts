import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.message.deleteMany({
    where: {
      mediaUrl: null,
      mediaType: { not: null },
    },
  });
  console.log(`Deleted ${result.count} corrupted messages.`);
}

main().finally(() => prisma.$disconnect());
