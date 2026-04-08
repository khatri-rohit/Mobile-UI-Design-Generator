import "dotenv/config";
import { defineConfig } from "prisma/config";

const prismaDatasourceUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!prismaDatasourceUrl) {
  throw new Error(
    "Missing database URL. Set DIRECT_URL or DATABASE_URL before running Prisma commands.",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: prismaDatasourceUrl,
  },
});
