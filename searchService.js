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
// IMPORTANT / GENERIC WORDS
// ==========================================

const stopWords = new Set([
    "what",
    "is",
    "the",
    "of",
    "at",
    "in",
    "for",
    "on",
    "and",
    "to",
    "a",
    "an",
    "according",
    "tell",
    "me",
    "please",
    "can",
    "you",
    "does",
    "do",
    "how",
    "much",
    "many",
    "which",
    "where",
    "when",
    "who",
    "bzu",
    "university"
]);


// ==========================================
// PROGRAM TERMS
// ==========================================

const programTerms = [
    "bba hons ims",
    "bba hons ibf",
    "bba hons",
    "bba",
    "bs artificial intelligence",
    "artificial intelligence",
    "computer science",
    "information technology",
    "software engineering",
    "data analytics",
    "accounting finance",
    "accounting and finance",
    "banking finance",
    "banking and finance",
    "e commerce",
    "ecommerce",
    "digital marketing",
    "business digital marketing",
    "fin tech",
    "fintech",
    "supply chain management",
    "entrepreneurship",
    "financial analytics",
    "telecommunications",
    "telecommunication",
    "microbiology",
    "biochemistry",
    "mathematics",
    "physics",
    "chemistry",
    "botany",
    "zoology",
    "pharm d",
    "pharmd"
];


// ==========================================
// FACULTY TERMS
// ==========================================

const facultyTerms = [
    "faculty of arts",
    "faculty of sciences",
    "faculty of science",
    "faculty of commerce",
    "faculty of commerce banking business administration",
    "faculty of engineering",
    "faculty of law",
    "faculty of education",
    "faculty of pharmacy",
    "faculty of agricultural sciences"
];


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


    // ======================================
    // QUESTION TYPE
    // ======================================

    const isFeeQuestion =
        /\bfee\b|\bfees\b|\btuition\b|\bcost\b|\bcharges\b|\bprice\b|\bsemester fee\b|\b1st semester\b|\b2nd semester\b/
            .test(normalizedQuery);

    const isAdmissionQuestion =
        /\badmission\b|\badmissions\b|\bapply\b|\bapplication\b|\beligibility\b|\bmerit\b/
            .test(normalizedQuery);

    const isCalendarQuestion =
        /\bcalendar\b|\bsemester\b|\bfall\b|\bspring\b|\bmid term\b|\bfinal exam\b|\bexamination\b/
            .test(normalizedQuery);

    const isDepartmentQuestion =
        /\bdepartment\b|\bdepartments\b|\bfaculty\b|\bfaculties\b|\binstitute\b|\binstitutes\b|\bcenter\b|\bcenters\b|\bschool\b|\bschools\b/
            .test(normalizedQuery);


    // ======================================
    // DETECT PROGRAM
    // ======================================

    const detectedPrograms = programTerms
        .filter(term => normalizedQuery.includes(term));


    // ======================================
    // DETECT FACULTY
    // ======================================

    const detectedFaculties = facultyTerms
        .filter(term => normalizedQuery.includes(term));


    // ======================================
    // IMPORTANT QUERY WORDS
    // ======================================

    const keywords = normalizedQuery
        .split(/\s+/)
        .filter(word =>
            word.length > 2 &&
            !stopWords.has(word)
        );


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
        // EXACT QUERY
        // ==================================

        if (title === normalizedQuery) {
            score += 100000;
        }

        if (title.includes(normalizedQuery)) {
            score += 50000;
        }

        if (text.includes(normalizedQuery)) {
            score += 20000;
        }


        // ==================================
        // QUERY PHRASES
        // ==================================

        for (let i = 0; i < keywords.length - 1; i++) {

            const phrase = `${keywords[i]} ${keywords[i + 1]}`;

            if (title.includes(phrase)) {
                score += 12000;
            }

            if (text.includes(phrase)) {
                score += 4000;
            }
        }


        // ==================================
        // KEYWORD MATCHING
        // ==================================

        let matchedKeywords = 0;

        for (const word of keywords) {

            let matched = false;

            if (title.includes(word)) {
                score += 5000;
                matched = true;
            }

            if (text.includes(word)) {
                score += 800;
                matched = true;
            }

            if (matched) {
                matchedKeywords++;
            }
        }


        // ==================================
        // ALL QUERY KEYWORDS MATCH
        // ==================================

        if (
            keywords.length > 0 &&
            matchedKeywords === keywords.length
        ) {
            score += 15000;
        }


        // ==================================
        // PROGRAM-SPECIFIC BOOST
        // ==================================

        for (const program of detectedPrograms) {

            if (title.includes(program)) {
                score += 60000;
            }

            if (text.includes(program)) {
                score += 25000;
            }


            // Strong boost when program + fee
            if (isFeeQuestion) {

                if (
                    title.includes(program) &&
                    title.includes("fee")
                ) {
                    score += 80000;
                }

                if (
                    text.includes(program) &&
                    text.includes("fee")
                ) {
                    score += 30000;
                }
            }
        }


        // ==================================
        // FACULTY BOOST
        // ==================================

        for (const faculty of detectedFaculties) {

            if (title.includes(faculty)) {
                score += 50000;
            }

            if (text.includes(faculty)) {
                score += 12000;
            }
        }


        // ==================================
        // FEE QUESTION BOOST
        // ==================================

        if (isFeeQuestion) {

            if (title.includes("fee")) {
                score += 15000;
            }

            if (
                title.includes("fee structure") ||
                title.includes("fees structure")
            ) {
                score += 20000;
            }

            if (text.includes("fee")) {
                score += 3000;
            }

            if (
                text.includes("first semester fee") ||
                text.includes("1st semester fee")
            ) {
                score += 4000;
            }

            if (
                text.includes("second semester fee") ||
                text.includes("2nd semester fee")
            ) {
                score += 4000;
            }
        }


        // ==================================
        // ADMISSION BOOST
        // ==================================

        if (isAdmissionQuestion) {

            if (title.includes("admission")) {
                score += 20000;
            }

            if (text.includes("admission")) {
                score += 4000;
            }

            if (title.includes("eligibility")) {
                score += 15000;
            }
        }


        // ==================================
        // CALENDAR BOOST
        // ==================================

        if (isCalendarQuestion) {

            if (title.includes("calendar")) {
                score += 30000;
            }

            if (text.includes("academic calendar")) {
                score += 15000;
            }

            if (text.includes("fall 2026")) {
                score += 12000;
            }
        }


        // ==================================
        // DEPARTMENT QUESTION
        // ==================================

        if (isDepartmentQuestion) {

            // Prefer entries explicitly about departments
            if (title.includes("department")) {
                score += 30000;
            }

            // Prefer faculty / department listings
            if (
                title.includes("facult") ||
                title.includes("department") ||
                title.includes("institute") ||
                title.includes("center") ||
                title.includes("school")
            ) {
                score += 15000;
            }

            // Penalize generic prospectus pages
            if (
                title.includes("overview") ||
                title === "page 17" ||
                title.startsWith("page ")
            ) {
                score -= 15000;
            }
        }


        // ==================================
        // GENERIC PAGE PENALTY
        // ==================================

        if (/^page\s+\d+$/i.test(title)) {

            score -= 5000;

            // Generic pages should only rank highly
            // if their text actually contains many
            // relevant query terms.
            if (matchedKeywords < 2) {
                score -= 10000;
            }
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
    // SORT
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