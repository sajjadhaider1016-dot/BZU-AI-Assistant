const fs = require("fs");
const path = require("path");

// =======================================
// LOAD KNOWLEDGE
// =======================================

const knowledgePath = path.join(__dirname, "knowledge", "knowledge.json");

let knowledge = [];

try {

    knowledge = JSON.parse(
        fs.readFileSync(knowledgePath, "utf8")
    );

    console.log(`✅ Loaded ${knowledge.length} knowledge chunks`);

}
catch (err) {

    console.error("❌ Cannot load knowledge.json");

}

// =======================================
// NORMALIZE
// =======================================

function normalize(text) {

    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

}

// =======================================
// SEARCH
// =======================================

function searchKnowledge(query) {
console.log("Knowledge Chunks:", knowledge.length);
console.log("First Chunk:", knowledge[0]);
    if (!knowledge.length)
        return "Knowledge base is empty.";

    query = normalize(query);

    const keywords = query
        .split(" ")
        .filter(word => word.length > 2);

    let bestScore = 0;
    let bestChunk = null;

    for (const item of knowledge) {

        const title = normalize(item.title || "");
        const text = normalize(item.text || "");

        let score = 0;

        //-------------------------------------------------
        // Exact title
        //-------------------------------------------------

        if (title === query)
            score += 10000;

        //-------------------------------------------------
        // Title contains query
        //-------------------------------------------------

        if (title.includes(query))
            score += 6000;

        //-------------------------------------------------
        // Text contains query
        //-------------------------------------------------

        if (text.includes(query))
            score += 4000;

        //-------------------------------------------------
        // Keyword matches in title
        //-------------------------------------------------

        for (const word of keywords) {

            if (title.includes(word))
                score += 250;

        }

        //-------------------------------------------------
        // Keyword matches in text
        //-------------------------------------------------

        for (const word of keywords) {

            if (text.includes(word))
                score += 60;

        }

        //-------------------------------------------------
        // Prefer shorter chunks
        //-------------------------------------------------

        score -= Math.floor(text.length / 500);

        //-------------------------------------------------

        if (score > bestScore) {

            bestScore = score;
            bestChunk = item;

        }

    }

    if (!bestChunk)
        return "No relevant information found.";

    return bestChunk.text.substring(0, 1000);
}

module.exports = {
    searchKnowledge
};