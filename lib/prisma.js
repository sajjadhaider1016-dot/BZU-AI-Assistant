require("dotenv").config();

const path = require("path");
const fs = require("fs");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
const { PrismaClient } = require("@prisma/client");

// Railway exposes RAILWAY_VOLUME_MOUNT_PATH when a persistent Volume is
// attached. Prefer that path so the app and migrations survive deployments.
const railwayVolumePath = process.env.RAILWAY_VOLUME_MOUNT_PATH;
const databaseUrl = railwayVolumePath
    ? `file:${path.posix.join(railwayVolumePath, "dev.db")}`
    : process.env.DATABASE_URL || `file:${path.resolve(__dirname, "../dev.db")}`;

if (!databaseUrl.startsWith("file:")) {
    throw new Error("DATABASE_URL must be a SQLite file URL, for example file:/app/data/dev.db");
}

const configuredPath = databaseUrl.slice("file:".length);
const dbPath = path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(__dirname, "..", configuredPath);

fs.mkdirSync(path.dirname(dbPath), { recursive: true });
console.log("SQLite database file:", dbPath);

const adapter = new PrismaBetterSqlite3({
    url: `file:${dbPath}`
});

const prisma = new PrismaClient({
    adapter
});

module.exports = prisma;
