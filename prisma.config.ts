import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

const usePostgres = /^(postgres|postgresql):/i.test(process.env.DATABASE_URL || "");
const railwayVolumePath = process.env.RAILWAY_VOLUME_MOUNT_PATH;
const databaseUrl = usePostgres
  ? process.env.DATABASE_URL
  : railwayVolumePath
    ? `file:${path.posix.join(railwayVolumePath, "dev.db")}`
    : process.env.DATABASE_URL || "file:./dev.db";

export default defineConfig({
  schema: usePostgres ? "prisma/schema.postgresql.prisma" : "prisma/schema.prisma",
  migrations: {
    path: usePostgres ? "prisma/migrations-postgresql" : "prisma/migrations",
  },
  datasource: { url: databaseUrl },
});
