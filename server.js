// ======================================================
// BZU AI Assistant v6.0
// Part 1/4 - Server Setup
// Developed by Sajjad Haider
// ======================================================

require("dotenv").config();
console.log("RUNNING SERVER:", __filename);
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const Tesseract = require("tesseract.js");
const fs = require("fs");
const path = require("path");

const { searchKnowledge } = require("./searchService");
console.log("searchKnowledge =", searchKnowledge);
console.log("typeof searchKnowledge =", typeof searchKnowledge);
// ======================================================
// EXPRESS
// ======================================================

const app = express();

// ======================================================
// MIDDLEWARE
// ======================================================

app.use(cors());

app.use(express.json({
    limit: "20mb"
}));

app.use(express.urlencoded({
    extended: true,
    limit: "20mb"
}));

app.use(express.static(path.join(__dirname, "public")));

// ======================================================
// FILE UPLOAD CONFIGURATION
// ======================================================

const upload = multer({

    dest: "uploads/",

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
// APPLICATION CONFIG
// ======================================================

const AI_MODEL = "llama-3.1-8b-instant";

const MAX_CHAT_TOKENS = 500;

const MAX_DOCUMENT_TOKENS = 1200;

// ======================================================
// STATUS ROUTES
// ======================================================

app.get("/health", (req, res) => {

    res.json({

        success: true,

        service: "BZU AI Assistant",

        version: "6.0",

        ai: "Groq",

        model: AI_MODEL,

        uptime: process.uptime(),

        node: process.version,

        memory: process.memoryUsage(),

        serverTime: new Date()

    });

});

app.get("/api/status", (req, res) => {

    res.json({

        success: true,

        status: "Online",

        ai: "Groq",

        model: AI_MODEL,

        version: "6.0",

        serverTime: new Date()

    });

});

// ======================================================
// HELPER FUNCTIONS
// ======================================================

function cleanQuery(message) {

    return message
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

function detectMode(message) {

    const text = message.toLowerCase();

    const imageKeywords = [

        "image",
        "draw",
        "picture",
        "photo",
        "logo",
        "generate image",
        "create image"

    ];

    if (imageKeywords.some(word => text.includes(word))) {

        return "image";

    }

    const bzuKeywords = [

        "bzu",
        "zakariya",
        "admission",
        "admissions",
        "hostel",
        "fee",
        "fees",
        "semester",
        "department",
        "faculty",
        "transport",
        "scholarship",
        "exam",
        "result",
        "lms",
        "prospectus",
        "program",
        "degree",
        "bs",
        "bsc",
        "msc",
        "mphil",
        "phd",
        "computer science",
        "software engineering",
        "artificial intelligence",
        "data science"

    ];

    if (bzuKeywords.some(word => text.includes(word))) {

        return "bzu";

    }

    return "general";

}

// ======================================================
// END OF PART 1
// ======================================================// ======================================================
// PART 2/4 - CHAT API
// ======================================================

app.post("/chat", async (req, res) => {

    try {

        // ==========================================
        // RECEIVE COMPLETE CONVERSATION
        // ==========================================

        const { messages } = req.body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {

            return res.status(400).json({

                success: false,

                reply: "No messages received."

            });

        }

        // Latest user message

        const latestMessage = messages[messages.length - 1].text;

        if (!latestMessage || !latestMessage.trim()) {

            return res.status(400).json({

                success: false,

                reply: "Please enter a message."

            });

        }

        // ==========================================
        // DETECT CHAT MODE
        // ==========================================

        const mode = detectMode(latestMessage);

        console.log("\n===============================");
        console.log("Mode :", mode);
        console.log("User :", latestMessage);
        console.log("===============================\n");

        // ==========================================
        // IMAGE MODE
        // ==========================================

        if (mode === "image") {

            return res.json({

                success: true,

                reply:
                "Image generation will be available in a future version of BZU AI Assistant."

            });

        }

        // ==========================================
        // BUILD CHAT HISTORY
        // ==========================================

        let chatMessages = [];

        // ==========================================
        // GENERAL CHAT
        // ==========================================
const query = cleanQuery(latestMessage);
if (
    query.includes("who developed you") ||
    query.includes("who created you") ||
    query.includes("who made you") ||
    query.includes("who built you") ||
    query.includes("tell me about yourself")
) {
    return res.json({
        reply: "I am the official BZU AI Assistant, developed by Sajjad Haider. I was created to assist students with BZU-related information and general queries."
    });
}
let knowledge = searchKnowledge(query);

const noKnowledge =
    !knowledge ||
    knowledge.length === 0 ||
    knowledge === "Knowledge base is empty." ||
    knowledge === "No relevant information found.";
        if (mode === "general") {
chatMessages = [
    {
        role: "system",
        content: `You are the official BZU AI Assistant.

Rules:
You are the official BZU AI Assistant.

Identity:
- Your name is BZU AI Assistant.
- You were developed by Sajjad Haider.
- You are an AI assistant created for Bahauddin Zakariya University.
- Your purpose is to help students with BZU information and general questions.

If the user asks:
- Who developed you?
- Who created you?
- Who made you?
- Who built you?
- Tell me about yourself.

Always answer:

"I am the official BZU AI Assistant, developed by Sajjad Haider. I was created to assist students with BZU-related information and general queries."
2. First determine whether the user's question is about BZU.

• If the question is about BZU, use the Official Knowledge below.

• If the Official Knowledge does not contain the answer to a BZU-related question, reply:

"The current BZU knowledge base does not include this information. Please check the latest BZU admission advertisement, official BZU website, or the relevant university office for the most up-to-date information."

• If the question is NOT about BZU, answer normally using your own knowledge.

• If the user asks about your identity (for example: who developed you, who created you, who made you, what are you), answer:

"I am the official BZU AI Assistant developed by Sajjad Haider. I was built to help students with BZU information and general questions."
${noKnowledge ? "" : knowledge}`
    },

    ...messages.map(msg => ({
        role: msg.role,
        content: msg.text
    }))
];
        
messages.map(msg => ({

    role: msg.role,

    content: msg.text

}))
        }

        // ==========================================
        // BZU CHAT
        // ==========================================

        else {

    
console.log("Knowledge returned:", knowledge);
    console.log("Knowledge Search:");
    console.log("Query:", query);
    console.log("Knowledge:", knowledge);

    // If nothing useful is found, fall back to normal AI
    if (
        !knowledge ||
        knowledge === "Knowledge base is empty." ||
        knowledge === "No relevant information found."
    ) {

        chatMessages = [

            {
                role: "system",
                content: `You are BZU AI Assistant.

Answer naturally and professionally.

If the user asks about BZU and the official knowledge is unavailable, answer using your general knowledge but clearly mention that official information should be verified from the latest BZU website or prospectus.

Never invent exact BZU fees, dates or policies.`
            },

            ...messages.map(msg => ({
                role: msg.role,
                content: msg.text
            }))
        ];

    } else {

        chatMessages = [

            {
                role: "system",
                content: `You are the official BZU AI Assistant.

You are the official BZU AI Assistant.

Use ALL of the Official Knowledge below.

If multiple sections are relevant, combine them into one complete answer.

Do not answer using only the first section.

Organize the answer with headings and bullet points.

If the knowledge contains course duration, eligibility, curriculum, career scope, fee, or admissions, include every relevant point.

If the answer exists in the Official Knowledge, answer from it.

If the Official Knowledge is incomplete, say that the information may have changed and recommend checking the latest BZU prospectus or official website.

Official Knowledge:

${knowledge}`
            },

            ...messages.map(msg => ({
                role: msg.role,
                content: msg.text
            }))
        ];

    }

}
        // ==========================================
        // GROQ REQUEST
        // ==========================================

    const completion = await client.chat.completions.create({

            model: AI_MODEL,

            messages: chatMessages,

            temperature: 0.2,

            max_tokens: MAX_CHAT_TOKENS

        });

        const reply = completion.choices[0].message.content;

        console.log("\n============= AI REPLY =============");
        console.log(reply);
        console.log("====================================\n");

        return res.json({

            success: true,

            reply

        });

    }

    catch (error) {

        console.error("\nCHAT ERROR\n");

        console.error(error);

        return res.status(500).json({

            success: false,

            reply: "Unable to connect to Groq AI."

        });

    }

});

// ======================================================
// END OF PART 2
// ======================================================// ======================================================
// PART 3/4 - FILE UPLOAD & DOCUMENT ANALYSIS
// ======================================================
app.post("/upload", upload.single("file"), async (req, res) => {

    console.log("========== UPLOAD START ==========");
    console.log("File:", req.file);

    try {

        console.log("Processing upload...");        // ==========================================
        // CHECK FILE
        // ==========================================

        if (!req.file) {

            return res.status(400).json({

                success: false,

                reply: "No file uploaded."

            });

        }

        let documentText = "";

        // ==========================================
        // READ PDF
        // ==========================================

        if (req.file.mimetype === "application/pdf") {

            const pdf = await pdfParse(

                fs.readFileSync(req.file.path)

            );

            documentText = pdf.text;

        }

        // ==========================================
        // READ DOCX
        // ==========================================

        else if (

            req.file.mimetype ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

        ) {

            const result = await mammoth.extractRawText({

                path: req.file.path

            });

            documentText = result.value;

        }

        // ==========================================
        // READ TXT
        // ==========================================

        else if (

            req.file.mimetype === "text/plain"

        ) {

            documentText = fs.readFileSync(

                req.file.path,

                "utf8"

            );

        }
else if (req.file.mimetype.startsWith("image/")) {

    const result = await Tesseract.recognize(
        req.file.path,
        "eng"
    );

    documentText = result.data.text;

}
        // ==========================================
        // UNSUPPORTED FILE
        // ==========================================

        else {

            if (fs.existsSync(req.file.path)) {

                fs.unlinkSync(req.file.path);

            }

            return res.status(400).json({

                success: false,

                reply: "Only PDF, DOCX and TXT files are supported."

            });

        }

        // ==========================================
        // DELETE TEMP FILE
        // ==========================================

        if (fs.existsSync(req.file.path)) {

            fs.unlinkSync(req.file.path);

        }

        // ==========================================
        // EMPTY FILE
        // ==========================================

        if (!documentText.trim()) {

            return res.status(400).json({

                success: false,

                reply: "The uploaded document is empty."

            });

        }

        // ==========================================
        // LIMIT DOCUMENT SIZE
        // ==========================================

        documentText = documentText.substring(0, 12000);

        console.log("\n=================================");
        console.log("DOCUMENT RECEIVED");
        console.log("Characters :", documentText.length);
        console.log("=================================\n");

        // ==========================================
        // SEND TO GROQ
        // ==========================================

        const completion = await client.chat.completions.create({

            model: AI_MODEL,

            temperature: 0.2,

            max_tokens: MAX_DOCUMENT_TOKENS,

            messages: [

                {

                    role: "system",

                    content:
`You are an AI Document Assistant.

ONLY analyze the uploaded document.

Provide:

# Summary

# Important Points

# Main Topics

# Key Information

Use Markdown formatting.

Do NOT use outside knowledge.`

                },

                {

                    role: "user",

                    content:

`DOCUMENT

${documentText}

Please analyze this document.`

                }

            ]

        });

        return res.json({

            success: true,

            reply: completion.choices[0].message.content

        });

    }

    catch (error) {

        console.error("\nUPLOAD ERROR\n");
console.error("UPLOAD ERROR");
console.error(error);
console.error(error.stack);

        // Delete temp file if it exists

        if (

            req.file &&

            fs.existsSync(req.file.path)

        ) {

            fs.unlinkSync(req.file.path);

        }

        return res.status(500).json({

            success: false,
reply: error.message

        });

    }

});


   
// ======================================================
// TEST KNOWLEDGE SEARCH
// ======================================================

app.get("/test-bzu", (req, res) => {

    try {

        const query = req.query.q || "hostel";

        const result = searchKnowledge(query);

        res.json({
            success: true,
            query,
            knowledge: result
        });

    } catch (err) {

        console.error("TEST ERROR:", err);

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

});   // <-- THIS WAS MISSING

// ======================================================
// HEALTH
// ======================================================

app.get("/health", (req, res) => {

    res.json({
        success: true,
        service: "BZU AI Assistant",
        version: "5.0",
        status: "Online",
        ai: "Groq",
        uptime: process.uptime(),
        serverTime: new Date()
    });

});
    
// ======================================================
// HOME
// ======================================================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(__dirname, "public", "CHATBOT.html")
    );

});

// ======================================================
// 404
// ======================================================

app.use((req, res) => {

    res.status(404).json({

        success: false,

        message: "Endpoint not found."

    });

});

// ======================================================
// START SERVER
// ======================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

    console.clear();

    console.log("====================================================");
    console.log("🧠 BZU AI Assistant");
    console.log("====================================================");
    console.log(`🚀 Server      : http://localhost:${PORT}`);
    console.log("🤖 AI Engine   : Groq");
    console.log("🧠 Model       : llama-3.1-8b-instant");
    console.log("📚 Knowledge   : Enabled");
    console.log("📄 PDF Upload  : Enabled");
    console.log("📘 DOCX Upload : Enabled");
    console.log("📑 TXT Upload  : Enabled");
    console.log("👨‍💻 Developer  : Sajjad Haider");
    console.log("🌐 Portfolio   : https://recoveriest.com");
    console.log("🏫 Version     : 5.0");
    console.log("====================================================");
    console.log("✅ Server Started Successfully");
    console.log("====================================================");

});