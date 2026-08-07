// ======================================================
// BZU AI Assistant v6.0
// Part 1/5 - Server Setup
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
// EXPRESS
// ======================================================

const app = express();


// ======================================================
// MIDDLEWARE
// ======================================================

app.use(cors());


app.use(express.json({
    limit:"20mb"
}));


app.use(express.urlencoded({
    extended:true,
    limit:"20mb"
}));


app.use(
    express.static(
        path.join(__dirname,"public")
    )
);



// ======================================================
// FILE UPLOAD
// ======================================================

const upload = multer({

    dest:"uploads/",

    limits:{
        fileSize:20 * 1024 * 1024
    }

});



// ======================================================
// GROQ CLIENT
// ======================================================


const client = new OpenAI({

    apiKey:process.env.GROQ_API_KEY,

    baseURL:
    "https://api.groq.com/openai/v1"

});



// ======================================================
// CONFIG
// ======================================================

const AI_MODEL = "llama-3.1-8b-instant";


const MAX_CHAT_TOKENS = 800;


const MAX_DOCUMENT_TOKENS = 1000;



// ======================================================
// CLEAN QUERY
// ======================================================


function cleanQuery(message){

    return message

    .toLowerCase()

    .replace(/tell me about/gi,"")

    .replace(/what is/gi,"")

    .replace(/what are/gi,"")

    .replace(/give me/gi,"")

    .replace(/information about/gi,"")

    .replace(/details about/gi,"")

    .replace(/please/gi,"")

    .replace(/\?/g,"")

    .trim();

}



// ======================================================
// MODE DETECTION
// ======================================================


function detectMode(message){


const text = message.toLowerCase();



const imageWords=[

"image",
"draw",
"picture",
"photo",
"logo",
"generate image"

];



if(
imageWords.some(
word=>text.includes(word)
)
){

return "image";

}




const bzuWords=[

"bzu",
"zakariya",
"bahauddin",
"admission",
"hostel",
"fee",
"fees",
"department",
"faculty",
"scholarship",
"exam",
"result",
"lms",
"prospectus",
"program",
"degree",
"bs",
"msc",
"mphil",
"phd",
"computer science",
"artificial intelligence"

];



if(
bzuWords.some(
word=>text.includes(word)
)
){

return "bzu";

}


return "general";


}



// ======================================================
// END PART 1
// ======================================================// ======================================================
// PART 2/5 - CHAT API
// ======================================================


app.post("/chat", async (req,res)=>{


try{


// ======================================================
// RECEIVE REQUEST
// ======================================================


const {

    messages=[],

    memory={},

    userId="default"


}=req.body;



console.log("Received memory:",memory);




// ======================================================
// VALIDATE MESSAGE
// ======================================================


if(
!Array.isArray(messages) ||
messages.length===0
){


return res.status(400).json({

success:false,

reply:"No messages received."

});


}





// ======================================================
// LATEST USER MESSAGE
// ======================================================


const latestMessage =
messages[messages.length-1]?.text || "";



if(!latestMessage.trim()){


return res.status(400).json({

success:false,

reply:"Please enter a message."

});


}




// ======================================================
// CLEAN QUERY
// ======================================================


const query =
cleanQuery(latestMessage);



console.log("QUESTION:",query);





// ======================================================
// MEMORY QUESTION DETECTION
// ======================================================


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





// ======================================================
// BZU QUESTION DETECTION
// ======================================================


const bzuKeywords=[


"bzu",

"bahauddin",

"zakariya",

"university",

"admission",

"hostel",

"department",

"faculty",

"fee",

"scholarship",

"program",

"degree",

"exam",

"result"


];



const isBZUQuestion =
bzuKeywords.some(word=>

query.includes(word)

);





// ======================================================
// FINAL MEMORY DECISION
// ======================================================


const useMemory =
isMemoryQuestion && !isBZUQuestion;



console.log(
"USE MEMORY:",
useMemory
);





// ======================================================
// MEMORY PROMPT
// ======================================================


const memoryPrompt = `

Name: ${memory.name || ""}

University: ${memory.university || ""}

Semester: ${memory.semester || ""}

Department: ${memory.department || ""}

City: ${memory.city || ""}

Email: ${memory.email || ""}

Phone: ${memory.phone || ""}

`;






// ======================================================
// LOAD OLD MEMORY ONLY FOR PERSONAL QUESTIONS
// ======================================================
// ==========================================
// LOAD MEMORY ONLY FOR PERSONAL QUESTIONS
// ==========================================

let previousMessages = [];

if (useMemory) {

    previousMessages = memoryService.loadMemory(userId);

    console.log("MEMORY LOADED");

}
else {

    console.log("MEMORY DISABLED FOR BZU");

}
// ======================================================
// MODE
// ======================================================


const mode =
detectMode(latestMessage);



console.log("====================");

console.log("MODE:",mode);

console.log("USER:",latestMessage);

console.log("====================");






// ======================================================
// IMAGE MODE
// ======================================================


if(mode==="image"){


return res.json({

success:true,

reply:
"Image generation will be available in a future version."

});


}





// ======================================================
// DEVELOPER QUESTION
// ======================================================


if(

query.includes("who developed") ||

query.includes("who created") ||

query.includes("who made") ||

query.includes("who built")


){


return res.json({

success:true,

reply:
"I am the official BZU AI Assistant developed by Sajjad Haider."

});


}






// ======================================================
// KNOWLEDGE SEARCH
// ======================================================


let knowledge=[];



// NEVER search knowledge for personal questions

if(!isMemoryQuestion){


knowledge =
searchKnowledge(query);


}



console.log("===== KNOWLEDGE =====");

console.log(knowledge);





const noKnowledge =

!knowledge ||

knowledge.length===0;

const officialKnowledgeText = knowledge
    .map((item, index) => {
        return `
SOURCE ${index + 1}
TITLE: ${item.title}

CONTENT:
${item.text}
`;
    })
    .join("\n==============================\n");

// ======================================================
// CONTINUE PART 3
// ======================================================// ======================================================
// PART 3/5 - BUILD CHAT + GROQ
// ======================================================



let chatMessages = [];



// ======================================================
// SYSTEM PROMPT
// ======================================================

chatMessages.push({
    role: "system",

    content: `
You are the official BZU AI Assistant.

IDENTITY:

- Your name is BZU AI Assistant.
- You were developed by Sajjad Haider.
- You help students with BZU information and general questions.

RULES:

1. Use User Memory ONLY when the user's question is about themselves.

2. Never mention user's personal information unless they explicitly ask.

3. For BZU questions, completely ignore User Memory.

4. Answer BZU questions ONLY from the Official Knowledge below.

5. Do NOT use your own knowledge for BZU questions.

6. NEVER invent, estimate, assume, calculate, or infer missing BZU information.

7. A fee amount may ONLY be given when the exact program and exact fee amount are explicitly present in Official Knowledge.

8. If Official Knowledge contains a program name but does NOT contain its exact fee amount, do NOT create a fee amount for that program.

9. If the user asks for a specific program, provide only the information explicitly available for that program.

10. If the user asks for a general category such as "fee structure", "admissions", "departments", "hostels", "scholarships", or "contacts", provide ALL matching information actually present in Official Knowledge.

11. Do NOT fill missing information using general knowledge, previous conversations, assumptions, or other programs' fees.

12. If the answer is not found in Official Knowledge, reply exactly:

"I could not find this information in the official BZU knowledge base."

13. For non-BZU questions, answer normally.

14. PROGRAM-SPECIFIC QUESTIONS:

When the user asks about a specific BZU program, search Official Knowledge for the exact program name.

Only provide information explicitly available for that exact program.

Never copy a fee from another program.

Never assume that two programs have the same fee unless Official Knowledge explicitly states that they have the same fee.

If the program is found but its exact fee is not available, clearly state that the exact fee is not available in the retrieved Official Knowledge.

If multiple versions of the same program exist, such as Morning and Evening, do not choose one automatically unless the user specifies the program mode.

If the user asks for a program without specifying Morning or Evening and Official Knowledge contains both Morning and Evening fees, clearly show both options and label them correctly.

If only one mode is available in Official Knowledge, clearly state which mode that fee belongs to.

15. FEE QUESTIONS:

For fee-related questions, identify:

1. Exact program name
2. Faculty, when available
3. Program mode such as Morning or Evening
4. Semester/year when relevant

A fee must ONLY be provided when the exact fee is explicitly present in Official Knowledge.

Never copy a fee from another program.

Never copy a Morning fee to Evening.

Never copy an Evening fee to Morning.

Never assume that similar program names have the same fee.

If the user asks "BBA fee" without specifying Morning or Evening:

- Check whether Official Knowledge contains both Morning and Evening BBA fees.
- If both are available, provide both and clearly label them Morning and Evening.
- If only one mode is available, provide that fee and clearly state the mode.
- If the mode cannot be determined from Official Knowledge, ask the user to specify Morning or Evening.
- Do not silently select Evening.

If the retrieved result is specifically "BBA (Hons) IMS", do not automatically treat it as every BBA program unless Official Knowledge explicitly establishes that equivalence.

16. GENERAL FEE STRUCTURE QUESTIONS:

If the user asks for a general fee structure, provide all matching fee information available in Official Knowledge.

Always preserve the program mode exactly as written in Official Knowledge.

For example:

BBA (Hons) IMS — BS EVENING

must remain clearly identified as an Evening program.

Do not remove "Morning" or "Evening" labels.

Do not merge Morning and Evening fees.

Do not combine fees from different rows.

Do not invent missing amounts.

17. EXACT INFORMATION:

Official Knowledge has priority over model knowledge.

Use the exact program name, mode, semester and fee amount provided by Official Knowledge.

Do not round, modify, convert, reinterpret, or substitute an amount.

18. NO HALLUCINATION:

Never create or assume a BZU fee, admission requirement, department, scholarship, hostel information, contact, date, program information, or other university-specific information that is not explicitly supported by Official Knowledge.

Never use a fee from a retrieved result merely because the program name is similar.

The retrieved result must be relevant to the requested program.

If the user specifies a program mode such as Morning or Evening, the retrieved result must match that mode.

If the user does NOT specify Morning or Evening, do not reject a relevant result because its mode is specified in Official Knowledge.

Instead, clearly state the mode attached to the retrieved program.

For example:

User asks:
"BBA fee"

Official Knowledge contains:
"BBA (Hons) IMS — BS EVENING"

This is a valid relevant result.

Use the official program name:
"BBA (Hons) IMS"

and clearly state:
"Mode: BS EVENING"

Do NOT invent a Morning BBA fee.

Do NOT change an Evening fee into a Morning fee.

Do NOT assume that an Evening fee applies to another program.

Only provide fee amounts that are explicitly present in Official Knowledge.

19. CONFLICTING OR AMBIGUOUS RETRIEVAL:

Sometimes Official Knowledge may contain multiple results for a query.

Do not automatically use the first result.

Compare the retrieved results with the user's question.

When the user uses a shortened or common program name, match it to the explicitly listed official program name when the relationship is clear from Official Knowledge.

For example:

- User asks: "BBA fee"
- Official Knowledge contains: "BBA (Hons) IMS"
- Treat "BBA" as referring to the retrieved "BBA (Hons) IMS" entry ONLY when that is the relevant BBA entry available in Official Knowledge.

However, ALWAYS preserve the official program name in the answer.

For the BBA example, answer using:

"BBA (Hons) IMS"

and do NOT rename it simply as "BBA".

If the retrieved BBA entry is:

"BBA (Hons) IMS — BS EVENING"

then clearly state that the retrieved official information is for the Evening program.

If the user did not specify Morning or Evening and the retrieved BBA information is only for Evening, provide the Evening fee and clearly label it as:

Program: BBA (Hons) IMS
Mode: BS EVENING

Do NOT invent a Morning fee.

Do NOT assume that the Evening fee applies to a separate Morning program.

If both Morning and Evening BBA entries are explicitly available in Official Knowledge, provide both separately.

If only one BBA entry is explicitly available, provide only that entry and clearly state its program mode.

Never say:

"I could not find this information in the official BZU knowledge base."

when a relevant official BBA entry has actually been retrieved.

Only use the missing-information response when no relevant BBA information exists anywhere in Official Knowledge.
20. RESPONSE CONSISTENCY:

The response must never contradict itself.

Do not write:

"I could not find this information."

and then provide a fee immediately afterward.

If valid information was found, provide it directly.

If valid information was not found, provide only:

"I could not find this information in the official BZU knowledge base."
21. RETRIEVED OFFICIAL KNOWLEDGE:

The section named "RETRIEVED OFFICIAL KNOWLEDGE" contains the actual search results selected for the current user question.

Use the retrieved results as the primary source for the current BZU answer.

Before answering, inspect ALL retrieved sources. Do not automatically use only the first result.

If a relevant retrieved source contains the requested information, answer from that source.

Do not say that information was not found when the retrieved knowledge contains relevant information.

For program-specific questions, match the requested program against the retrieved program name and content.

For fee questions, only provide a fee when an exact fee amount is explicitly present for the requested program.

Never use a fee from another program.

Never infer an MBA fee from BBA information.

Never infer a BBA fee from MBA information.

If the retrieved knowledge contains information about a program but does not contain its fee, do not invent a fee.

If no retrieved source contains the requested information, reply exactly:

"I could not find this information in the official BZU knowledge base."
21. DEVELOPER QUESTIONS:

If the user asks who developed, created, built or made you, answer exactly:

"I am the official BZU AI Assistant developed by Sajjad Haider."
21. RESPONSE STYLE:

For straightforward BZU questions, answer directly and concisely.

Do not repeat unnecessary warnings or explanations.

For fee questions, provide:
- Official program name
- Program mode
- Faculty when available
- Exact fee amount(s)

If the retrieved program is a specific variant such as BBA (Hons) IMS, clearly identify that variant.

Do not add unnecessary disclaimers after providing valid official information.
${
    useMemory
        ? `
USER MEMORY (PRIVATE):

${memoryPrompt}

IMPORTANT:

- Use this only for questions about the user.
- Never use this information for BZU questions.
`
        : ""
}

OFFICIAL KNOWLEDGE:

${
    noKnowledge
        ? "No official BZU knowledge found."
        : Array.isArray(knowledge)
            ? knowledge
                .map(item =>
                    item.text ||
                    item.content ||
                    JSON.stringify(item)
                )
                .join("\\n\\n")
            : knowledge
}

# END OF OFFICIAL KNOWLEDGE
======================================================
RETRIEVED OFFICIAL KNOWLEDGE
======================================================

${officialKnowledgeText}

======================================================
END RETRIEVED OFFICIAL KNOWLEDGE
======================================================
`
});
// ======================================================
// ADD PREVIOUS MEMORY ONLY IF ALLOWED
// ======================================================
if (useMemory) {

    chatMessages.push(
        ...previousMessages.slice(-5)
    );

}

// ======================================================
// ADD CURRENT CHAT
// ======================================================

// ==========================================
// ADD CURRENT CHAT
// ==========================================

chatMessages.push(

    ...messages
    .slice(-3)
    .map(msg => ({

        role: msg.role,

        content: msg.text

    }))

);





console.log("FINAL CHAT:");

console.log(chatMessages);






// ======================================================
// SEND TO GROQ
// ======================================================


console.log("Sending to Groq...");



const completion =
await client.chat.completions.create({


model:AI_MODEL,


messages:chatMessages,


temperature:0.2,


max_tokens:MAX_CHAT_TOKENS


});






const reply =
completion.choices[0].message.content;





console.log("==============================");

console.log("AI REPLY:");

console.log(reply);

console.log("==============================");






// ======================================================
// SAVE ONLY PERSONAL MEMORY
// ======================================================
// ==========================================
// SAVE MEMORY ONLY FOR PERSONAL QUESTIONS
// ==========================================

if (useMemory) {

    const updatedConversation = [

        ...previousMessages.slice(-10),

        ...messages
        .filter(msg => msg.role !== "system")
        .map(msg => ({
            role: msg.role,
            content: msg.text
        })),

        {
            role:"assistant",
            content:reply
        }

    ];


    memoryService.saveMemory(
        userId,
        updatedConversation
    );

    console.log("MEMORY SAVED");

}
else {

    console.log("MEMORY NOT SAVED");

}
// ======================================================
// RESPONSE
// ======================================================


return res.json({

success:true,

reply

});





}



// ======================================================
// ERROR HANDLER
// ======================================================


catch(error){


console.error("CHAT ERROR");

console.error(error);



return res.status(500).json({

success:false,

reply:
error.message ||
"Unable to connect to Groq AI."

});


}



});



// ======================================================
// END PART 3
// ======================================================// ======================================================
// PART 4/5 - DOCUMENT UPLOAD & ANALYSIS
// ======================================================



app.post(
"/upload",
upload.single("file"),
async(req,res)=>{


console.log("========== UPLOAD START ==========");



try{


// ======================================================
// CHECK FILE
// ======================================================


if(!req.file){


return res.status(400).json({

success:false,

reply:"No file uploaded."

});


}



let documentText="";




// ======================================================
// PDF FILE
// ======================================================


if(
req.file.mimetype === "application/pdf"
){


const pdf =
await pdfParse(

fs.readFileSync(
req.file.path
)

);



documentText = pdf.text;



}






// ======================================================
// DOCX FILE
// ======================================================


else if(

req.file.mimetype ===
"application/vnd.openxmlformats-officedocument.wordprocessingml.document"

){


const result =
await mammoth.extractRawText({

path:req.file.path

});



documentText =
result.value;



}






// ======================================================
// TXT FILE
// ======================================================


else if(

req.file.mimetype ===
"text/plain"

){


documentText =
fs.readFileSync(

req.file.path,

"utf8"

);



}






// ======================================================
// IMAGE OCR
// ======================================================


else if(

req.file.mimetype.startsWith("image/")

){


const result =
await Tesseract.recognize(

req.file.path,

"eng"

);



documentText =
result.data.text;



}







// ======================================================
// UNSUPPORTED FILE
// ======================================================


else{


if(fs.existsSync(req.file.path)){


fs.unlinkSync(
req.file.path
);


}



return res.status(400).json({

success:false,

reply:
"Only PDF, DOCX, TXT and image files are supported."

});


}







// ======================================================
// DELETE TEMP FILE
// ======================================================


if(
fs.existsSync(req.file.path)
){


fs.unlinkSync(
req.file.path
);


}







// ======================================================
// EMPTY DOCUMENT
// ======================================================


if(!documentText.trim()){


return res.status(400).json({

success:false,

reply:
"The uploaded document is empty."

});


}






// ======================================================
// LIMIT SIZE
// ======================================================


documentText =
documentText.substring(0,12000);



console.log(
"Document characters:",
documentText.length
);








// ======================================================
// SEND DOCUMENT TO GROQ
// ======================================================


const completion =
await client.chat.completions.create({



model:AI_MODEL,



temperature:0.2,



max_tokens:
MAX_DOCUMENT_TOKENS,



messages:[



{


role:"system",


content:`

You are an AI Document Assistant.


Analyze ONLY the uploaded document.


Do not use outside knowledge.


Provide:


# Summary


# Important Points


# Main Topics


# Key Information


Use Markdown formatting.


`


},





{


role:"user",


content:`

DOCUMENT:


${documentText}



Analyze this document.

`


}



]



});







return res.json({


success:true,


reply:
completion.choices[0]
.message.content



});






}





catch(error){


console.error("UPLOAD ERROR");

console.error(error);




if(
req.file &&
fs.existsSync(req.file.path)
){


fs.unlinkSync(
req.file.path
);


}





return res.status(500).json({


success:false,


reply:
error.message ||
"Document analysis failed."


});




}



});




// ======================================================
// END PART 4
// ======================================================// ======================================================
// PART 5/5 - ROUTES + SERVER START
// ======================================================



// ======================================================
// TEST KNOWLEDGE SEARCH
// ======================================================


app.get("/test-bzu",(req,res)=>{


try{


const query =
req.query.q || "bzu";


const result =
searchKnowledge(query);



res.json({

success:true,

query,

knowledge:result

});



}

catch(error){


console.error(error);



res.status(500).json({

success:false,

message:error.message

});


}


});







// ======================================================
// HEALTH CHECK
// ======================================================


app.get("/health",(req,res)=>{


res.json({

success:true,

service:"BZU AI Assistant",

version:"6.0",

status:"Running",

ai:"Groq",

model:AI_MODEL,

node:process.version,

uptime:process.uptime(),

serverTime:new Date()

});


});







// ======================================================
// API STATUS
// ======================================================


app.get("/api/status",(req,res)=>{


res.json({

success:true,

status:"Online",

service:"BZU AI Assistant",

ai:"Groq",

model:AI_MODEL,

version:"6.0",

time:new Date()

});


});







// ======================================================
// CLEAR MEMORY
// ======================================================


app.delete(
"/memory/:userId",
(req,res)=>{


try{


const userId =
req.params.userId;



const file =
path.join(

__dirname,

"data",

`${userId}.json`

);




if(
fs.existsSync(file)
){


fs.unlinkSync(file);


}



res.json({

success:true,

message:
"Memory cleared successfully."

});



}

catch(error){



res.status(500).json({

success:false,

message:error.message

});


}



});







// ======================================================
// HOME PAGE
// ======================================================


app.get("/",(req,res)=>{


res.sendFile(

path.join(

__dirname,

"public",

"CHATBOT.html"

)

);


});







// ======================================================
// 404 ROUTE
// ======================================================


app.use((req,res)=>{


res.status(404).json({

success:false,

message:"Endpoint not found."

});


});








// ======================================================
// START SERVER
// ======================================================



const PORT =
process.env.PORT || 3000;




app.listen(PORT,()=>{



console.clear();



console.log(
"===================================================="
);


console.log(
"🧠 BZU AI Assistant"
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
"👨‍💻 Developer  : Sajjad Haider"
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