const fs = require("fs");
const path = require("path");

// ======================================================
// LOAD KNOWLEDGE BASE
// ======================================================

const knowledgePath = path.join(
    __dirname,
    "knowledge",
    "knowledge.json"
);

let knowledge = [];

try {
    knowledge = JSON.parse(
        fs.readFileSync(knowledgePath, "utf8")
    );

    if (!Array.isArray(knowledge)) {
        throw new Error("knowledge.json must contain an array.");
    }

    console.log(`Knowledge loaded: ${knowledge.length} entries`);
} catch (error) {
    console.error("Failed to load knowledge.json");
    console.error(error.message);

    knowledge = [];
}

// ======================================================
// NORMALIZE TEXT
// ======================================================

function normalize(text) {
    return String(text || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

// ======================================================
// STOP WORDS
// ======================================================

const stopWords = new Set([
    "what",
    "is",
    "are",
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
    "why",
    "about",
    "information",
    "details",
    "give",
    "show",
    "explain",
    "university",
    "bzu"
]);

// ======================================================
// PROGRAM TERMS
// ======================================================

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

    "accounting and finance",
    "accounting finance",

    "banking and finance",
    "banking finance",

    "e commerce",
    "ecommerce",

    "digital marketing",
    "business and digital marketing",
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
    "pharmd",

    "mphil",
    "phd",
    "msc"
];

// ======================================================
// FACULTY TERMS
// ======================================================

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

// ======================================================
// UNIVERSITY / ADMINISTRATION TERMS
// ======================================================

const administrationTerms = [
    "vice chancellor",
    "vice-chancellor",
    "vc",
    "chancellor",
    "pro vice chancellor",
    "pro vice-chancellor",
    "registrar",
    "treasurer",
    "controller examination",
    "controller examinations",
    "dean",
    "director",
    "rector"
];

// ======================================================
// SEARCH KNOWLEDGE
// ======================================================

function searchKnowledge(query) {

    // ==================================================
    // VALIDATE KNOWLEDGE
    // ==================================================

    if (!knowledge.length) {
        return [];
    }

    // ==================================================
    // ORIGINAL QUERY
    // ==================================================

    const originalQuery = String(query || "").trim();

    if (!originalQuery) {
        return [];
    }

    // ==================================================
    // NORMALIZED QUERY
    // ==================================================

    const normalizedQuery = normalize(originalQuery);

    if (!normalizedQuery) {
        return [];
    }

    // ==================================================
    // QUESTION TYPES
    // ==================================================

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

    const isHostelQuestion =
        /\bhostel\b|\bhostels\b|\baccommodation\b|\bresidence\b|\bresidential\b/
            .test(normalizedQuery);

    const isScholarshipQuestion =
        /\bscholarship\b|\bscholarships\b|\bfinancial aid\b|\baid\b/
            .test(normalizedQuery);

    const isContactQuestion =
        /\bcontact\b|\bphone\b|\btelephone\b|\bemail\b|\baddress\b|\blocation\b|\bhelpline\b/
            .test(normalizedQuery);

    // ==================================================
    // VICE CHANCELLOR / ADMINISTRATION QUESTIONS
    // ==================================================

    const isViceChancellorQuestion =
        /\bvice chancellor\b|\bvice-chancellor\b|\bvc\b/
            .test(normalizedQuery);

    const isAdministrationQuestion =
        administrationTerms.some(term =>
            normalizedQuery.includes(term)
        );

    // ==================================================
    // DETECT PROGRAMS
    // ==================================================

    const detectedPrograms = programTerms
        .filter(term => normalizedQuery.includes(term));

    // ==================================================
    // DETECT FACULTIES
    // ==================================================

    const detectedFaculties = facultyTerms
        .filter(term => normalizedQuery.includes(term));

    // ==================================================
    // QUERY KEYWORDS
    // ==================================================
    //
    // IMPORTANT:
    // Keep "vc" and other short meaningful terms.
    // The old code removed "vc" because of word.length > 2.
    //

    const keywords = normalizedQuery
        .split(/\s+/)
        .filter(word => {
            return (
                word.length > 1 &&
                !stopWords.has(word)
            );
        });

    // ==================================================
    // RESULTS
    // ==================================================

    const results = [];

    // ==================================================
    // SCORE KNOWLEDGE ENTRIES
    // ==================================================

    for (const item of knowledge) {

        if (!item) {
            continue;
        }

        const title = normalize(
            item.title ||
            item.name ||
            ""
        );

        const text = normalize(
            item.text ||
            item.content ||
            item.description ||
            ""
        );

        const combined = `${title} ${text}`;

        let score = 0;

        // ==================================================
        // EXACT QUERY MATCH
        // ==================================================

        if (title === normalizedQuery) {
            score += 100000;
        }

        if (title.includes(normalizedQuery)) {
            score += 50000;
        }

        if (text.includes(normalizedQuery)) {
            score += 20000;
        }

        // ==================================================
        // KEYWORD MATCHING
        // ==================================================

        let matchedKeywords = 0;

        for (const word of keywords) {

            let matched = false;

            // Exact word matching is preferred.
            const wordRegex = new RegExp(
                `\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
                "i"
            );

            if (wordRegex.test(title)) {
                score += 5000;
                matched = true;
            } else if (title.includes(word)) {
                score += 3500;
                matched = true;
            }

            if (wordRegex.test(text)) {
                score += 800;
                matched = true;
            } else if (text.includes(word)) {
                score += 500;
                matched = true;
            }

            if (matched) {
                matchedKeywords++;
            }
        }

        // ==================================================
        // ALL KEYWORDS MATCH
        // ==================================================

        if (
            keywords.length > 0 &&
            matchedKeywords === keywords.length
        ) {
            score += 15000;
        }

        // ==================================================
        // PHRASE MATCHING
        // ==================================================

        for (let i = 0; i < keywords.length - 1; i++) {

            const phrase =
                `${keywords[i]} ${keywords[i + 1]}`;

            if (title.includes(phrase)) {
                score += 12000;
            }

            if (text.includes(phrase)) {
                score += 4000;
            }
        }

        // ==================================================
        // PROGRAM BOOST
        // ==================================================

        for (const program of detectedPrograms) {

            if (title.includes(program)) {
                score += 60000;
            }

            if (text.includes(program)) {
                score += 25000;
            }

            // Program + fee question
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

        // ==================================================
        // FACULTY BOOST
        // ==================================================

        for (const faculty of detectedFaculties) {

            if (title.includes(faculty)) {
                score += 50000;
            }

            if (text.includes(faculty)) {
                score += 12000;
            }
        }

        // ==================================================
        // VICE CHANCELLOR BOOST
        // ==================================================

        if (isViceChancellorQuestion) {

            // Strongest match: title mentions VC
            if (
                title.includes("vice chancellor") ||
                title.includes("vice-chancellor") ||
                title === "vc" ||
                title.includes(" vc ")
            ) {
                score += 100000;
            }

            // Text explicitly contains Vice Chancellor
            if (
                text.includes("vice chancellor") ||
                text.includes("vice-chancellor")
            ) {
                score += 60000;
            }

            // Text contains VC as a meaningful term
            if (/\bvc\b/.test(text)) {
                score += 30000;
            }

            // Administration pages
            if (
                title.includes("administration") ||
                title.includes("officials") ||
                title.includes("university administration")
            ) {
                score += 20000;
            }
        }

        // ==================================================
        // GENERAL ADMINISTRATION BOOST
        // ==================================================

        if (
            isAdministrationQuestion &&
            !isViceChancellorQuestion
        ) {

            for (const term of administrationTerms) {

                if (title.includes(term)) {
                    score += 30000;
                }

                if (text.includes(term)) {
                    score += 8000;
                }
            }
        }

        // ==================================================
        // FEE BOOST
        // ==================================================

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

            // Preserve Evening/Morning relevance
            if (
                normalizedQuery.includes("evening") &&
                combined.includes("evening")
            ) {
                score += 15000;
            }

            if (
                normalizedQuery.includes("morning") &&
                combined.includes("morning")
            ) {
                score += 15000;
            }
        }

        // ==================================================
        // ADMISSION BOOST
        // ==================================================

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

        // ==================================================
        // CALENDAR BOOST
        // ==================================================

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

        // ==================================================
        // DEPARTMENT BOOST
        // ==================================================

        if (isDepartmentQuestion) {

            if (title.includes("department")) {
                score += 30000;
            }

            if (
                title.includes("faculty") ||
                title.includes("department") ||
                title.includes("institute") ||
                title.includes("center") ||
                title.includes("school")
            ) {
                score += 15000;
            }

            // Penalize generic page titles
            if (
                title === "page 17" ||
                title.startsWith("page ")
            ) {
                score -= 15000;
            }
        }

        // ==================================================
        // HOSTEL BOOST
        // ==================================================

        if (isHostelQuestion) {

            if (title.includes("hostel")) {
                score += 30000;
            }

            if (text.includes("hostel")) {
                score += 5000;
            }
        }

        // ==================================================
        // SCHOLARSHIP BOOST
        // ==================================================

        if (isScholarshipQuestion) {

            if (title.includes("scholarship")) {
                score += 30000;
            }

            if (text.includes("scholarship")) {
                score += 5000;
            }
        }

        // ==================================================
        // CONTACT BOOST
        // ==================================================

        if (isContactQuestion) {

            if (title.includes("contact")) {
                score += 30000;
            }

            if (text.includes("contact")) {
                score += 5000;
            }
        }

        // ==================================================
        // GENERIC PAGE PENALTY
        // ==================================================

        if (/^page\s+\d+$/i.test(title)) {

            score -= 5000;

            if (matchedKeywords < 2) {
                score -= 10000;
            }
        }

        // ==================================================
        // ADD RESULT
        // ==================================================

        if (score > 0) {

            results.push({
                score,
                title: item.title || "",
                text:
                    item.text ||
                    item.content ||
                    item.description ||
                    ""
            });
        }
    }

    // ==================================================
    // SORT RESULTS
    // ==================================================

    results.sort(
        (a, b) => b.score - a.score
    );

    // ==================================================
    // DEBUG
    // ==================================================

    console.log("");
    console.log("==============================");
    console.log("KNOWLEDGE SEARCH");
    console.log("==============================");
    console.log("Query:", originalQuery);

    if (isViceChancellorQuestion) {
        console.log("Intent: Vice Chancellor");
    }

    if (isFeeQuestion) {
        console.log("Intent: Fee");
    }

    if (isAdmissionQuestion) {
        console.log("Intent: Admission");
    }

    if (isDepartmentQuestion) {
        console.log("Intent: Department / Faculty");
    }

    results
        .slice(0, 5)
        .forEach((item, index) => {

            console.log(
                `${index + 1}. ${item.score} | ${item.title}`
            );
        });

    console.log("==============================");
    console.log("");

    // ==================================================
    // RETURN TOP RESULTS
    // ==================================================

    return results.slice(0, 5);
}

// ======================================================
// EXPORT
// ======================================================

module.exports = {
    searchKnowledge
};