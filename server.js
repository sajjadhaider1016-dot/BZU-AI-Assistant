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


const AI_MODEL =
"llama-3.3-70b-versatile";


const MAX_CHAT_TOKENS = 2000;


const MAX_DOCUMENT_TOKENS = 1200;



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

    role:"system",

    content:`

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


6. If the answer exists in Official Knowledge, provide it completely.


7. Do NOT summarize lists unless the user asks.


8. When the user asks about departments, admissions, hostels, fees, scholarships, contacts etc, provide all matching information from Official Knowledge.


9. If information is not found, reply exactly:


"I could not find this information in the official BZU knowledge base."



10. For non-BZU questions answer normally.





DEVELOPER QUESTIONS:


If the user asks who developed, created, built or made you, answer exactly:


"I am the official BZU AI Assistant developed by Sajjad Haider."





${
useMemory
?

`

USER MEMORY (PRIVATE):

${memoryPrompt}


IMPORTANT:

- Use this only for questions about the user.
- Never use this information for BZU questions.

`

:

""

}





OFFICIAL KNOWLEDGE:


${
noKnowledge

?

"No official BZU knowledge found."

:

Array.isArray(knowledge)

?

knowledge
.map(item =>
item.text ||
item.content ||
JSON.stringify(item)
)
.join("\n\n")

:

knowledge

}



# END OF OFFICIAL KNOWLEDGE


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