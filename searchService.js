const fs = require("fs");
const path = require("path");

// ==========================================
// LOAD KNOWLEDGE BASE
// ==========================================

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

// ==========================================
// NORMALIZE TEXT
// ==========================================

function normalize(text) {

    return String(text || "")
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

}

// ==========================================
// SEARCH KNOWLEDGE
// ==========================================

function searchKnowledge(query) {

    if (!knowledge.length) {
        return [];
    }

    query = normalize(query);

    const keywords = query
        .split(" ")
        .filter(word => word.length > 2);

    // ======================================
    // EXACT TITLE MATCH
    // ======================================

    const exactTitle = knowledge.find(item =>
        normalize(item.title) === query
    );

    if (exactTitle) {

        return [{
            title: exactTitle.title,
            text: exactTitle.text
        }];

    }

    // ======================================
    // SCORE RESULTS
    // ======================================

    const results = [];

    for (const item of knowledge) {

        const title = normalize(item.title || "");
        const text = normalize(item.text || "");

        let score = 0;

        // Exact query
        if (title.includes(query))
            score += 20000;

       if (text.includes(query))
    score += 10000;

        // Keyword matching
        for (const word of keywords) {

            if (title.includes(word))
                score += 1000;

            if (text.includes(word))
                score += 250;

        }

        // Bonus if all keywords appear
        if (
            keywords.length &&
            keywords.every(word =>
                title.includes(word) || text.includes(word)
            )
        ) {
            score += 4000;
        }

        if (score > 0) {

            results.push({

                score,

                title: item.title,

                text: item.text

            });

        }

    }

    // ======================================
    // SORT
    // ======================================

    results.sort((a, b) => b.score - a.score);

    if (results.length === 0) {
        return [];
    }

    // ======================================
    // KEEP ONLY RELEVANT RESULTS
    // ======================================

    const bestScore = results[0].score;

    const filtered = results.filter(
        item => item.score >= bestScore * 0.80
    );

    // Return only top 3 sections
    return filtered.slice(0, 3);

}

module.exports = {
    searchKnowledge
};