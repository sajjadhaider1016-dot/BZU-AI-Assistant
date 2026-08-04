const fs = require("fs");
const path = require("path");

// Load knowledge base
const knowledgePath = path.join(__dirname, "knowledge", "knowledge.json");

let knowledge = [];

try {
    knowledge = JSON.parse(
        fs.readFileSync(knowledgePath, "utf8")
    );
    console.log(`Knowledge loaded: ${knowledge.length} entries`);
} catch (err) {
    console.error("Failed to load knowledge.json");
    console.error(err);
    knowledge = [];
}

// Normalize text
function normalize(text) {
    return String(text || "")
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

// Search function
function searchKnowledge(query) {

    if (!knowledge.length)
        return [];

    query = normalize(query);

    const keywords = query
        .split(" ")
        .filter(word => word.length > 2);

    const results = [];

    for (const item of knowledge) {

        const title = normalize(item.title || "");
        const text = normalize(item.text || "");

        let score = 0;

        // Exact phrase
        if (title === query)
            score += 10000;

        if (title.includes(query))
            score += 6000;

        if (text.includes(query))
            score += 5000;

        // Keyword matching
        for (const word of keywords) {

            if (title.includes(word))
                score += 500;

            if (text.includes(word))
                score += 120;

        }

        // Bonus if every keyword exists
        if (
            keywords.every(word =>
                title.includes(word) || text.includes(word)
            )
        ) {
            score += 3000;
        }

        if (score > 0) {
            results.push({
                score,
                title: item.title,
                text: item.text
            });
        }
    }

    results.sort((a, b) => b.score - a.score);

    return results.slice(0, 8);
}

module.exports = {
    searchKnowledge
};