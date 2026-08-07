const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getFile(userId) {
    return path.join(DATA_DIR, `${userId}.json`);
}

function loadMemory(userId) {
    const file = getFile(userId);

    if (!fs.existsSync(file)) {
        return [];
    }

    try {
        return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
        return [];
    }
}

function saveMemory(userId, messages) {
    const file = getFile(userId);

    fs.writeFileSync(
        file,
        JSON.stringify(messages, null, 2),
        "utf8"
    );
}

module.exports = {
    loadMemory,
    saveMemory
};