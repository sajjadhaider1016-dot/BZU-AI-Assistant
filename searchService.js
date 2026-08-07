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

    const originalQuery = String(query || "");
    const normalizedQuery = normalize(originalQuery);

    if (!normalizedQuery) {
        return [];
    }

    const keywords = normalizedQuery
        .split(/\s+/)
        .filter(word => word.length > 2);

    // ======================================
    // IMPORTANT PROGRAM TERMS
    // ======================================

    const programTerms = [
        "bba",
        "bba hons",
        "bba ims",
        "bba ibf",
        "pharm d",
        "pharmd",
        "artificial intelligence",
        "bs artificial intelligence",
        "computer science",
        "information technology",
        "software engineering",
        "data analytics",
        "accounting finance",
        "banking finance",
        "e commerce",
        "digital marketing",
        "telecommunication",
        "microbiology",
        "biochemistry",
        "mathematics",
        "physics",
        "chemistry",
        "botany",
        "zoology"
    ];

    const detectedPrograms = programTerms
        .filter(term => normalizedQuery.includes(term));

    // ======================================
    // QUESTION TYPE
    // ======================================

    const isFeeQuestion =
        /\bfee\b|\bfees\b|\btuition\b|\bcost\b|\bcharges\b|\bsemester fee\b/
            .test(normalizedQuery);

    const isAdmissionQuestion =
        /\badmission\b|\badmissions\b|\bapply\b|\bapplication\b|\beligibility\b/
            .test(normalizedQuery);

    const isCalendarQuestion =
        /\bcalendar\b|\bsemester\b|\bfall\b|\bspring\b|\bmid term\b|\bfinal exam\b|\bexamination\b/
            .test(normalizedQuery);

    const results = [];

    // ======================================
    // SCORE EACH KNOWLEDGE ENTRY
    // ======================================

    for (const item of knowledge) {

        const title = normalize(item.title || "");
        const text = normalize(item.text || "");

        const combined = `${title} ${text}`;

        let score = 0;

        // ==================================
        // EXACT QUERY MATCH
        // ==================================

        if (title === normalizedQuery) {
            score += 50000;
        }

        if (title.includes(normalizedQuery)) {
            score += 25000;
        }

        if (text.includes(normalizedQuery)) {
            score += 15000;
        }

        // ==================================
        // KEYWORD MATCHING
        // ==================================

        for (const word of keywords) {

            if (title.includes(word)) {
                score += 2500;
            }

            if (text.includes(word)) {
                score += 500;
            }
        }

        // ==================================
        // PROGRAM-SPECIFIC BOOST
        // ==================================

        for (const program of detectedPrograms) {

            if (title.includes(program)) {
                score += 30000;
            }

            if (text.includes(program)) {
                score += 12000;
            }
        }

        // ==================================
        // BBA SPECIAL MATCH
        // ==================================

        if (normalizedQuery.includes("bba")) {

            if (title.includes("bba")) {
                score += 40000;
            }

            if (text.includes("bba")) {
                score += 15000;
            }

            if (title.includes("bba hons")) {
                score += 10000;
            }

            if (text.includes("bba hons")) {
                score += 5000;
            }

            if (
                text.includes("75 483") ||
                text.includes("80 224")
            ) {
                score += 10000;
            }

            if (
                text.includes("bba hons ims") &&
                text.includes("bs evening")
            ) {
                score += 15000;
            }
        }

        // ==================================
        // FEE QUESTION BOOST
        // ==================================

        if (isFeeQuestion) {

            if (title.includes("fee")) {
                score += 12000;
            }

            if (text.includes("fee")) {
                score += 3000;
            }

            if (
                text.includes("first semester fee") ||
                text.includes("1st semester fee")
            ) {
                score += 3000;
            }

            if (
                text.includes("second semester fee") ||
                text.includes("2nd semester fee")
            ) {
                score += 3000;
            }
        }

        // ==================================
        // ADMISSION QUESTION BOOST
        // ==================================

        if (isAdmissionQuestion) {

            if (title.includes("admission")) {
                score += 12000;
            }

            if (text.includes("admission")) {
                score += 3000;
            }
        }

        // ==================================
        // CALENDAR QUESTION BOOST
        // ==================================

        if (isCalendarQuestion) {

            if (title.includes("calendar")) {
                score += 20000;
            }

            if (text.includes("academic calendar")) {
                score += 15000;
            }

            if (text.includes("fall 2026")) {
                score += 12000;
            }
        }

        // ==================================
        // ALL IMPORTANT KEYWORDS MATCH
        // ==================================

        const matchingKeywords = keywords.filter(word =>
            combined.includes(word)
        );

        if (
            keywords.length > 0 &&
            matchingKeywords.length === keywords.length
        ) {
            score += 8000;
        }

        // ==================================
        // STORE RESULT
        // ==================================

        if (score > 0) {

            results.push({
                score,
                title: item.title,
                text: item.text
            });
        }
    }

    // ======================================
    // SORT BY RELEVANCE
    // ======================================

    results.sort((a, b) => b.score - a.score);

    // ======================================
    // DEBUG
    // ======================================

    console.log("\n==============================");
    console.log("KNOWLEDGE SEARCH");
    console.log("==============================");
    console.log("Query:", originalQuery);

    results.slice(0, 5).forEach((item, index) => {
        console.log(
            `${index + 1}. ${item.score} | ${item.title}`
        );
    });

    console.log("==============================\n");

    // ======================================
    // NO RESULTS
    // ======================================

    if (results.length === 0) {
        return [];
    }

    // ======================================
    // RETURN TOP RESULTS
    // ======================================

    return results.slice(0, 5);
}

// ==========================================
// EXPORT
// ==========================================

module.exports = {
    searchKnowledge
};