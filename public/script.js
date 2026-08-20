/* =====================================================
   BZU AI Assistant
   Developed by Sajjad Haider
   Version 5.0
=====================================================*/


// ================= ELEMENTS =================
let userId = null;
const chatMessages = document.getElementById("chatMessages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileInput");

const voiceBtn = document.getElementById("voiceBtn");

const history = document.getElementById("history");

const welcomeScreen = document.getElementById("welcomeScreen");
const chatContainer = document.getElementById("chatContainer");

const typingIndicator = document.getElementById("typingIndicator");


// Sidebar

const newChatBtn = document.getElementById("newChatBtn");
const themeBtn = document.getElementById("themeBtn");
const themeToggleBtn = document.getElementById("themeToggleBtn");

const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");

const aboutBtn = document.getElementById("aboutBtn");
const aboutModal = document.getElementById("aboutModal");


// ================= STATE =================

let currentChat = [];

let chats = [];
let isTyping = false;

// ================= LOAD USER CHATS =================

async function loadUserChats() {

    try {

        const response = await fetch("/api/auth/me", {
            credentials: "include"
        });

        if (!response.ok) {

            chats = [];

            return;

        }

        const data = await response.json();

        if (!data.user || !data.user.id) {

            chats = [];

            return;

        }

        userId = data.user.id;

        const storageKey = `bzuChats_${userId}`;

        chats =
            JSON.parse(
                localStorage.getItem(storageKey)
            ) || [];

    }

    catch (error) {

        console.error(
            "Unable to load user chats:",
            error
        );

        chats = [];

    }

}
// ================= MEMORY =================

let memory;

try {

    memory =
        JSON.parse(
            localStorage.getItem("bzuMemory")
        ) ||

        {

            name: "",

            university: "",

            semester: "",

            department: "",

            city: "",

            email: "",

            phone: ""

        };

}

catch {

    memory = {

        name: "",

        university: "",

        semester: "",

        department: "",

        city: "",

        email: "",

        phone: ""

    };

}


// ================= SAVE MEMORY =================

function saveMemory() {

    localStorage.setItem(

        "bzuMemory",

        JSON.stringify(memory)

    );

}


// ================= RESTORE CHAT =================

function restoreLastChat() {

    if (chats.length === 0) {

        newChat();

        return;

    }

    loadChat(chats[0]);

}


// ================= INITIAL UI =================

welcomeScreen.style.display = "block";

chatContainer.style.display = "flex";

typingIndicator.classList.add("hidden");


// ================= LOAD THEME =================

if (

    localStorage.getItem("theme") === "dark"

) {

    document.body.classList.add("dark");

}


// ================= START BUTTONS =================

newChatBtn.addEventListener(

    "click",

    newChat

);


// ================= HISTORY =================

renderHistory();

restoreLastChat();/* =====================================================
   PART 2 - MESSAGE RENDERING
=====================================================*/

// ================= SCROLL =================

function scrollToBottom() {

    chatMessages.scrollTop =
        chatMessages.scrollHeight;

}


// ================= TIME =================

function getCurrentTime() {

    return new Date().toLocaleTimeString([], {

        hour: "2-digit",

        minute: "2-digit"

    });

}


// ================= TYPING =================

function showTyping() {

    typingIndicator.classList.remove("hidden");

    scrollToBottom();

}

function hideTyping() {

    typingIndicator.classList.add("hidden");

}


// ================= CREATE MESSAGE =================

function createMessage(type, text) {

    const message = document.createElement("div");

    message.className = `message ${type}`;

    const avatar =

        type === "user"

            ? "👤"

            : "🧠";

    let content = text;

    if (

        type === "ai" &&

        typeof marked !== "undefined"

    ) {

        content = marked.parse(text);

    }

    else {

        content = text.replace(/\n/g, "<br>");

    }

    message.innerHTML = `

        <div class="avatar">

            ${avatar}

        </div>

        <div class="bubble">

            <div class="bubble-header">

                <strong>

                    ${type === "user"

                        ? "You"

                        : "BZU AI"}

                </strong>

                <span>

                    ${getCurrentTime()}

                </span>

            </div>

            <div class="bubble-content">

                ${content}

            </div>

        </div>

    `;

    chatMessages.appendChild(message);

    scrollToBottom();

}


// ================= HELPERS =================

function addUserMessage(text) {

    createMessage("user", text);

}

function addAIMessage(text) {

    createMessage("ai", text);

}

function clearMessages() {

    chatMessages.innerHTML = "";

}


// ================= SAVE CHAT =================

function saveCurrentChat() {

    if (currentChat.length === 0) return;

    if (

        currentChat.id

    ) {

        const index = chats.findIndex(

            c => c.id === currentChat.id

        );

        if (index !== -1) {

            chats[index].messages =

                [...currentChat];

            chats[index].title =

                currentChat[0].text.substring(0,40);

        }

    }

    else {

        const chat = {

            id: Date.now(),

            title:

                currentChat[0].text.substring(0,40),

            messages:

                [...currentChat]

        };

        currentChat.id = chat.id;

        chats.unshift(chat);

    }

    if (chats.length > 20) {

        chats.pop();

    }

    if (userId) {

    localStorage.setItem(
        `bzuChats_${userId}`,
        JSON.stringify(chats)
    );

}
    renderHistory();

}


// ================= LOAD CHAT =================

function loadChat(chat) {

    clearMessages();

    currentChat = [...chat.messages];

    currentChat.id = chat.id;

    currentChat.forEach(msg => {

        if (msg.role === "user") {

            addUserMessage(msg.text);

        }

        else {

            addAIMessage(msg.text);

        }

    });

    welcomeScreen.style.display = "none";

    chatContainer.style.display = "flex";

    scrollToBottom();

}/* =====================================================
   PART 3 - SEND MESSAGE & AI API
=====================================================*/


// ================= SEND MESSAGE =================

async function sendMessage() {

    const text = messageInput.value.trim();

    if (!text || isTyping) return;

    welcomeScreen.style.display = "none";
    chatContainer.style.display = "flex";

    currentChat.push({

        role: "user",

        text

    });
rememberUser(text);
    addUserMessage(text);

    messageInput.value = "";

    messageInput.style.height = "auto";

    isTyping = true;

    showTyping();

    try {

        const response = await fetch("/chat", {

            method: "POST",

            headers: {

                "Content-Type": "application/json"

            },

            body: JSON.stringify({

    messages: currentChat,

    memory: memory,

    userId: userId

})
        });

        if (!response.ok) {

            throw new Error("Server Error");

        }

        const data = await response.json();

        hideTyping();

        const aiReply =

            data.reply ||

            data.response ||

            data.message ||

            "No response.";

        currentChat.push({

            role: "assistant",

            text: aiReply

        });

        addAIMessage(aiReply);



        // ================= SAVE MEMORY =================

        if (data.memory) {

            memory = {

                ...memory,

                ...data.memory

            };

            saveMemory();

        }



        // ================= LEARN BASIC INFO =================

        if (!memory.name) {

            const m = text.match(/my name is (.+)/i);

            if (m) {

                memory.name = m[1];

            }

        }

        if (!memory.semester) {

            const m = text.match(/(\d+)(st|nd|rd|th)? semester/i);

            if (m) {

                memory.semester =

                    m[1] + " Semester";

            }

        }

        if (!memory.department) {

            const m = text.match(/bs (.+)/i);

            if (m) {

                memory.department =

                    "BS " + m[1];

            }

        }

        saveMemory();



        // ================= SAVE CHAT =================

        saveCurrentChat();

    }

    catch (error) {

        console.error(error);

        hideTyping();

        addAIMessage(

            "❌ Unable to contact AI server."

        );

    }

    finally {

        isTyping = false;

    }

}



// ================= SEND BUTTON =================

sendBtn.addEventListener(

    "click",

    sendMessage

);



// ================= ENTER =================

messageInput.addEventListener(

    "keydown",

    function(e){

        if(

            e.key==="Enter" &&

            !e.shiftKey

        ){

            e.preventDefault();

            sendMessage();

        }

    }

);



// ================= AUTO RESIZE =================

messageInput.addEventListener(

    "input",

    function(){

        this.style.height="auto";

        this.style.height=

            this.scrollHeight+"px";

    }

);/* =====================================================
   PART 4 - HISTORY | NEW CHAT | THEME | SETTINGS
=====================================================*/


// ================= HISTORY =================

function renderHistory() {

    history.innerHTML = "";

    if (chats.length === 0) {

        history.innerHTML = `
            <div class="history-empty">
                No previous chats
            </div>
        `;

        return;

    }

    chats.forEach(chat => {

        const item = document.createElement("div");

        item.className = "history-item";

        if (

            currentChat.id === chat.id

        ) {

            item.classList.add("active");

        }

        item.innerHTML = `

            <i class="fa-solid fa-message"></i>

            <span>${chat.title}</span>

        `;

        item.onclick = () => {

            loadChat(chat);

            renderHistory();

        };

        history.appendChild(item);

    });

}



// ================= NEW CHAT =================

function newChat() {

    currentChat = [];

    currentChat.id = null;

    clearMessages();

    welcomeScreen.style.display = "block";

    chatContainer.style.display = "flex";

    messageInput.focus();

}



// ================= CLEAR HISTORY =================

const clearHistoryBtn =

document.getElementById("clearHistoryBtn");

if (clearHistoryBtn) {

    clearHistoryBtn.addEventListener(

        "click",

        () => {

            if (

                !confirm(

                    "Delete all chats?"

                )

            ) return;

            chats = [];

            currentChat = [];

            currentChat.id = null;
if (userId) {

    localStorage.removeItem(
        `bzuChats_${userId}`
    );

}
            renderHistory();

            newChat();

        }

    );

}



// ================= THEME =================

function toggleTheme() {

    document.body.classList.toggle("dark");

    localStorage.setItem(

        "theme",

        document.body.classList.contains("dark")

            ? "dark"

            : "light"

    );

}

themeBtn.addEventListener(

    "click",

    toggleTheme

);

if (themeToggleBtn) {

    themeToggleBtn.addEventListener(

        "click",

        toggleTheme

    );

}



// ================= SETTINGS =================

settingsBtn.addEventListener(

    "click",

    () => {

        settingsModal.classList.remove(

            "hidden"

        );

    }

);



// ================= ABOUT =================

aboutBtn.addEventListener(

    "click",

    () => {

        aboutModal.classList.remove(

            "hidden"

        );

    }

);



// ================= CLOSE BUTTONS =================

document.querySelectorAll(

    ".close-modal"

).forEach(btn => {

    btn.addEventListener(

        "click",

        () => {

            settingsModal.classList.add(

                "hidden"

            );

            aboutModal.classList.add(

                "hidden"

            );

        }

    );

});



// ================= CLICK OUTSIDE =================

window.addEventListener(

    "click",

    (e) => {

        if (

            e.target === settingsModal

        ) {

            settingsModal.classList.add(

                "hidden"

            );

        }

        if (

            e.target === aboutModal

        ) {

            aboutModal.classList.add(

                "hidden"

            );

        }

    }

);



// ================= RESTORE LAST CHAT =================

window.addEventListener(

    "load",

    () => {

        renderHistory();

        restoreLastChat();

    }

);/* =====================================================
   PART 5 - FILE UPLOAD | VOICE | STARTUP
=====================================================*/


// ================= QUICK BUTTONS =================

document.querySelectorAll(".quick-btn").forEach(btn=>{

    btn.addEventListener("click",()=>{

        messageInput.value=btn.innerText;

        sendMessage();

    });

});



// ================= FILE PICKER =================

uploadBtn.addEventListener("click",(e)=>{

    e.preventDefault();

    e.stopPropagation();

    fileInput.value="";

    fileInput.click();

});



// ================= FILE UPLOAD =================

fileInput.addEventListener("change",async()=>{

    if(!fileInput.files.length)return;

    const file=fileInput.files[0];

    addUserMessage("📄 Uploaded: "+file.name);

    showTyping();

    const formData=new FormData();

    formData.append("file",file);

    try{

        const response=await fetch("/upload",{

            method:"POST",

            body:formData

        });

        const text=await response.text();

        if(!response.ok){

            throw new Error(text);

        }

        const data=JSON.parse(text);

        hideTyping();

        currentChat.push({

            role:"user",

            text:"📄 Uploaded: "+file.name

        });

        currentChat.push({

            role:"assistant",

            text:data.reply||

                 data.message||

                 "File uploaded successfully."

        });

        addAIMessage(

            data.reply||

            data.message||

            "File uploaded successfully."

        );

        saveCurrentChat();

    }

    catch(err){

        hideTyping();

        console.error(err);

        addAIMessage(

            "❌ Upload failed.\n\n"+err.message

        );

    }

});



// ================= VOICE =================

if(

    "SpeechRecognition" in window ||

    "webkitSpeechRecognition" in window

){

    const SpeechRecognition=

        window.SpeechRecognition||

        window.webkitSpeechRecognition;

    const recognition=

        new SpeechRecognition();

    recognition.lang="en-US";

    recognition.interimResults=false;

    recognition.maxAlternatives=1;

    voiceBtn.addEventListener(

        "click",

        ()=>{

            recognition.start();

            voiceBtn.innerHTML=

            '<i class="fa-solid fa-microphone-lines"></i>';

        }

    );

    recognition.onresult=function(e){

        messageInput.value=

        e.results[0][0].transcript;

        voiceBtn.innerHTML=

        '<i class="fa-solid fa-microphone"></i>';

    };

    recognition.onerror=function(){

        voiceBtn.innerHTML=

        '<i class="fa-solid fa-microphone"></i>';

    };

    recognition.onend=function(){

        voiceBtn.innerHTML=

        '<i class="fa-solid fa-microphone"></i>';

    };

}

else{

    voiceBtn.style.display="none";

}



// ================= CHATGPT STYLE MEMORY =================

function rememberUser(text){

    const lower=text.toLowerCase();

    if(lower.includes("my name is")){

        memory.name=

        text.split(/my name is/i)[1].trim();

    }

    if(lower.includes("i study in")){

        memory.university=

        text.split(/i study in/i)[1].trim();

    }

    if(lower.includes("semester")){

        memory.semester=text;

    }

    if(lower.includes("department")){

        memory.department=text;

    }

    if(lower.includes("my city is")){

        memory.city=

        text.split(/my city is/i)[1].trim();

    }

    saveMemory();

}



// ================= STARTUP =================

renderHistory();

restoreLastChat();

messageInput.focus();



console.log("====================================");

console.log("BZU AI Assistant");

console.log("Developed by Sajjad Haider");

console.log("Version 5.0");

console.log("Memory Enabled");

console.log("History Enabled");

console.log("Upload Enabled");

console.log("Voice Enabled");

console.log("====================================");
// =====================================================
// BZU AI AUTHENTICATION
// =====================================================

document.addEventListener("DOMContentLoaded", () => {

    const authScreen = document.getElementById("authScreen");

    if (!authScreen) return;

    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");

    const showSignup = document.getElementById("showSignup");
    const showLogin = document.getElementById("showLogin");

    const loginFormElement =
        document.getElementById("loginFormElement");

    const signupFormElement =
        document.getElementById("signupFormElement");

    const loginMessage =
        document.getElementById("loginMessage");

    const signupMessage =
        document.getElementById("signupMessage");


    // -----------------------------------------------
    // SWITCH LOGIN / SIGNUP
    // -----------------------------------------------

    showSignup?.addEventListener("click", () => {

        loginForm.style.display = "none";
        signupForm.style.display = "block";

        loginMessage.textContent = "";
    });


    showLogin?.addEventListener("click", () => {

        signupForm.style.display = "none";
        loginForm.style.display = "block";

        signupMessage.textContent = "";
    });


    // -----------------------------------------------
    // LOGIN
    // -----------------------------------------------

    loginFormElement?.addEventListener("submit", async (event) => {

        event.preventDefault();

        const email =
            document.getElementById("loginEmail").value;

        const password =
            document.getElementById("loginPassword").value;

        loginMessage.textContent = "Signing in...";

        try {

            const response = await fetch("/api/auth/login", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                credentials: "include",

                body: JSON.stringify({
                    email,
                    password
                })

            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Login failed."
                );
            }

            loginMessage.textContent =
                "Login successful. Loading...";

            setTimeout(() => {

                authScreen.style.display = "none";

                window.location.reload();

            }, 500);

        } catch (error) {

            loginMessage.textContent =
                error.message;

        }

    });


    // -----------------------------------------------
    // SIGNUP
    // -----------------------------------------------

    signupFormElement?.addEventListener("submit", async (event) => {

        event.preventDefault();

        const name =
            document.getElementById("signupName").value;

        const email =
            document.getElementById("signupEmail").value;

        const password =
            document.getElementById("signupPassword").value;

        signupMessage.textContent =
            "Creating account...";

        try {

            const response = await fetch("/api/auth/signup", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                credentials: "include",

                body: JSON.stringify({
                    name,
                    email,
                    password
                })

            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Signup failed."
                );
            }

            signupMessage.textContent =
                "Account created. Loading...";

            setTimeout(() => {

                authScreen.style.display = "none";

                window.location.reload();

            }, 500);

        } catch (error) {

            signupMessage.textContent =
                error.message;

        }

    });


    // -----------------------------------------------
    // CHECK EXISTING SESSION
    // -----------------------------------------------
fetch("/api/auth/me", {
    credentials: "include"
})
    .then(async response => {

        if (response.ok) {

            await loadUserChats();

            renderHistory();

            authScreen.style.display = "none";

            restoreLastChat();

        } else {

            authScreen.style.display = "flex";

        }

    })
    .catch(() => {

        authScreen.style.display = "flex";

    });

});// =========================================
// LOGOUT
// =========================================

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {

        try {
            const response = await fetch("/api/auth/logout", {
                method: "POST",
                credentials: "include"
            });

            const data = await response.json();

            if (data.success) {
                window.location.reload();
            } else {
                alert(data.message || "Unable to logout.");
            }

        } catch (error) {
            console.error("LOGOUT ERROR:", error);
            alert("Unable to logout. Please try again.");
        }

    });
}