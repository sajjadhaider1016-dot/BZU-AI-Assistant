require("dotenv").config();

const path = require("path");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
const { PrismaClient } = require("@prisma/client");

const dbPath = path.resolve(__dirname, "../dev.db");

const adapter = new PrismaBetterSqlite3({
    url: `file:${dbPath}`
});

const prisma = new PrismaClient({
    adapter
});

module.exports = prisma;