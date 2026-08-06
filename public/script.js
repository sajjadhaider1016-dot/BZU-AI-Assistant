/* =====================================================
   BZU AI Assistant
   Developed by Sajjad Haider
   Version 4.0
=====================================================*/

// ================= ELEMENTS =================

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
newChatBtn.addEventListener("click", newChat);
// Theme

const themeBtn = document.getElementById("themeBtn");
const themeToggleBtn = document.getElementById("themeToggleBtn");

// Settings

const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");

// About

const aboutBtn = document.getElementById("aboutBtn");
const aboutModal = document.getElementById("aboutModal");

// ================= STATE =================

let currentChat = [];

let chats = JSON.parse(localStorage.getItem("bzuChats")) || [];

let isTyping = false;

// ================= INITIAL UI =================

// Always show chat

// Initial UI

welcomeScreen.style.display = "block";
chatContainer.style.display = "flex";
// Hide typing indicator

typingIndicator.classList.add("hidden");

// Load previous theme

if (localStorage.getItem("theme") === "dark") {

    document.body.classList.add("dark");

}

// Load history

renderHistory();/* =====================================================
   PART 2 - MESSAGE RENDERING
=====================================================*/

// Scroll chat to bottom
function scrollToBottom() {

    chatMessages.scrollTop = chatMessages.scrollHeight;

}

// Current time
function getCurrentTime() {

    return new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });

}

// Typing indicator
function showTyping() {

    typingIndicator.classList.remove("hidden");

    scrollToBottom();

}

function hideTyping() {

    typingIndicator.classList.add("hidden");

}

// Create message
function createMessage(type, text) {

    const message = document.createElement("div");

    message.className = `message ${type}`;

    const avatar = type === "user" ? "👤" : "🧠";

    let content = text;

    // Markdown support
    if (type === "ai" && typeof marked !== "undefined") {

        content = marked.parse(text);

    } else {

        content = text
            .replace(/\n/g, "<br>");

    }

    message.innerHTML = `

        <div class="avatar">

            ${avatar}

        </div>

        <div class="bubble">

            <div class="bubble-header">

                <strong>${type === "user" ? "You" : "BZU AI"}</strong>

                <span>${getCurrentTime()}</span>

            </div>

            <div class="bubble-content">

                ${content}

            </div>

        </div>

    `;

    chatMessages.appendChild(message);

    scrollToBottom();

}

// Add user message
function addUserMessage(text) {

    createMessage("user", text);

}

// Add AI message
function addAIMessage(text) {

    createMessage("ai", text);

}

// Clear chat
function clearMessages() {

    chatMessages.innerHTML = "";

}

// Save chat
function saveCurrentChat() {

    if (currentChat.length === 0) return;

    chats.unshift({

        id: Date.now(),

        title: currentChat[0].text.substring(0, 40),

        messages: [...currentChat]

    });

    if (chats.length > 20) {

        chats.pop();

    }

    localStorage.setItem(

        "bzuChats",

        JSON.stringify(chats)

    );

    renderHistory();

}/* =====================================================
   PART 3 - SEND MESSAGE & AI API
=====================================================*/

// Send message

async function sendMessage() {

    const text = messageInput.value.trim();
welcomeScreen.style.display = "none";
chatContainer.style.display = "flex";
    if (!text || isTyping) return;

    // Store user message
    currentChat.push({
        role: "user",
        text
    });

    addUserMessage(text);
chatContainer.style.display = "flex";
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
    messages: currentChat
})

        });

        if (!response.ok) {

            throw new Error("Server Error");

        }

        const data = await response.json();

console.log("SERVER RESPONSE:");
console.log(JSON.stringify(data, null, 2));console.log(data);

        hideTyping();

        const aiReply =
            data.reply ||
            data.response ||
            data.message ||
            "No response received.";

        currentChat.push({

            role: "assistant",

            text: aiReply

        });

        addAIMessage(aiReply);

        saveCurrentChat();

    }

    catch (error) {

        console.error(error);

        hideTyping();

        addAIMessage(

            "❌ Unable to contact the AI server.\n\nPlease make sure the server is running."

        );

    }

    finally {

        isTyping = false;

    }

}

// ================= SEND BUTTON =================
console.log("sendBtn =", sendBtn);
console.log("messageInput =", messageInput);
sendBtn.addEventListener(

    "click",

    sendMessage

);

// ================= ENTER TO SEND =================

messageInput.addEventListener(

    "keydown",

    function (e) {

        if (

            e.key === "Enter" &&

            !e.shiftKey

        ) {

            e.preventDefault();

            sendMessage();

        }

    }

);

// ================= AUTO RESIZE =================

messageInput.addEventListener(

    "input",

    function () {

        this.style.height = "auto";

        this.style.height = this.scrollHeight + "px";

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

        item.innerHTML = `

            <i class="fa-solid fa-message"></i>

            <span>${chat.title}</span>

        `;

        item.onclick = () => {

            loadChat(chat);

        };

        history.appendChild(item);

    });

}

// ================= LOAD CHAT =================

function loadChat(chat) {

    clearMessages();

    currentChat = [...chat.messages];

    currentChat.forEach(msg => {

        if (msg.role === "user") {

            addUserMessage(msg.text);

        } else {

            addAIMessage(msg.text);

        }

    });

    scrollToBottom();

}

// ================= NEW CHAT =================

function newChat() {

    currentChat = [];

    clearMessages();

  
}
// ================= CLEAR HISTORY =================

if (document.getElementById("clearHistoryBtn")) {

    document
        .getElementById("clearHistoryBtn")
        .addEventListener("click", () => {

            if (!confirm("Clear all chat history?")) return;

            chats = [];

            localStorage.removeItem("bzuChats");

            renderHistory();
function showWelcomeChat(){

    clearMessages();

    addAIMessage(
`Hello! 👋

I am BZU AI Assistant.

Ask me anything about admissions, fee structure, departments, scholarships, transport, examinations or university rules.`
    );

}
            newChat();

        });

}

// ================= THEME =================

function toggleTheme() {

    document.body.classList.toggle("dark");

    const dark = document.body.classList.contains("dark");

    localStorage.setItem(

        "theme",

        dark ? "dark" : "light"

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

// ================= SETTINGS MODAL =================

settingsBtn.addEventListener("click", () => {

    settingsModal.classList.remove("hidden");

});

// ================= ABOUT MODAL =================

aboutBtn.addEventListener("click", () => {

    aboutModal.classList.remove("hidden");

});

// ================= CLOSE MODALS =================

document.querySelectorAll(".close-modal").forEach(btn => {

    btn.addEventListener("click", () => {

        settingsModal.classList.add("hidden");

        aboutModal.classList.add("hidden");

    });

});

// Close modal by clicking outside

window.addEventListener("click", (e) => {

    if (e.target === settingsModal) {

        settingsModal.classList.add("hidden");

    }

    if (e.target === aboutModal) {

        aboutModal.classList.add("hidden");

    }

});/* =====================================================
   PART 5 - VOICE | FILE UPLOAD | QUICK BUTTONS
   Developed by Sajjad Haider
=====================================================*/

// ================= QUICK BUTTONS =================

document.querySelectorAll(".quick-btn").forEach(button => {

    button.addEventListener("click", () => {

        messageInput.value = button.innerText;

        sendMessage();

    });

});


// ================= FILE UPLOAD =================
// ================= OPEN FILE PICKER =================

uploadBtn.addEventListener("click", (e) => {

    e.preventDefault();
    e.stopPropagation();

    fileInput.value = "";

    fileInput.click();

});
fileInput.addEventListener("change", async () => {

    console.log("Change event fired");

    if (!fileInput.files.length) {
        console.log("No file selected");
        return;
    }

    const file = fileInput.files[0];

    console.log("File selected:", file);

    const formData = new FormData();
    formData.append("file", file);

    addUserMessage("📄 Uploaded: " + file.name);

    showTyping();

    try {

        console.log("Sending upload request...");

    const response = await fetch("/upload", {
    method: "POST",
    body: formData
});

console.log("Upload Status:", response.status);

const text = await response.text();

console.log("Upload Response:", text);

if (!response.ok) {
    throw new Error(text);
}

const data = JSON.parse(text);
        console.log("Server Response:", data);

        hideTyping();

        addAIMessage(
            data.reply ||
            data.message ||
            "File uploaded successfully."
        );

    } catch (err) {

    console.error("UPLOAD ERROR:", err);

    hideTyping();

    addAIMessage("❌ " + err.message);

}

});

// ================= VOICE INPUT =================

if (

    "webkitSpeechRecognition" in window ||

    "SpeechRecognition" in window

) {

    const SpeechRecognition =

        window.SpeechRecognition ||

        window.webkitSpeechRecognition;

    const recognition = new SpeechRecognition();

    recognition.lang = "en-US";

    recognition.interimResults = false;

    recognition.maxAlternatives = 1;

    voiceBtn.addEventListener("click", () => {

        recognition.start();

        voiceBtn.innerHTML =

            '<i class="fa-solid fa-microphone-lines"></i>';

    });

    recognition.onresult = function(event) {

        messageInput.value =

            event.results[0][0].transcript;

        voiceBtn.innerHTML =

            '<i class="fa-solid fa-microphone"></i>';

    };

    recognition.onerror = function() {

        voiceBtn.innerHTML =

            '<i class="fa-solid fa-microphone"></i>';

    };

    recognition.onend = function() {

        voiceBtn.innerHTML =

            '<i class="fa-solid fa-microphone"></i>';

    };

} else {

    voiceBtn.style.display = "none";

}

// ================= STARTUP =================

renderHistory();

scrollToBottom();

messageInput.focus();

console.log("=======================================");
console.log("BZU AI Assistant");
console.log("Version 4.0");
console.log("Developed by Sajjad Haider");
console.log("AI & Full Stack Developer");
console.log("=======================================");