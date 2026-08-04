// ======================================================
// BZU AI Assistant v6.0
// Part 1/4 - Server Setup
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

const { searchKnowledge } = require("./searchService");

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

const AI_MODEL = "llama-3.3-70b-versatile";

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

        if (mode === "general") {

            chatMessages = [
      {
    role: "system",

    content: `
You are BZU AI Assistant.

You were developed by Sajjad Haider, a BS Artificial Intelligence student at Bahauddin Zakariya University (BZU), Multan.

You are powered by the Groq AI API using the Llama 3.3 70B Versatile model.

Your purpose is to help students, teachers, researchers, and professionals with accurate and helpful responses.

Be friendly.

Answer naturally.

Use Markdown formatting whenever appropriate.

Keep previous conversation in memory.

If the user asks follow-up questions, answer according to previous messages.

Always identify yourself as "BZU AI Assistant."

Never claim to be ChatGPT, OpenAI, Claude, Gemini, or any other AI assistant.

If someone asks your name, reply:
"My name is BZU AI Assistant."

If someone asks who created or developed you, reply:
"I was developed by Sajjad Haider, a BS Artificial Intelligence student at Bahauddin Zakariya University (BZU), Multan."

If someone asks which AI model powers you, reply:
"I am powered by the Groq AI API using the Llama 3.3 70B Versatile model."
`
},

...messages.map(msg => ({

    role: msg.role,

    content: msg.text

}))
            ];

        }

        // ==========================================
        // BZU CHAT
        // ==========================================

        else {

            const query = cleanQuery(latestMessage);

            const knowledge = searchKnowledge(query);

            console.log("Knowledge Search:");
            console.log(query);

            if (

                knowledge === "Knowledge base is empty." ||

                knowledge === "No relevant information found."

            ) {

                return res.json({

                    success: true,

                    reply:
                    "The official BZU knowledge base does not contain this information."

                });

            }

            chatMessages = [

                {

                    role: "system",

                    content:
`You are the official BZU AI Assistant.

Rules:

1. ONLY answer using the Official Knowledge.

2. NEVER invent information.

3. NEVER use outside knowledge.

4. If the answer is unavailable reply exactly:

"The official BZU knowledge base does not contain this information."

Official Knowledge:

${knowledge}`

                },

                ...messages.map(msg => ({

                    role: msg.role,

                    content: msg.text

                }))

            ];

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

    try {

        // ==========================================
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

        console.error(error);

        // Delete temp file if it exists

        if (

            req.file &&

            fs.existsSync(req.file.path)

        ) {

            fs.unlinkSync(req.file.path);

        }

        return res.status(500).json({

            success: false,

            reply: "Unable to analyze the uploaded document."

        });

    }

});

// ======================================================
// END OF PART 3
// ======================================================// ======================================================
// PART 4 OF 4
// FILE UPLOAD + ROUTES + SERVER
// ======================================================

// ======================================================
// FILE UPLOAD API
// ======================================================

app.post("/upload", upload.single("file"), async (req, res) => {

    try {

        if (!req.file) {
            return res.status(400).json({
                success: false,
                reply: "No file uploaded."
            });
        }

        let documentText = "";

        // ================= PDF =================

        if (req.file.mimetype === "application/pdf") {

            const pdf = await pdfParse(fs.readFileSync(req.file.path));
            documentText = pdf.text;

        }

        // ================= DOCX =================

        else if (
            req.file.mimetype ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ) {

            const result = await mammoth.extractRawText({
                path: req.file.path
            });

            documentText = result.value;

        }

        // ================= TXT =================

        else if (req.file.mimetype === "text/plain") {

            documentText = fs.readFileSync(
                req.file.path,
                "utf8"
            );

        }

        else {

            fs.unlinkSync(req.file.path);

            return res.status(400).json({
                success: false,
                reply: "Only PDF, DOCX and TXT files are supported."
            });

        }

        // Delete temporary file

        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        if (!documentText.trim()) {

            return res.status(400).json({
                success: false,
                reply: "The uploaded document is empty."
            });

        }

        // Limit text

        documentText = documentText.substring(0, 12000);

        const completion =
            await client.chat.completions.create({

                model: "llama-3.3-70b-versatile",

                temperature: 0.2,

                max_tokens: 1200,

                messages: [

                    {
                        role: "system",
                        content:
`You are an AI document assistant.

Analyze ONLY the uploaded document.

Return:

• Summary
• Important points
• Main topics
• Key information

Use Markdown formatting.`
                    },

                    {
                        role: "user",
                        content: documentText
                    }

                ]

            });

        return res.json({

            success: true,

            reply: completion.choices[0].message.content

        });

    }

    catch (error) {

        console.error(error);

        if (
            req.file &&
            fs.existsSync(req.file.path)
        ) {
            fs.unlinkSync(req.file.path);
        }

        return res.status(500).json({

            success: false,

            reply: "Unable to analyze the uploaded document."

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

    }

    catch (err) {

        res.status(500).json({

            success: false,

            message: "Knowledge search failed."

        });

    }

});

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
    console.log("🧠 Model       : llama-3.3-70b-versatile");
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