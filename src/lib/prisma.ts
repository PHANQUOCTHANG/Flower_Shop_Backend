import "dotenv/config";
import { PrismaClient } from "@prisma/client";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not defined in .env file. " +
      "Please create .env file with DATABASE_URL variable.",
  );
}

const prisma = new PrismaClient({
  errorFormat: "pretty",
  log: ["error", "warn"],
});

export default prisma;
