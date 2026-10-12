require("dotenv").config();

const isPostgres = /^(postgres|postgresql):/i.test(process.env.DATABASE_URL || "");

if (isPostgres) {
    const { PrismaClient } = require("../generated/postgresql");
    const { PrismaPg } = require("@prisma/adapter-pg");
    const adapter = new PrismaPg(process.env.DATABASE_URL);
    module.exports = new PrismaClient({ adapter });
} else {
    if (process.env.VERCEL) {
        throw new Error("DATABASE_URL must point to PostgreSQL on Vercel. Configure a free PostgreSQL provider in the Vercel project settings.");
    }

    const path = require("path");
    const fs = require("fs");
    const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
    const { PrismaClient } = require("@prisma/client");

    const railwayVolumePath = process.env.RAILWAY_VOLUME_MOUNT_PATH;
    const databaseUrl = railwayVolumePath
        ? `file:${path.posix.join(railwayVolumePath, "dev.db")}`
        : process.env.DATABASE_URL || `file:${path.resolve(__dirname, "../dev.db")}`;

    if (!databaseUrl.startsWith("file:")) {
        throw new Error("DATABASE_URL must be a PostgreSQL URL or a SQLite file URL.");
    }

    const configuredPath = databaseUrl.slice("file:".length);
    const dbPath = path.isAbsolute(configuredPath)
        ? configuredPath
        : path.resolve(__dirname, "..", configuredPath);

    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    console.log("SQLite database file:", dbPath);

    const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
    module.exports = new PrismaClient({ adapter });
}
