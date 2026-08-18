// ======================================================
// BZU AI Assistant v6.0
// PART 1/5 - SERVER SETUP
// Developed by Sajjad Haider
// ======================================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const Tesseract = require("tesseract.js");

const fs = require("fs");
const path = require("path");

const memoryService = require("./memoryService");
const { searchKnowledge } = require("./searchService");

// ======================================================
// EXPRESS APP
// ======================================================

const app = express();

// ======================================================
// DIRECTORIES
// ======================================================

const uploadsDirectory = path.join(__dirname, "uploads");
const dataDirectory = path.join(__dirname, "data");

if (!fs.existsSync(uploadsDirectory)) {
    fs.mkdirSync(uploadsDirectory, { recursive: true });
}

if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true });
}

// ======================================================
// MIDDLEWARE
// ======================================================

app.use(cors());

app.use(
    express.json({
        limit: "20mb"
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "20mb"
    })
);

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);

// ======================================================
// FILE UPLOAD
// ======================================================

const upload = multer({
    dest: uploadsDirectory,

    limits: {
        fileSize: 20 * 1024 * 1024
    }
});

// ======================================================
// GROQ CLIENT
// ======================================================

const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,

    baseURL: "https://api.groq.com/openai/v1"
});

// ======================================================
// CONFIGURATION
// ======================================================

const AI_MODEL =
    process.env.AI_MODEL || "openai/gpt-oss-120b";
    
const MAX_CHAT_TOKENS = 800;

const MAX_DOCUMENT_TOKENS = 1000;

// ======================================================
// CLEAN QUERY
// ======================================================

function cleanQuery(message) {
    return String(message || "")
        .toLowerCase()
        .replace(/tell me about/gi, "")
        .replace(/what is/gi, "")
        .replace(/what are/gi, "")
        .replace(/give me/gi, "")
        .replace(/information about/gi, "")
        .replace(/details about/gi, "")
        .replace(/please/gi, "")
        .replace(/\?/g, "")
        .trim();
}

// ======================================================
// BZU QUESTION DETECTION
// IMPORTANT:
// ONLY EXPLICIT BZU REFERENCES ARE BZU QUESTIONS
// ======================================================

function isBZUQuestion(message) {
    const text = String(message || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const bzuTerms = [
        "bzu",
        "bahauddin zakariya",
        "bahauddin zakariya university",
        "zakariya university"
    ];

    return bzuTerms.some((term) =>
        text.includes(term)
    );
}

// ======================================================
// MODE DETECTION
// ======================================================

function detectMode(message) {
    const text = String(message || "").toLowerCase();

    const imageWords = [
        "generate image",
        "create image",
        "make image",
        "draw an image",
        "draw",
        "picture",
        "photo",
        "logo"
    ];

    if (
        imageWords.some((word) =>
            text.includes(word)
        )
    ) {
        return "image";
    }

    if (isBZUQuestion(text)) {
        return "bzu";
    }

    return "general";
}

// ======================================================
// END PART 1
// ======================================================// ======================================================
// PART 2/5 - CHAT API
// ======================================================

app.post("/chat", async (req, res) => {

    try {

        // ==================================================
        // RECEIVE REQUEST
        // ==================================================

        const {
            messages = [],
            memory = {},
            userId = "default"
        } = req.body;

        console.log("=================================");
        console.log("CHAT REQUEST RECEIVED");
        console.log("User ID:", userId);
        console.log("=================================");

        // ==================================================
        // VALIDATE MESSAGES
        // ==================================================

        if (
            !Array.isArray(messages) ||
            messages.length === 0
        ) {
            return res.status(400).json({
                success: false,
                reply: "No messages received."
            });
        }

        // ==================================================
        // CURRENT USER MESSAGE ONLY
        // ==================================================

        const latestMessage =
            messages[messages.length - 1]?.text ||
            messages[messages.length - 1]?.content ||
            "";

        if (!String(latestMessage).trim()) {
            return res.status(400).json({
                success: false,
                reply: "Please enter a message."
            });
        }

        // ==================================================
        // CLEAN QUERY
        // ==================================================

        const query = cleanQuery(latestMessage);

        console.log("QUESTION:", latestMessage);
        console.log("CLEAN QUERY:", query);

        // ==================================================
        // MEMORY QUESTION DETECTION
        // ==================================================

        const isMemoryQuestion =
            query.includes("who am i") ||
            query.includes("my name") ||
            query.includes("about me") ||
            query.includes("what do you know about me") ||
            query.includes("show my memory") ||
            query.includes("my university") ||
            query.includes("my semester") ||
            query.includes("my department") ||
            query.includes("my city") ||
            query.includes("my email") ||
            query.includes("my phone");

        // ==================================================
        // BZU QUESTION DETECTION
        // ==================================================

        const isBZUQuery =
            isBZUQuestion(latestMessage);

        // ==================================================
        // MEMORY DECISION
        // ==================================================

        const useMemory =
            isMemoryQuestion &&
            !isBZUQuery;

        console.log("IS BZU QUERY:", isBZUQuery);
        console.log("IS MEMORY QUERY:", isMemoryQuestion);
        console.log("USE MEMORY:", useMemory);

        // ==================================================
        // MEMORY PROMPT
        // ==================================================

        const memoryPrompt = `
Name: ${memory?.name || ""}

University: ${memory?.university || ""}

Semester: ${memory?.semester || ""}

Department: ${memory?.department || ""}

City: ${memory?.city || ""}

Email: ${memory?.email || ""}

Phone: ${memory?.phone || ""}
`;

        // ==================================================
        // LOAD MEMORY ONLY WHEN NEEDED
        // ==================================================

        let previousMessages = [];

        if (useMemory) {

            try {

                previousMessages =
                    memoryService.loadMemory(userId) || [];

                console.log(
                    "PERSONAL MEMORY LOADED"
                );

            } catch (memoryError) {

                console.error(
                    "MEMORY LOAD ERROR:",
                    memoryError
                );

                previousMessages = [];
            }

        } else {

            console.log(
                "MEMORY DISABLED FOR THIS QUESTION"
            );
        }

        // ==================================================
        // MODE
        // ==================================================

        const mode =
            detectMode(latestMessage);

        console.log("MODE:", mode);

        // ==================================================
        // IMAGE MODE
        // ==================================================

        if (mode === "image") {

            return res.json({
                success: true,
                reply:
                    "Image generation is not available in this version yet."
            });
        }

        // ==================================================
        // DEVELOPER QUESTION
        // ==================================================

        if (
            query.includes("who developed") ||
            query.includes("who created") ||
            query.includes("who made") ||
            query.includes("who built")
        ) {

            return res.json({
                success: true,
                reply:
                    "I am the official BZU AI Assistant developed by Sajjad Haider."
            });
        }

        // ==================================================
        // BZU KNOWLEDGE SEARCH
        //
        // IMPORTANT:
        // knowledge is declared ONLY ONCE.
        // ==================================================

        let knowledge = [];

        if (isBZUQuery) {

            try {

                knowledge =
                    searchKnowledge(query) || [];

                console.log(
                    "BZU KNOWLEDGE SEARCH PERFORMED"
                );

            } catch (searchError) {

                console.error(
                    "KNOWLEDGE SEARCH ERROR:",
                    searchError
                );

                knowledge = [];
            }

        } else {

            console.log(
                "GENERAL QUESTION - BZU SEARCH SKIPPED"
            );
        }

        // ==================================================
        // KNOWLEDGE STATUS
        // ==================================================

        const noKnowledge =
            !knowledge ||
            knowledge.length === 0;

        console.log(
            "KNOWLEDGE FOUND:",
            !noKnowledge
        );

        // ==================================================
        // PREPARE BZU KNOWLEDGE
        // ==================================================

        const officialKnowledgeText =
            (knowledge || [])
                .map((item) => {

                    let text = String(
                        item?.text ||
                        item?.content ||
                        ""
                    );

                    // Remove source references
                    text = text.replace(
                        /\bsource\s*:\s*[^\n\r]*/gi,
                        ""
                    );

                    // Remove page references
                    text = text.replace(
                        /\bpages?\s*[\d,\-\s]+/gi,
                        ""
                    );

                    // Clean whitespace
                    text = text
                        .replace(/\n{3,}/g, "\n\n")
                        .trim();

                    return text;
                })
                .filter(Boolean)
                .join("\n\n");

        console.log(
            "KNOWLEDGE TEXT LENGTH:",
            officialKnowledgeText.length
        );

        // ==================================================
        // END PART 2
        // ==================================================        // ==================================================
        // PART 3/5 - BUILD AI CHAT
        // ==================================================

        let chatMessages = [];

        // ==================================================
        // SYSTEM PROMPT
        // ==================================================

        const systemPrompt = `
You are BZU AI Assistant, an intelligent university assistant developed by Sajjad Haider.

Your purpose is to help users with:

1. BZU-specific information
2. General questions
3. Information about other universities
4. General education and technology questions
5. Normal conversations

======================================================
IMPORTANT: CURRENT QUESTION ONLY
======================================================

Answer ONLY the CURRENT USER QUESTION.

Do not answer previous questions unless the user explicitly asks.

Do not combine previous questions into the current answer.

Do not mention internal conversation processing.

======================================================
QUESTION CLASSIFICATION
======================================================

There are TWO types of questions.

TYPE 1:
BZU-SPECIFIC QUESTION

A question is BZU-specific ONLY if the CURRENT question explicitly refers to:

- BZU
- Bahauddin Zakariya University
- Bahauddin Zakariya
- Zakariya University

Examples:

"Who is the VC of BZU?"

"What is the BBA fee at BZU?"

"What departments are available at BZU?"

"When are BZU admissions?"

"What is the BS AI fee at BZU?"

======================================================
BZU QUESTIONS
======================================================

For BZU-specific questions:

USE ONLY the retrieved BZU knowledge provided below.

Do NOT invent BZU information.

Do NOT guess missing BZU information.

Do NOT use general knowledge to manufacture BZU-specific facts.

Do NOT transfer information from one BZU program to another.

Do NOT transfer fees between programs.

Do NOT assume Morning and Evening programs have the same fee.

Do NOT assume similar BZU programs are identical.

If the requested BZU information exists in the retrieved knowledge:

Answer directly.

If the requested information does NOT exist:

Say exactly:

"I could not find this information in my BZU knowledge."

======================================================
NON-BZU QUESTIONS
======================================================

If the current question does NOT explicitly refer to BZU,
it is NOT a BZU-specific question.

Examples:

"Who is the VC of Emerson University?"

"Who is the VC of Harvard University?"

"What is artificial intelligence?"

"How do I learn Python?"

"What is JavaScript?"

"What is machine learning?"

"Explain Newton's law."

"Help me write an email."

For NON-BZU questions:

DO NOT use the BZU knowledge.

DO NOT say:

"I could not find this information in my BZU knowledge."

Answer normally using your general AI knowledge.

Do NOT force the answer into a BZU context.

Do NOT mention the BZU knowledge base.

Do NOT mention retrieval.

Do NOT mention internal search.

======================================================
BZU FEE QUESTIONS
======================================================

For BZU fee questions identify:

1. Exact program
2. Program mode
3. Semester
4. Faculty, if available

Only provide fee amounts explicitly present in the retrieved BZU knowledge.

Never:

- invent a fee
- estimate a fee
- calculate an unavailable fee
- copy a fee from another program
- transfer Morning fees to Evening
- transfer Evening fees to Morning

If only Evening information exists:

Clearly state that the available information is for Evening.

If both Morning and Evening information exists:

Show them separately.

======================================================
BZU ADMISSIONS
======================================================

Use only retrieved BZU knowledge.

Do not invent:

- admission dates
- eligibility
- merit
- deadlines
- application requirements
- test requirements
- admission fees

If unavailable:

"I could not find this information in my BZU knowledge."

======================================================
BZU SCHOLARSHIPS
======================================================

Use only retrieved BZU knowledge.

Do not invent:

- scholarship names
- scholarship amounts
- eligibility
- deadlines

If unavailable:

"I could not find this information in my BZU knowledge."

======================================================
BZU HOSTELS
======================================================

Use only retrieved BZU knowledge.

Do not invent:

- hostel names
- hostel fees
- room availability
- rules
- eligibility

If unavailable:

"I could not find this information in my BZU knowledge."

======================================================
BZU EXAMS / RESULTS
======================================================

Use only retrieved BZU knowledge.

Do not invent:

- examination dates
- result dates
- date sheets
- academic calendar dates
- semester dates

If unavailable:

"I could not find this information in my BZU knowledge."

======================================================
USER MEMORY
======================================================

User memory is private.

Use memory ONLY when the user asks about themselves.

Examples:

"Who am I?"

"What is my name?"

"What university do I study at?"

"What semester am I in?"

"What do you know about me?"

Never use private memory to answer BZU factual questions.

Never reveal private memory unnecessarily.

======================================================
DEVELOPER
======================================================

If the user asks:

"Who developed you?"

"Who created you?"

"Who built you?"

"Who made you?"

Answer exactly:

"I am the official BZU AI Assistant developed by Sajjad Haider."

======================================================
PRIVATE MEMORY DATA
======================================================

${
    useMemory
        ? `
Private user information:

${memoryPrompt}

Use this information ONLY when the current question is about the user.

Do not reveal it unless directly relevant.
`
        : `
Do not use user memory for this question.
`
}

======================================================
RETRIEVED BZU KNOWLEDGE
======================================================

IMPORTANT:

The following information is BZU-specific knowledge.

Use it ONLY if the CURRENT question is BZU-specific.

Do NOT use it for questions about other universities.

Do NOT expose raw retrieval information.

Do NOT expose:

- source numbers
- scores
- rankings
- metadata
- internal search information
- retrieval information

${
    isBZUQuery
        ? (
            officialKnowledgeText ||
            "No BZU-specific knowledge was retrieved."
        )
        : "BZU knowledge is NOT applicable to this question."
}

======================================================
FINAL RULE
======================================================

If BZU-specific:

Use retrieved BZU knowledge only.

If information is unavailable, say:

"I could not find this information in my BZU knowledge."

If NON-BZU:

Do NOT use BZU knowledge.

Answer normally using general AI knowledge.

Never force a general question into a BZU context.

Always answer ONLY the CURRENT USER QUESTION.

Keep simple answers concise.

Use headings, bullets, tables, or examples when useful.
`;

        // ==================================================
        // ADD SYSTEM MESSAGE
        // ==================================================

        chatMessages.push({
            role: "system",
            content: systemPrompt
        });

        // ==================================================
        // ADD MEMORY ONLY IF ALLOWED
        // ==================================================

        if (useMemory && previousMessages.length > 0) {

            chatMessages.push(
                ...previousMessages.slice(-5)
            );
        }

        // ==================================================
        // ADD CURRENT USER QUESTION ONLY
        // ==================================================

        chatMessages.push({
            role: "user",
            content: String(latestMessage)
        });

        // ==================================================
        // DEBUG
        // ==================================================

        console.log("=================================");
        console.log("FINAL CHAT MESSAGE COUNT:");
        console.log(chatMessages.length);
        console.log("=================================");

        // ==================================================
        // SEND TO GROQ
        // ==================================================

        console.log("Sending request to Groq...");

        const completion =
            await client.chat.completions.create({

                model: AI_MODEL,

                messages: chatMessages,

                temperature: 0.2,

                max_tokens: MAX_CHAT_TOKENS
            });

        // ==================================================
        // GET RESPONSE
        // ==================================================

        const reply =
            completion?.choices?.[0]?.message?.content ||
            "I could not generate a response.";

        console.log("=================================");
        console.log("AI REPLY:");
        console.log(reply);
        console.log("=================================");

        // ==================================================
        // END PART 3
        // ==================================================        // ==================================================
        // PART 4/5 - MEMORY + DOCUMENT UPLOAD
        // ==================================================

        // ==================================================
        // SAVE PERSONAL MEMORY ONLY
        // ==================================================

        if (useMemory) {

            try {

                const currentConversation =
                    messages
                        .filter(
                            (msg) =>
                                msg.role !== "system"
                        )
                        .map((msg) => ({
                            role:
                                msg.role || "user",

                            content:
                                msg.text ||
                                msg.content ||
                                ""
                        }));

                const updatedConversation = [

                    ...previousMessages.slice(-10),

                    ...currentConversation,

                    {
                        role: "assistant",
                        content: reply
                    }
                ];

                memoryService.saveMemory(
                    userId,
                    updatedConversation
                );

                console.log(
                    "PERSONAL MEMORY SAVED"
                );

            } catch (memoryError) {

                console.error(
                    "MEMORY SAVE ERROR:",
                    memoryError
                );
            }

        } else {

            console.log(
                "MEMORY NOT SAVED"
            );
        }

        // ==================================================
        // RESPONSE
        // ==================================================

        return res.json({
            success: true,
            reply: reply
        });

    } catch (error) {

        // ==================================================
        // CHAT ERROR
        // ==================================================

        console.error("=================================");
        console.error("CHAT ERROR");
        console.error(error);
        console.error("=================================");

        return res.status(500).json({

            success: false,

            reply:
                error?.message ||
                "Unable to connect to Groq AI."
        });
    }
});

// ======================================================
// DOCUMENT UPLOAD
// ======================================================

app.post(
    "/upload",
    upload.single("file"),
    async (req, res) => {

        console.log(
            "========== UPLOAD START =========="
        );

        try {

            // ==================================================
            // CHECK FILE
            // ==================================================

            if (!req.file) {

                return res.status(400).json({
                    success: false,
                    reply: "No file uploaded."
                });
            }

            let documentText = "";

            // ==================================================
            // PDF
            // ==================================================

            if (
                req.file.mimetype ===
                "application/pdf"
            ) {

                const pdf =
                    await pdfParse(
                        fs.readFileSync(
                            req.file.path
                        )
                    );

                documentText =
                    pdf.text || "";
            }

            // ==================================================
            // DOCX
            // ==================================================

            else if (
                req.file.mimetype ===
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            ) {

                const result =
                    await mammoth.extractRawText({
                        path: req.file.path
                    });

                documentText =
                    result.value || "";
            }

            // ==================================================
            // TXT
            // ==================================================

            else if (
                req.file.mimetype ===
                "text/plain"
            ) {

                documentText =
                    fs.readFileSync(
                        req.file.path,
                        "utf8"
                    );
            }

            // ==================================================
            // IMAGE OCR
            // ==================================================

            else if (
                req.file.mimetype &&
                req.file.mimetype.startsWith(
                    "image/"
                )
            ) {

                const result =
                    await Tesseract.recognize(
                        req.file.path,
                        "eng"
                    );

                documentText =
                    result?.data?.text || "";
            }

            // ==================================================
            // UNSUPPORTED
            // ==================================================

            else {

                if (
                    fs.existsSync(
                        req.file.path
                    )
                ) {

                    fs.unlinkSync(
                        req.file.path
                    );
                }

                return res.status(400).json({

                    success: false,

                    reply:
                        "Only PDF, DOCX, TXT and image files are supported."
                });
            }

            // ==================================================
            // DELETE TEMP FILE
            // ==================================================

            if (
                fs.existsSync(
                    req.file.path
                )
            ) {

                fs.unlinkSync(
                    req.file.path
                );
            }

            // ==================================================
            // EMPTY DOCUMENT
            // ==================================================

            if (
                !documentText.trim()
            ) {

                return res.status(400).json({

                    success: false,

                    reply:
                        "The uploaded document is empty."
                });
            }

            // ==================================================
            // LIMIT DOCUMENT SIZE
            // ==================================================

            documentText =
                documentText.substring(
                    0,
                    12000
                );

            console.log(
                "Document characters:",
                documentText.length
            );

            // ==================================================
            // DOCUMENT AI ANALYSIS
            // ==================================================

            const completion =
                await client.chat.completions.create({

                    model: AI_MODEL,

                    temperature: 0.2,

                    max_tokens:
                        MAX_DOCUMENT_TOKENS,

                    messages: [

                        {
                            role: "system",

                            content: `
You are an AI Document Assistant.

Analyze ONLY the uploaded document.

Do not use outside knowledge.

Provide:

# Summary

# Important Points

# Main Topics

# Key Information

Use Markdown formatting.

If something is not present in the document,
do not invent it.
`
                        },

                        {
                            role: "user",

                            content: `
DOCUMENT:

${documentText}

Analyze this document.
`
                        }
                    ]
                });

            // ==================================================
            // DOCUMENT RESPONSE
            // ==================================================

            const documentReply =
                completion?.choices?.[0]?.message?.content ||
                "Unable to analyze the document.";

            return res.json({

                success: true,

                reply: documentReply
            });

        } catch (error) {

            console.error(
                "UPLOAD ERROR:",
                error
            );

            if (
                req.file &&
                fs.existsSync(
                    req.file.path
                )
            ) {

                try {

                    fs.unlinkSync(
                        req.file.path
                    );

                } catch (cleanupError) {

                    console.error(
                        "FILE CLEANUP ERROR:",
                        cleanupError
                    );
                }
            }

            return res.status(500).json({

                success: false,

                reply:
                    error?.message ||
                    "Document analysis failed."
            });
        }
    }
);

// ======================================================
// END PART 4
// ======================================================// ======================================================
// PART 5/5 - ROUTES + SERVER START
// ======================================================

// ======================================================
// TEST BZU KNOWLEDGE
// ======================================================

app.get(
    "/test-bzu",
    (req, res) => {

        try {

            const query =
                req.query.q || "bzu";

            const result =
                searchKnowledge(query);

            return res.json({

                success: true,

                query: query,

                knowledge: result
            });

        } catch (error) {

            console.error(
                "TEST BZU ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    error?.message ||
                    "Knowledge search failed."
            });
        }
    }
);

// ======================================================
// HEALTH CHECK
// ======================================================

app.get(
    "/health",
    (req, res) => {

        return res.json({

            success: true,

            service:
                "BZU AI Assistant",

            version:
                "6.0",

            status:
                "Running",

            ai:
                "Groq",

            model:
                AI_MODEL,

            node:
                process.version,

            uptime:
                process.uptime(),

            serverTime:
                new Date()
        });
    }
);

// ======================================================
// API STATUS
// ======================================================

app.get(
    "/api/status",
    (req, res) => {

        return res.json({

            success: true,

            status:
                "Online",

            service:
                "BZU AI Assistant",

            ai:
                "Groq",

            model:
                AI_MODEL,

            version:
                "6.0",

            time:
                new Date()
        });
    }
);

// ======================================================
// CLEAR MEMORY
// ======================================================

app.delete(
    "/memory/:userId",
    (req, res) => {

        try {

            const userId =
                req.params.userId;

            const file =
                path.join(
                    __dirname,
                    "data",
                    `${userId}.json`
                );

            if (
                fs.existsSync(file)
            ) {

                fs.unlinkSync(file);
            }

            return res.json({

                success: true,

                message:
                    "Memory cleared successfully."
            });

        } catch (error) {

            console.error(
                "CLEAR MEMORY ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    error?.message ||
                    "Unable to clear memory."
            });
        }
    }
);

// ======================================================
// HOME PAGE
// ======================================================

app.get(
    "/",
    (req, res) => {

        return res.sendFile(
            path.join(
                __dirname,
                "public",
                "CHATBOT.html"
            )
        );
    }
);

// ======================================================
// 404 ROUTE
// ======================================================

app.use(
    (req, res) => {

        return res.status(404).json({

            success: false,

            message:
                "Endpoint not found."
        });
    }
);

// ======================================================
// GLOBAL ERROR HANDLER
// ======================================================

app.use(
    (error, req, res, next) => {

        console.error(
            "GLOBAL ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                error?.message ||
                "Internal server error."
        });
    }
);

// ======================================================
// START SERVER
// ======================================================

const PORT =
    process.env.PORT || 3000;

app.listen(
    PORT,
    () => {

        console.clear();

        console.log(
            "===================================================="
        );

        console.log(
            "🧠 BZU AI Assistant v6.0"
        );

        console.log(
            "===================================================="
        );

        console.log(
            `🚀 Server      : http://localhost:${PORT}`
        );

        console.log(
            "🤖 AI Engine   : Groq"
        );

        console.log(
            `🧠 Model       : ${AI_MODEL}`
        );

        console.log(
            "📚 Knowledge   : Enabled"
        );

        console.log(
            "📄 PDF Upload  : Enabled"
        );

        console.log(
            "📘 DOCX Upload : Enabled"
        );

        console.log(
            "📑 TXT Upload  : Enabled"
        );

        console.log(
            "🖼️ OCR Images  : Enabled"
        );

        console.log(
            "👨‍💻 Developer   : Sajjad Haider"
        );

        console.log(
            "🌐 Portfolio   : https://recoveriest.com"
        );

        console.log(
            "🏫 Version     : 6.0"
        );

        console.log(
            "===================================================="
        );

        console.log(
            "✅ Server Started Successfully"
        );

        console.log(
            "===================================================="
        );
    });

// ======================================================
// END SERVER.JS
// ======================================================