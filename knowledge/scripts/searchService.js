const fs = require("fs");
const path = require("path");

// Load knowledge.json once
const knowledgePath = path.join(__dirname, "knowledge", "knowledge.json");

let knowledge = [];

try {
    knowledge = JSON.parse(fs.readFileSync(knowledgePath, "utf8"));
    console.log("✅ Loaded", knowledge.length, "knowledge chunks");
} catch (err) {
    console.error("❌ Could not load knowledge.json");
    console.error(err);
}

function searchKnowledge(query) {

    if (!knowledge.length) {
        return "Knowledge base is empty.";
    }

    const keywords = query
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 2);

    const results = [];

    for (const item of knowledge) {

        const text = (item.text || "").toLowerCase();

        let score = 0;

        for (const keyword of keywords) {

            if (text.includes(keyword)) {
                score++;
            }

        }

        if (score > 0) {

            results.push({

                score,

                text: item.text

            });

        }

    }

    results.sort((a, b) => b.score - a.score);

    if (results.length === 0) {

        return "No relevant information found in the official BZU knowledge base.";

    }

    return results
        .slice(0, 5)
        .map(r => r.text)
        .join("\n\n-----------------------------\n\n");
}

module.exports = {

    searchKnowledge

};