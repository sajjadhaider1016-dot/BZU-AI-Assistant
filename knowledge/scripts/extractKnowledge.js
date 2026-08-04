const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");

async function extractKnowledge() {

    const pdfPath = path.join(__dirname, "..", "prospectus_2024.pdf");

    if (!fs.existsSync(pdfPath)) {
        console.log("❌ prospectus_2024.pdf not found.");
        return;
    }

    console.log("📖 Reading PDF...");

    const buffer = fs.readFileSync(pdfPath);
    const pdf = await pdfParse(buffer);

    console.log("✅ PDF Loaded");

    const cleanText = pdf.text
        .replace(/\r/g, " ")
        .replace(/\n/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const words = cleanText.split(" ");

    const chunks = [];

    for (let i = 0; i < words.length; i += 120) {

        chunks.push({
            id: chunks.length + 1,
            text: words.slice(i, i + 120).join(" ")
        });

    }

    const outputPath = path.join(__dirname, "..", "knowledge.json");

    fs.writeFileSync(
        outputPath,
        JSON.stringify(chunks, null, 2)
    );

    console.log("=================================");
    console.log("✅ Knowledge Extraction Complete");
    console.log("Chunks:", chunks.length);
    console.log("Saved:", outputPath);
    console.log("=================================");
}

extractKnowledge();