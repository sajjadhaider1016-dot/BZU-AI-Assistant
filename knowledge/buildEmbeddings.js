const fs = require("fs");
const path = require("path");
const axios = require("axios");

const knowledge = require("./knowledge.json");

async function embed(text) {
    const response = await axios.post(
        "http://localhost:11434/api/embeddings",
        {
            model: "nomic-embed-text",
            prompt: text
        }
    );

    return response.data.embedding;
}

async function buildEmbeddings() {

    let output = [];

    for (const item of knowledge) {

        console.log("Embedding:", item.title);

        const embedding = await embed(item.text);

        output.push({
            id: item.id,
            title: item.title,
            text: item.text,
            embedding: embedding
        });

    }

    fs.writeFileSync(
        path.join(__dirname, "embeddings.json"),
        JSON.stringify(output, null, 2)
    );

    console.log("Done!");
}

buildEmbeddings();