require("dotenv").config();

const path = require("path");
const fs = require("fs");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
const { PrismaClient } = require("@prisma/client");

// Use the same DATABASE_URL as Prisma Migrate. On Railway, set this to
// file:/app/data/dev.db and mount a persistent Volume at /app/data.
const databaseUrl =
    process.env.DATABASE_URL ||
    `file:${path.resolve(__dirname, "../dev.db")}`;

if (!databaseUrl.startsWith("file:")) {
    throw new Error("DATABASE_URL must be a SQLite file URL, for example file:/app/data/dev.db");
}

const configuredPath = databaseUrl.slice("file:".length);
const dbPath = path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(__dirname, "..", configuredPath);

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const adapter = new PrismaBetterSqlite3({
    url: `file:${dbPath}`
});

const prisma = new PrismaClient({
    adapter
});

module.exports = prisma;
