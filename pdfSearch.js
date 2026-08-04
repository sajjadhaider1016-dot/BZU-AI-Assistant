const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");

async function searchPDF(query) {

    try {

        const folder = path.join(__dirname, "knowledge");

        if (!fs.existsSync(folder)) {
            return "Knowledge folder not found.";
        }

        const pdfFiles = fs.readdirSync(folder)
            .filter(file => file.toLowerCase().endsWith(".pdf"));

        if (pdfFiles.length === 0) {
            return "No PDF files found.";
        }

        const keywords = query
            .toLowerCase()
            .split(/\s+/)
            .filter(word => word.length > 2);

        let results = [];

        for (const file of pdfFiles) {

            const pdfPath = path.join(folder, file);

            const buffer = fs.readFileSync(pdfPath);

            const pdf = await pdfParse(buffer);
console.log("Reading PDF:", file);
console.log("Length:", pdf.text.length);
console.log("First 500 characters:");
console.log(pdf.text.substring(0,500));
            // Remove extra spaces/newlines
            const cleanText = pdf.text
                .replace(/\r/g, " ")
                .replace(/\n/g, " ")
                .replace(/\s+/g, " ");

            // Split every 120 words
            const words = cleanText.split(" ");

            for (let i = 0; i < words.length; i += 120) {

                const chunk = words.slice(i, i + 120).join(" ");

                const lower = chunk.toLowerCase();

                let score = 0;

                for (const keyword of keywords) {

                    if (lower.includes(keyword)) {
                        score++;
                    }

                }

                if (score > 0) {

                    results.push({
                        score,
                        text: chunk,
                        file
                    });

                }

            }

        }

        results.sort((a, b) => b.score - a.score);

        const unique = [];
        const seen = new Set();

        for (const item of results) {

            if (!seen.has(item.text)) {

                seen.add(item.text);
                unique.push(item);

            }

        }

        if (unique.length === 0) {

            return "No relevant information found in the prospectus.";

        }

        return unique
            .slice(0, 3)
            .map(item => item.text)
            .join("\n\n--------------------------------------------\n\n");

    }

    catch (err) {

        console.log(err);

        return "Unable to search PDF.";

    }

}

module.exports = {
    searchPDF
};