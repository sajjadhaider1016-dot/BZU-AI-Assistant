/* =====================================================
   BZU AI Assistant
   Developed by Sajjad Haider
   Version 5.0
=====================================================*/
// ================= ELEMENTS =================

let userId = null;


// ================= CHAT ELEMENTS =================

const chatMessages = document.getElementById("chatMessages");

const messageInput = document.getElementById("messageInput");

const sendBtn = document.getElementById("sendBtn");

const uploadBtn = document.getElementById("uploadBtn");

const imageGenerateBtn = document.getElementById("imageGenerateBtn");

const imagePromptModal = document.getElementById("imagePromptModal");

const imagePromptForm = document.getElementById("imagePromptForm");

const imagePromptInput = document.getElementById("imagePromptInput");

const imagePromptCharacterCount = document.getElementById("imagePromptCharacterCount");

const imageLibraryBtn = document.getElementById("imageLibraryBtn");

const imageLibraryModal = document.getElementById("imageLibraryModal");

const imageLibraryGrid = document.getElementById("imageLibraryGrid");

const fileInput = document.getElementById("fileInput");

const fileDropOverlay = document.getElementById("fileDropOverlay");

const pendingAttachmentPreview = document.getElementById("pendingAttachmentPreview");

let pendingUploadFile = null;
let pendingUploadBatchCount = 1;

const voiceBtn = document.getElementById("voiceBtn");

const history = document.getElementById("history");

const welcomeScreen = document.getElementById("welcomeScreen");

const chatContainer = document.getElementById("chatContainer");

const typingIndicator = document.getElementById("typingIndicator");


// ================= SIDEBAR ELEMENTS =================

const newChatBtn = document.getElementById("newChatBtn");

const themeBtn = document.getElementById("themeBtn");

const themeToggleBtn = document.getElementById("themeToggleBtn");

const settingsBtn = document.getElementById("settingsBtn");

const settingsModal = document.getElementById("settingsModal");

const aboutBtn = document.getElementById("aboutBtn");

const aboutModal = document.getElementById("aboutModal");


// ================= MOBILE NAVIGATION =================

const mobileMenuBtn = document.getElementById("mobileMenuBtn");

const sidebar = document.querySelector(".sidebar");
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

function showTyping(statusText = "Working on it") {

    const status = typingIndicator.querySelector(".typing-status-text");
    if (status) status.textContent = statusText;

    typingIndicator.classList.remove("hidden");

    scrollToBottom();

}

function hideTyping() {

    typingIndicator.classList.add("hidden");

}


// ================= CREATE MESSAGE =================

function createMessage(type, text, extra = {}) {

    const message = document.createElement("div");

    message.className = `message ${type}`;

    const avatar =

        type === "user"

            ? "👤"

            : '<img src="/images/bzu-logo.png" alt="BZU AI">';

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

    if (type === "user" && extra.attachmentName) {
        const bubble = message.querySelector(".bubble");
        const attachment = document.createElement("div");
        attachment.className = "uploaded-file-preview";
        if (extra.attachmentIsImage && extra.attachmentUrl) {
            const image = document.createElement("img");
            image.src = extra.attachmentUrl;
            image.alt = extra.attachmentName;
            image.className = "uploaded-file-image";
            image.loading = "lazy";
            attachment.appendChild(image);
        }
        const label = document.createElement("span");
        label.innerHTML = '<i class="fa-solid fa-paperclip" aria-hidden="true"></i>';
        label.append(document.createTextNode(` ${extra.attachmentName}`));
        attachment.appendChild(label);
        bubble.appendChild(attachment);
    }

    if (type === "ai" && extra.imageUrl) {
        const bubble = message.querySelector(".bubble");
        const image = document.createElement("img");
        image.src = extra.imageUrl;
        image.alt = extra.prompt || "Generated image";
        image.className = "generated-chat-image";
        image.loading = "lazy";
        bubble.appendChild(image);

        if (!Array.isArray(extra.fileDownloads) || !extra.fileDownloads.length) {
            const downloadLink = document.createElement("a");
            downloadLink.href = extra.imageUrl;
            downloadLink.download = extra.imageFilename || "bzu-ai-generated-image.png";
            downloadLink.className = "generated-image-download";
            downloadLink.textContent = "Download image";
            downloadLink.setAttribute("aria-label", "Download generated image");
            bubble.appendChild(downloadLink);
        }
    }

    if (type === "ai" && Array.isArray(extra.fileDownloads)) {
        const bubble = message.querySelector(".bubble");
        extra.fileDownloads.forEach(file => {
            const downloadLink = document.createElement("a");
            downloadLink.href = file.downloadUrl;
            downloadLink.download = file.filename;
            downloadLink.className = "document-download-link";
            downloadLink.textContent = `Download ${String(file.format || "file").toUpperCase()}`;
            bubble.appendChild(downloadLink);
        });
    }

    chatMessages.appendChild(message);

    scrollToBottom();

}


// ================= HELPERS =================

function addUserMessage(text, extra = {}) {

    createMessage("user", text, extra);

}

function addAIMessage(text, extra = {}) {

    createMessage("ai", text, extra);

}

function updateTypingStatus(statusText) {
    const status = typingIndicator.querySelector(".typing-status-text");
    if (status && !typingIndicator.classList.contains("hidden")) {
        status.textContent = statusText;
    }
}

function imagePromptFromMessage(message) {
    const raw = String(message || "").trim();
    const media = "(?:image|picture|photo|artwork|illustration|drawing|logo|poster|wallpaper|portrait|icon|thumbnail|tasveer|tasvir|تصویر|صورة)";
    const hasEnglishCreationIntent =
        new RegExp(`\\b(create|generate|make|draw|design|illustrate|paint|render)\\b[\\s\\S]{0,100}\\b${media}\\b`, "i").test(raw) ||
        new RegExp(`\\b(i want|show me|give me)\\b[\\s\\S]{0,45}\\b${media}\\b`, "i").test(raw);
    const hasRomanUrduCreationIntent =
        /\b(tasveer|tasvir|تصویر|صورة)\b[\s\S]{0,60}\b(banao|bnao|bana do|bana dein|bana den|انشئ|أنشئ|اصنع|ارسم)\b/i.test(raw) ||
        /\b(banao|bnao|bana do|bana dein|bana den|انشئ|أنشئ|اصنع|ارسم)\b[\s\S]{0,60}\b(tasveer|tasvir|تصویر|صورة)\b/i.test(raw);
    if (!hasEnglishCreationIntent && !hasRomanUrduCreationIntent) return null;
    if (/^\s*(how do|how can|what is|what are|why does|explain|tell me about)\b/i.test(raw)) return null;

    const description = raw.match(new RegExp(`\\b${media}\\b\\s*(?:of|showing|with|for|about)?\\s+([\\s\\S]+)$`, "i"));
    return (description?.[1] || raw).trim();
}

async function generateImage(promptValue = null, originalUserText = "") {
    if (isTyping) return;
    if (typeof promptValue !== "string" || !promptValue.trim()) {
        openImagePrompt();
        return;
    }
    const prompt = promptValue;
    const cleanedPrompt = prompt.trim();
    if (cleanedPrompt.length > 500) {
        alert("Please keep the image description to 500 characters or fewer.");
        return;
    }
    isTyping = true;
    imageGenerateBtn.disabled = true;
    imageGenerateBtn.title = "Generating image…";
    welcomeScreen.style.display = "none";
    chatContainer.style.display = "flex";

    const userText = originalUserText || `Create an image: ${cleanedPrompt}`;
    currentChat.push({ role: "user", text: userText });
    addUserMessage(userText);

    const imageRecord = {
        role: "assistant",
        text: "Creating image…",
        prompt: cleanedPrompt,
        status: "generating"
    };
    currentChat.push(imageRecord);
    createMessage("ai", "");
    const bubble = chatMessages.lastElementChild.querySelector(".bubble");
    const content = bubble.querySelector(".bubble-content");
    const preview = document.createElement("div");
    preview.className = "image-generation-preview";
    const status = document.createElement("div");
    status.className = "image-preview-status";
    status.innerHTML = '<span class="image-preview-spinner" aria-hidden="true"></span><span>Creating your image</span>';
    const stage = document.createElement("div");
    stage.className = "image-preview-stage is-generating";
    const shimmer = document.createElement("div");
    shimmer.className = "image-preview-shimmer";
    shimmer.setAttribute("aria-hidden", "true");
    const promptLabel = document.createElement("p");
    promptLabel.className = "image-preview-prompt";
    promptLabel.textContent = cleanedPrompt;
    const helper = document.createElement("p");
    helper.className = "image-preview-helper";
    helper.textContent = "This may take a little while.";
    stage.appendChild(shimmer);
    preview.append(status, stage, promptLabel, helper);
    content.replaceChildren(preview);
    scrollToBottom();

    try {
        const response = await fetch("/api/generate-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: cleanedPrompt })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Image generation failed.");
        welcomeScreen.style.display = "none";
        chatContainer.style.display = "flex";
        const label = "Generated image";
        imageRecord.text = label;
        imageRecord.imageUrl = data.imageUrl;
        imageRecord.status = "ready";
        status.className = "image-preview-status is-ready";
        status.replaceChildren();
        const readyIcon = document.createElement("i");
        readyIcon.className = "fa-solid fa-circle-check";
        readyIcon.setAttribute("aria-hidden", "true");
        status.append(readyIcon, document.createTextNode(" Image ready"));
        stage.classList.remove("is-generating");
        stage.replaceChildren();
        const image = document.createElement("img");
        image.src = data.imageUrl;
        image.alt = cleanedPrompt;
        image.className = "generated-chat-image";
        image.loading = "lazy";
        stage.appendChild(image);
        const downloadLink = document.createElement("a");
        downloadLink.href = data.imageUrl;
        downloadLink.download = "bzu-ai-generated-image.png";
        downloadLink.className = "generated-image-download";
        downloadLink.textContent = "Download image";
        downloadLink.setAttribute("aria-label", "Download generated image");
        preview.appendChild(downloadLink);
        helper.remove();

        saveCurrentChat();
    } catch (error) {
        imageRecord.text = "Image could not be created.";
        imageRecord.status = "failed";
        status.className = "image-preview-status is-error";
        status.replaceChildren();
        const errorIcon = document.createElement("i");
        errorIcon.className = "fa-solid fa-circle-exclamation";
        errorIcon.setAttribute("aria-hidden", "true");
        status.append(errorIcon, document.createTextNode(" Image creation failed"));
        stage.classList.remove("is-generating");
        stage.classList.add("is-failed");
        stage.replaceChildren();
        const errorText = document.createElement("p");
        errorText.textContent = error.message || "Please try again later.";
        stage.appendChild(errorText);
        helper.remove();
        saveCurrentChat();
    } finally {
        imageGenerateBtn.disabled = false;
        imageGenerateBtn.title = "Generate an image using the shared free allowance";
        isTyping = false;
        if (voiceMode) resumeVoiceListening();
    }
}

function openImagePrompt() {
    if (!imagePromptModal || isTyping) return;
    imagePromptModal.classList.remove("hidden");
    const currentPrompt = imagePromptInput.value;
    imagePromptCharacterCount.textContent = `${currentPrompt.length} / 500`;
    requestAnimationFrame(() => imagePromptInput.focus());
}

function closeImagePrompt(restoreFocus = true) {
    imagePromptModal?.classList.add("hidden");
    if (restoreFocus) imageGenerateBtn?.focus();
}

imagePromptInput?.addEventListener("input", () => {
    imagePromptCharacterCount.textContent = `${imagePromptInput.value.length} / 500`;
});

imagePromptForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const prompt = imagePromptInput.value.trim();
    if (!prompt) {
        imagePromptInput.focus();
        return;
    }
    if (isTyping) return;
    closeImagePrompt(false);
    imagePromptInput.value = "";
    imagePromptCharacterCount.textContent = "0 / 500";
    await generateImage(prompt);
});

document.querySelectorAll("[data-image-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
        imagePromptInput.value = button.dataset.imagePrompt || "";
        imagePromptInput.dispatchEvent(new Event("input", { bubbles: true }));
        imagePromptInput.focus();
    });
});

document.getElementById("cancelImagePromptBtn")?.addEventListener("click", closeImagePrompt);
document.getElementById("closeImagePromptBtn")?.addEventListener("click", closeImagePrompt);
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && imagePromptModal && !imagePromptModal.classList.contains("hidden")) {
        closeImagePrompt();
    }
});

async function openImageLibrary() {
    imageLibraryModal.classList.remove("hidden");
    imageLibraryGrid.replaceChildren();
    const loading = document.createElement("p");
    loading.textContent = "Loading your images…";
    imageLibraryGrid.appendChild(loading);
    try {
        const response = await fetch("/api/generated-images");
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Could not load your image library.");
        imageLibraryGrid.replaceChildren();
        if (!data.images?.length) {
            const empty = document.createElement("p");
            empty.className = "image-library-empty";
            empty.textContent = "Images you generate will appear here.";
            imageLibraryGrid.appendChild(empty);
            return;
        }
        data.images.forEach(item => {
            const card = document.createElement("article");
            card.className = "image-library-card";
            const image = document.createElement("img");
            image.src = item.imageUrl;
            image.alt = item.prompt || "Generated image";
            image.loading = "lazy";
            const caption = document.createElement("p");
            caption.textContent = item.prompt || "Generated image";
            const download = document.createElement("a");
            download.href = item.imageUrl;
            download.download = "bzu-ai-generated-image.png";
            download.className = "generated-image-download";
            download.textContent = "Download";
            card.append(image, caption, download);
            imageLibraryGrid.appendChild(card);
        });
    } catch (error) {
        imageLibraryGrid.replaceChildren();
        const message = document.createElement("p");
        message.className = "image-library-empty";
        message.textContent = error.message || "Could not load your image library.";
        imageLibraryGrid.appendChild(message);
    }
}

imageLibraryBtn?.addEventListener("click", () => {
    openImageLibrary();
    if (window.innerWidth <= 768 && sidebar) sidebar.classList.remove("open");
});

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

    pendingUploadFile = null;
    pendingUploadBatchCount = 1;
    fileInput.value = "";
    renderPendingAttachment();

    clearMessages();

    currentChat = [...chat.messages];

    currentChat.id = chat.id;

    currentChat.forEach(msg => {

        if (msg.role === "user") {

            addUserMessage(msg.text, msg);

        }

        else {

            addAIMessage(msg.text, msg);

        }

    });

    welcomeScreen.style.display = "none";

    chatContainer.style.display = "flex";

    scrollToBottom();

}/* =====================================================
   PART 3 - SEND MESSAGE & AI API
=====================================================*/


// ================= SEND MESSAGE =================

function renderPendingAttachment() {
    if (!pendingAttachmentPreview) return;
    pendingAttachmentPreview.replaceChildren();
    pendingAttachmentPreview.hidden = !pendingUploadFile;
    messageInput.placeholder = pendingUploadFile
        ? "Tell me what to do with this file..."
        : "Ask anything about BZU...";
    if (!pendingUploadFile) return;

    const icon = document.createElement("i");
    icon.className = pendingUploadFile.type.startsWith("image/")
        ? "fa-regular fa-image"
        : "fa-solid fa-paperclip";
    icon.setAttribute("aria-hidden", "true");

    const details = document.createElement("div");
    details.className = "pending-attachment-details";
    const name = document.createElement("span");
    name.className = "pending-attachment-name";
    name.textContent = pendingUploadFile.name;
    const hint = document.createElement("span");
    hint.className = "pending-attachment-hint";
    hint.textContent = pendingUploadBatchCount > 1
        ? `First of ${pendingUploadBatchCount} files attached. Add an instruction, then press Send.`
        : "Add an instruction, then press Send";
    details.append(name, hint);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "pending-attachment-remove";
    remove.title = "Remove attachment";
    remove.setAttribute("aria-label", "Remove attachment");
    remove.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
    remove.addEventListener("click", () => {
        pendingUploadFile = null;
        pendingUploadBatchCount = 1;
        fileInput.value = "";
        renderPendingAttachment();
    });

    pendingAttachmentPreview.append(icon, details, remove);
}

function isUploadEditInstruction(text) {
    return /\b(edit|modify|change|replace|remove|add|retouch|crop|enhance|clean up|rewrite|correct|fix|update|reformat|translate|proofread|redesign|improve|polish)\b/i.test(text) ||
        /\b(make|turn|set)\s+(?:it|this|the|my|the background|background|image|photo|picture|file|document|spreadsheet|page)\b/i.test(text);
}

function isUploadedDocumentFollowUp(text) {
    return /\b(book|document|pdf|file|chapter|page|author|according to|based on|from (?:the )?(?:book|document|file|it|this)|in (?:the )?(?:book|document|file|it|this)|uploaded|attached|summari[sz]e|summary|key (?:ideas|points|arguments)|main (?:idea|argument)|explain|analy[sz]e|extract|quote|what does it say|what is discussed|who is mentioned)\b/i.test(String(text || "")) ||
        /\b(kitab|kitaab|book|pdf|file|chapter|safha|safhay|is mein|is me|iss mein|iss me|is kitab|is kitaab|uploaded|attached|khulasa|mukhtasar|ahm nuqat|markazi khayal|samjhao|tashreeh|parho|parhna|mazmoon|musannif)\b/i.test(String(text || "")) ||
        /(کتاب|باب|صفحہ|فائل|خلاصہ|اہم نکات|وضاحت|مصنف|تحلیل|الكتاب|الفصل|الصفحة|الملف|ملخص|لخص|اشرح|المؤلف|libro|documento|capítulo|página|resumen|autor|analiza|explica|livre|chapitre|page|résumé|auteur|analyse|explique)/i.test(String(text || ""));
}

async function sendMessage() {

    const text = messageInput.value.trim();

    const fileToUpload = pendingUploadFile;

    if ((!text && !fileToUpload) || isTyping) return;
    if (fileToUpload && fileToUpload.size === 0) {
        addAIMessage(`“${fileToUpload.name || "This file"}” is empty (0 bytes), so it cannot be read. Download or copy the complete file again, then attach it.`);
        return;
    }

    const typedImagePrompt = fileToUpload ? null : imagePromptFromMessage(text);
    if (typedImagePrompt) {
        messageInput.value = "";
        messageInput.style.height = "auto";
        await generateImage(typedImagePrompt, text);
        return;
    }

    const fileRequest = requestedFileRequest(text);
    const previousAssistantReply = [...currentChat].reverse()
        .find(message => message.role === "assistant")?.text || "";
    let latestUploadedFile = [...currentChat].reverse()
        .find(message => message.role === "user" && message.attachmentId);

    const voiceChangeReply = fileToUpload ? "" : handleVoiceChangeRequest(text);
    if (voiceChangeReply) {
        welcomeScreen.style.display = "none";
        chatContainer.style.display = "flex";
        currentChat.push({ role: "user", text });
        rememberUser(text);
        addUserMessage(text);
        currentChat.push({ role: "assistant", text: voiceChangeReply });
        addAIMessage(voiceChangeReply);
        if (voiceMode) speakReply(voiceChangeReply);
        saveCurrentChat();
        messageInput.value = "";
        messageInput.style.height = "auto";
        return;
    }

    welcomeScreen.style.display = "none";
    chatContainer.style.display = "flex";

    if (!fileToUpload) {
        currentChat.push({

            role: "user",

            text

        });
        rememberUser(text);
        addUserMessage(text);

        messageInput.value = "";

        messageInput.style.height = "auto";
    }

    isTyping = true;

    showTyping(fileToUpload ? "Uploading your file…" : "Thinking…");

    let uploadProgressTimer = null;

    try {

        let uploadResult = null;
        if (fileToUpload) {
            updateTypingStatus("Reading your file…");
            const formData = new FormData();
            formData.append("file", fileToUpload);
            formData.append("instruction", text);
            const progressId = window.crypto?.randomUUID?.()
                || "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, char => {
                    const random = Math.random() * 16 | 0;
                    return (char === "x" ? random : (random & 0x3 | 0x8)).toString(16);
                });
            formData.append("progressId", progressId);
            let progressRequestActive = false;
            uploadProgressTimer = window.setInterval(async () => {
                if (progressRequestActive) return;
                progressRequestActive = true;
                try {
                    const progressResponse = await fetch(`/api/upload-progress/${encodeURIComponent(progressId)}`, { cache: "no-store" });
                    if (progressResponse.ok) {
                        const progress = await progressResponse.json();
                        if (progress.status) updateTypingStatus(progress.status);
                    }
                } catch (error) {
                    // The main upload request reports any actionable failure.
                } finally {
                    progressRequestActive = false;
                }
            }, 1000);
            if (text && (isUploadEditInstruction(text) || fileRequest)) formData.append("skipAnalysis", "true");

            for (let passwordAttempt = 0; passwordAttempt < 3; passwordAttempt++) {
                updateTypingStatus("Reading and analyzing your file…");
                const uploadResponse = await fetch("/upload", { method: "POST", body: formData });
                const uploadBody = await uploadResponse.text();
                try { uploadResult = JSON.parse(uploadBody); }
                catch { throw new Error(uploadBody || "The file could not be uploaded."); }
                if (uploadResult.requiresPassword) {
                    const password = window.prompt(uploadResult.reply || "This PDF is password-protected. Enter its password to continue.");
                    if (password === null || !password.trim()) throw new Error("PDF reading was cancelled because no password was provided.");
                    formData.set("pdfPassword", password);
                    continue;
                }
                if (!uploadResponse.ok || !uploadResult.success) {
                    throw new Error(uploadResult.reply || uploadResult.message || "The file could not be uploaded.");
                }
                break;
            }
            if (!uploadResult?.success) {
                throw new Error("I could not open this PDF with the password provided. Please check the password and try again.");
            }

            if (uploadResult.processing && uploadResult.progressId) {
                if (uploadProgressTimer) {
                    window.clearInterval(uploadProgressTimer);
                    uploadProgressTimer = null;
                }
                const analysisResult = await waitForUploadAnalysis(uploadResult.progressId);
                uploadResult.reply = analysisResult.error
                    ? `I couldn’t complete the analysis of every book section: ${analysisResult.error}`
                    : analysisResult.reply || "The book was processed, but I could not prepare the final analysis. Please try again.";
            }

            const attachment = uploadResult.attachment || {};
            updateTypingStatus("File ready. Preparing your response…");
            latestUploadedFile = {
                role: "user",
                text: text || `Uploaded: ${attachment.name || fileToUpload.name}`,
                attachmentId: attachment.id || "",
                attachmentName: attachment.name || fileToUpload.name,
                attachmentFormat: attachment.format || "",
                attachmentIsImage: Boolean(attachment.isImage),
                attachmentUrl: attachment.previewUrl || ""
            };
            currentChat.push(latestUploadedFile);
            if (text) rememberUser(text);
            addUserMessage(latestUploadedFile.text, latestUploadedFile);
            pendingUploadFile = null;
            pendingUploadBatchCount = 1;
            renderPendingAttachment();
            messageInput.value = "";
            messageInput.style.height = "auto";
        }

        const lastAttachedMedia = [...currentChat].reverse().find(message =>
            (message.role === "user" && message.attachmentId) ||
            (message.role === "assistant" && message.imageUrl && message.status !== "failed")
        );
        const shouldConvertUpload = Boolean(fileRequest &&
            (fileToUpload || (fileRequest.usePrevious && lastAttachedMedia)));

        if (shouldConvertUpload) {
            updateTypingStatus("Preparing your download…");
            const fileDownloads = [];
            for (const format of fileRequest.formats) {
                const isGeneratedImage = !fileToUpload && lastAttachedMedia?.role === "assistant";
                const generatedImageFilename = isGeneratedImage
                    ? decodeURIComponent(String(lastAttachedMedia.imageUrl).split("/").pop())
                    : "";
                const convertResponse = await fetch("/api/convert-upload", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(isGeneratedImage
                        ? { generatedImageFilename, format }
                        : { attachmentId: latestUploadedFile?.attachmentId, format })
                });
                const convertData = await convertResponse.json().catch(() => ({}));
                if (!convertResponse.ok) throw new Error(convertData.message || "Could not convert the uploaded file.");
                fileDownloads.push({
                    filename: convertData.filename,
                    format: convertData.format,
                    downloadUrl: convertData.downloadUrl
                });
            }
            hideTyping();
            const assistantMessage = {
                role: "assistant",
                text: fileDownloads.length > 1 ? "Files created as requested." : "File created as requested.",
                fileDownloads
            };
            currentChat.push(assistantMessage);
            addAIMessage(assistantMessage.text, assistantMessage);
            saveCurrentChat();
            return;
        }

        const asksToEditUpload = Boolean(latestUploadedFile && text && isUploadEditInstruction(text));

        const asksAboutUploadedDocument = Boolean(
            !fileToUpload && !fileRequest && !asksToEditUpload && latestUploadedFile &&
            !latestUploadedFile.attachmentIsImage && isUploadedDocumentFollowUp(text)
        );

        if (fileToUpload && !asksToEditUpload) {
            hideTyping();
            const uploadReply = uploadResult?.reply || "File uploaded. Tell me what you would like me to do with it.";
            const assistantMessage = { role: "assistant", text: uploadReply };
            currentChat.push(assistantMessage);
            addAIMessage(uploadReply);
            saveCurrentChat();
            return;
        }

        if (asksToEditUpload) {
            updateTypingStatus("Editing your file…");
            const editResponse = await fetch("/api/edit-upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    attachmentId: latestUploadedFile.attachmentId,
                    instruction: text
                })
            });
            const editData = await editResponse.json().catch(() => ({}));
            if (!editResponse.ok) throw new Error(editData.message || "Could not edit the uploaded file.");

            hideTyping();
            const editedMessage = {
                role: "assistant",
                text: editData.message || "The edited file is ready.",
                fileDownloads: [{
                    filename: editData.filename,
                    format: editData.format,
                    downloadUrl: editData.downloadUrl
                }],
                ...(editData.imageUrl ? { imageUrl: editData.imageUrl } : {})
            };
            currentChat.push(editedMessage);
            addAIMessage(editedMessage.text, editedMessage);
            if (voiceMode) speakReply(editedMessage.text);
            saveCurrentChat();
            return;
        }

        if (asksAboutUploadedDocument) {
            updateTypingStatus("Reading the complete uploaded document…");
            const progressId = window.crypto?.randomUUID?.()
                || "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, char => {
                    const random = Math.random() * 16 | 0;
                    return (char === "x" ? random : (random & 0x3 | 0x8)).toString(16);
                });
            const analysisResponse = await fetch("/api/analyze-upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ attachmentId: latestUploadedFile.attachmentId, instruction: text, progressId })
            });
            const analysisData = await analysisResponse.json().catch(() => ({}));
            if (!analysisResponse.ok || !analysisData.success) {
                throw new Error(analysisData.message || "Could not analyze the uploaded document.");
            }
            updateTypingStatus("Analyzing every section of the book…");
            const analysisResult = await waitForUploadAnalysis(analysisData.progressId || progressId);
            if (analysisResult.error) throw new Error(analysisResult.error);
            hideTyping();
            const answer = analysisResult.reply || "I could not prepare an answer from the uploaded document.";
            currentChat.push({ role: "assistant", text: answer });
            addAIMessage(answer);
            if (voiceMode) speakReply(answer);
            saveCurrentChat();
            return;
        }

        updateTypingStatus(fileToUpload
            ? "Analyzing the uploaded file…"
            : fileRequest
                ? getFileWorkStatus(text, fileRequest.formats[0])
                : "Thinking…");
        const response = await fetch("/chat", {

            method: "POST",

            headers: {

                "Content-Type": "application/json"

            },

            body: JSON.stringify({

    messages: currentChat,

    memory: memory,

    userId: userId,

    fileFormat: fileRequest?.formats?.[0] || "",

    fileContext: fileRequest?.usePrevious ? previousAssistantReply : ""

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

        let displayedReply = aiReply;
        let assistantMessage;
        if (fileRequest) {
            try {
                showTyping("Preparing your requested file…");
                const contentForFile = fileRequest.usePrevious && previousAssistantReply
                    ? previousAssistantReply
                    : aiReply;
                const fileDownloads = [];
                for (const format of fileRequest.formats) {
                    fileDownloads.push(await createGeneratedFile(contentForFile, format, text));
                }
                hideTyping();
                displayedReply = fileDownloads.length > 1
                    ? "Files created as requested."
                    : "File created as requested.";
                assistantMessage = { role: "assistant", text: displayedReply, fileDownloads };
            } catch (fileError) {
                hideTyping();
                displayedReply = fileError.message || "I couldn't create that file. Please try again.";
                assistantMessage = { role: "assistant", text: displayedReply };
            }
        } else {
            assistantMessage = { role: "assistant", text: aiReply };
        }
        currentChat.push(assistantMessage);
        addAIMessage(displayedReply, assistantMessage);

        if (voiceMode) {
            speakReply(displayedReply);
        }



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

        addAIMessage(`❌ ${error?.message || "Unable to contact AI server."}`);

    }

    finally {

        if (uploadProgressTimer) window.clearInterval(uploadProgressTimer);
        isTyping = false;

        if (voiceMode) resumeVoiceListening();

    }

}



// ================= SEND BUTTON =================

sendBtn.addEventListener(

    "click",

    sendMessage

);

imageGenerateBtn?.addEventListener("click", openImagePrompt);



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

);/* /* =====================================================
   PART 4 - HISTORY | NEW CHAT | THEME | SETTINGS
===================================================== */


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


        if (currentChat.id === chat.id) {

            item.classList.add("active");

        }


        item.innerHTML = `

            <i class="fa-solid fa-message"></i>

            <span>${chat.title}</span>

        `;


        item.onclick = () => {

            loadChat(chat);

            renderHistory();

            // Close mobile sidebar after selecting a chat

            if (
                window.innerWidth <= 768 &&
                sidebar
            ) {

                sidebar.classList.remove("open");

            }

        };


        history.appendChild(item);

    });

}



// ================= NEW CHAT =================

function newChat() {

    pendingUploadFile = null;
    pendingUploadBatchCount = 1;
    fileInput.value = "";
    renderPendingAttachment();

    currentChat = [];

    currentChat.id = null;

    clearMessages();

    welcomeScreen.style.display = "block";

    chatContainer.style.display = "flex";

    messageInput.focus();


    // Close mobile sidebar

    if (
        window.innerWidth <= 768 &&
        sidebar
    ) {

        sidebar.classList.remove("open");

    }

}



// ================= NEW CHAT BUTTON =================

if (newChatBtn) {

    newChatBtn.addEventListener(

        "click",

        newChat

    );

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


if (themeBtn) {

    themeBtn.addEventListener(

        "click",

        toggleTheme

    );

}


if (themeToggleBtn) {

    themeToggleBtn.addEventListener(

        "click",

        toggleTheme

    );

}



// ================= SETTINGS =================

if (settingsBtn) {

    settingsBtn.addEventListener(

        "click",

        () => {

            settingsModal.classList.remove(
                "hidden"
            );


            // Close mobile sidebar

            if (
                window.innerWidth <= 768 &&
                sidebar
            ) {

                sidebar.classList.remove(
                    "open"
                );

            }

        }

    );

}



// ================= ABOUT =================

if (aboutBtn) {

    aboutBtn.addEventListener(

        "click",

        () => {

            aboutModal.classList.remove(
                "hidden"
            );


            // Close mobile sidebar

            if (
                window.innerWidth <= 768 &&
                sidebar
            ) {

                sidebar.classList.remove(
                    "open"
                );

            }

        }

    );

}



// ================= CLOSE MODALS =================

document.querySelectorAll(

    ".close-modal"

).forEach(btn => {

    btn.addEventListener(

        "click",

        () => {

            if (settingsModal) {

                settingsModal.classList.add(
                    "hidden"
                );

            }


            if (aboutModal) {

                aboutModal.classList.add(
                    "hidden"
                );

            }

            if (imageLibraryModal) {
                imageLibraryModal.classList.add("hidden");
            }

            if (imagePromptModal) {
                imagePromptModal.classList.add("hidden");
            }

        }

    );

});



// ================= CLICK OUTSIDE MODALS =================

window.addEventListener(

    "click",

    (e) => {

        if (
            settingsModal &&
            e.target === settingsModal
        ) {

            settingsModal.classList.add(
                "hidden"
            );

        }


        if (
            aboutModal &&
            e.target === aboutModal
        ) {

            aboutModal.classList.add(
                "hidden"
            );

        }

        if (imageLibraryModal && e.target === imageLibraryModal) {
            imageLibraryModal.classList.add("hidden");
        }

        if (imagePromptModal && e.target === imagePromptModal) {
            imagePromptModal.classList.add("hidden");
        }

    }

);



// =====================================================
// MOBILE SIDEBAR
// =====================================================


// ================= OPEN / CLOSE SIDEBAR =================

if (mobileMenuBtn && sidebar) {

    mobileMenuBtn.addEventListener(

        "click",

        (event) => {

            event.stopPropagation();

            sidebar.classList.toggle("open");

        }

    );

}



// ================= CLOSE SIDEBAR OUTSIDE =================

document.addEventListener(

    "click",

    (event) => {

        if (
            window.innerWidth > 768 ||
            !sidebar ||
            !mobileMenuBtn
        ) {

            return;

        }


        const clickedInsideSidebar =
            sidebar.contains(event.target);


        const clickedMenuButton =
            mobileMenuBtn.contains(event.target);


        if (
            !clickedInsideSidebar &&
            !clickedMenuButton
        ) {

            sidebar.classList.remove("open");

        }

    }

);



// ================= CLOSE SIDEBAR ON RESIZE =================

window.addEventListener(

    "resize",

    () => {

        if (
            window.innerWidth > 768 &&
            sidebar
        ) {

            sidebar.classList.remove("open");

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

function attachFiles(files) {
    const selectedFiles = Array.from(files || [])
        .filter(file => file && typeof file.name === "string")
        .map(file => {
            if (file.name.trim()) return file;
            const extension = ({
                "image/png": "png",
                "image/jpeg": "jpg",
                "image/webp": "webp",
                "application/pdf": "pdf",
                "text/plain": "txt"
            })[file.type] || "bin";
            return new File([file], `pasted-file.${extension}`, { type: file.type, lastModified: file.lastModified });
        })
        .filter(file => file.size > 0);
    if (!selectedFiles.length) {
        addAIMessage("The selected file is empty (0 bytes), so it cannot be uploaded. Download or copy the complete file again and try once more.");
        return;
    }
    if (!selectedFiles.length) return;
    pendingUploadFile = selectedFiles[0];
    pendingUploadBatchCount = selectedFiles.length;
    renderPendingAttachment();
    messageInput.focus();
}

fileInput.addEventListener("change", () => {
    if (!fileInput.files?.length) return;
    attachFiles(fileInput.files);
});

document.addEventListener("paste", event => {
    const clipboard = event.clipboardData;
    if (!clipboard) return;
    let files = Array.from(clipboard.files || []);
    if (!files.length) {
        files = Array.from(clipboard.items || [])
            .filter(item => item.kind === "file")
            .map(item => item.getAsFile())
            .filter(Boolean);
    }
    if (!files.length) return;
    event.preventDefault();
    attachFiles(files);
});

function dragContainsFiles(event) {
    return Array.from(event.dataTransfer?.types || []).includes("Files");
}

document.addEventListener("dragenter", event => {
    if (!dragContainsFiles(event)) return;
    event.preventDefault();
    fileDropOverlay?.classList.remove("hidden");
});

document.addEventListener("dragover", event => {
    if (!dragContainsFiles(event)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
});

document.addEventListener("dragleave", event => {
    if (!dragContainsFiles(event) || event.relatedTarget) return;
    fileDropOverlay?.classList.add("hidden");
});

document.addEventListener("drop", event => {
    if (!dragContainsFiles(event)) return;
    event.preventDefault();
    fileDropOverlay?.classList.add("hidden");
    attachFiles(event.dataTransfer.files);
});



// ================= VOICE CHAT =================

let voiceMode = false;
let recognition = null;
let recognitionRunning = false;
let holdPressTimer = null;
let pointerDown = false;
let longPressTriggered = false;
let voiceInputFinalized = true;
let pendingVoiceTranscript = "";
let listenRestartTimer = null;
let assistantSpeechText = "";
let assistantSpeechActive = false;

const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
const voiceSelect = document.getElementById("voiceSelect");
const previewVoiceBtn = document.getElementById("previewVoiceBtn");
let availableSpeechVoices = [];

function populateSpeechVoices() {
    if (!window.speechSynthesis || !voiceSelect) return;

    const savedVoiceURI = localStorage.getItem("bzuSpeechVoiceURI") || "";
    availableSpeechVoices = window.speechSynthesis.getVoices();

    voiceSelect.innerHTML = '<option value="">System default</option>';

    availableSpeechVoices.forEach((voice) => {
        const option = document.createElement("option");
        option.value = voice.voiceURI;
        option.textContent = `${voice.name} (${voice.lang})${voice.default ? " — Default" : ""}`;
        voiceSelect.appendChild(option);
    });

    if (availableSpeechVoices.some(voice => voice.voiceURI === savedVoiceURI)) {
        voiceSelect.value = savedVoiceURI;
    } else if (savedVoiceURI) {
        localStorage.removeItem("bzuSpeechVoiceURI");
    }
}

function requestedFileRequest(request) {
    const raw = String(request || "");
    const hasCreateAction = /\b(create|make|generate|export|download|save|convert|turn|put|prepare|write|send|give|get|provide|build|develop|design|implement)\b/i.test(raw)
        || /\b(?:want|need)\s+(?:a|an|the|this|that|my|your)?\s*(?:file|document|pdf|word|docx|xlsx|pptx|csv|json|txt)\b/i.test(raw);
    const formatRules = [
        [/\b(pdf file|pdf document|pdf report|pdf version|as (?:a )?pdf|into (?:a )?pdf|to (?:a )?pdf|(?:its|it|this|that) pdf|(?:create|make|generate|give|get|provide)\s+(?:me\s+)?(?:a\s+)?pdf|\.pdf)\b/i, "pdf"],
        [/\b(docx|word document|word file|word doc|microsoft word|as (?:a )?word|into (?:a )?word|to word|in word|\.docx)\b/i, "docx"],
        [/\b(xlsx|excel file|excel spreadsheet|spreadsheet file|as excel|into excel|to excel|\.xlsx)\b/i, "xlsx"],
        [/\b(pptx|powerpoint file|powerpoint presentation|presentation file|presentation|slide deck|slides|as powerpoint|to powerpoint|\.pptx)\b/i, "pptx"],
        [/\b(csv file|as csv|to csv|\.csv)\b/i, "csv"],
        [/\b(json file|as json|to json|\.json)\b/i, "json"],
        [/\b(html file|html document|html page|web page|webpage|website|website file|as html|in html|\.html)\b/i, "html"],
        [/\b(spreadsheet|workbook)\b/i, "xlsx"],
        [/\b(markdown file|as markdown|to markdown|\.md)\b/i, "md"],
        [/\b(text file|txt file|\.txt)\b/i, "txt"],
        [/\b(javascript file|js file|\.js)\b/i, "js"],
        [/\b(typescript file|ts file|\.ts)\b/i, "ts"],
        [/\b(css file|\.css)\b/i, "css"],
        [/\b(python file|python script|py file|\.py)\b/i, "py"],
        [/\b(sql file|\.sql)\b/i, "sql"],
        [/\b(xml file|\.xml)\b/i, "xml"],
        [/\b(yaml|\.yaml)\b/i, "yaml"],
        [/\b(yml file|\.yml)\b/i, "yml"],
        [/\b(rtf)\b/i, "rtf"],
        [/\b(java file|\.java)\b/i, "java"],
        [/\b(c\+\+|cpp file|\.cpp)\b/i, "cpp"],
        [/\b(c source file|\.c)\b/i, "c"],
        [/\b(shell script|bash script|\.sh)\b/i, "sh"],
        [/\b(php file|\.php)\b/i, "php"],
        [/\b(go file|\.go)\b/i, "go"],
        [/\b(rust file|\.rs)\b/i, "rs"],
        [/\b(toml file|\.toml)\b/i, "toml"],
        [/\b(ini file|\.ini)\b/i, "ini"],
        [/\b(ruby file|\.rb)\b/i, "rb"],
        [/\b(swift file|\.swift)\b/i, "swift"],
        [/\b(kotlin file|\.kt)\b/i, "kt"],
        [/\b(dart file|\.dart)\b/i, "dart"],
        [/\b(r source file|\.r)\b/i, "r"],
        [/\b(scala file|\.scala)\b/i, "scala"],
        [/\b(jsx file|\.jsx)\b/i, "jsx"],
        [/\b(tsx file|\.tsx)\b/i, "tsx"],
        [/\b(vue file|\.vue)\b/i, "vue"],
        [/\b(svelte file|\.svelte)\b/i, "svelte"],
        [/\b(scss file|\.scss)\b/i, "scss"],
        [/\b(less file|\.less)\b/i, "less"],
        [/\b(latex|\.tex)\b/i, "tex"],
        [/\b(restructuredtext|\.rst)\b/i, "rst"],
        [/\b(log file|\.log)\b/i, "log"],
        [/\b(configuration file|\.conf)\b/i, "conf"],
        [/\b(gradle file|\.gradle)\b/i, "gradle"]
    ];
    const formats = [...new Set(formatRules.filter(([pattern]) => pattern.test(raw)).map(([, format]) => format))];
    const requestedExtension = raw.match(/\.([a-z0-9]{1,10})\b/i)?.[1]?.toLowerCase();
    if (!formats.length && requestedExtension) formats.push(requestedExtension);
    const mentionsFileOutput = /\b(file|document|report|spreadsheet|presentation|slides|slide deck|downloadable|script file|source file|website|webpage|web page|assignment|coursework|homework|essay|code|program|script|source code)\b/i.test(raw);
    if (!hasCreateAction || (!formats.length && !mentionsFileOutput)) return null;
    if (!formats.length) {
        if (/\b(presentation|slides|slide deck)\b/i.test(raw)) formats.push("pptx");
        else if (/\b(spreadsheet|workbook)\b/i.test(raw)) formats.push("xlsx");
        else if (/\b(website|webpage|web page)\b/i.test(raw)) formats.push("html");
        else if (/\b(assignment|coursework|homework|essay|research paper|lab report|document|report|resume|résumé|cv|letter|proposal)\b/i.test(raw)) formats.push("docx");
        else {
            const codeFormats = [
                [/\b(python|python script)\b/i, "py"],
                [/\b(javascript|node\.js)\b/i, "js"],
                [/\btypescript\b/i, "ts"],
                [/\b(java)\b/i, "java"],
                [/\b(c#|c sharp)\b/i, "cs"],
                [/\b(c\+\+|cpp)\b/i, "cpp"],
                [/\b(c programming|c language)\b/i, "c"],
                [/\b(php)\b/i, "php"],
                [/\b(rust)\b/i, "rs"],
                [/\b(go language|golang)\b/i, "go"],
                [/\b(ruby)\b/i, "rb"],
                [/\b(swift)\b/i, "swift"],
                [/\b(kotlin)\b/i, "kt"],
                [/\b(dart)\b/i, "dart"],
                [/\b(r programming|r language)\b/i, "r"],
                [/\b(scala)\b/i, "scala"],
                [/\b(bash|shell script)\b/i, "sh"],
                [/\b(sql)\b/i, "sql"],
                [/\b(html)\b/i, "html"],
                [/\b(css)\b/i, "css"]
            ];
            const detectedCodeFormat = codeFormats.find(([pattern]) => pattern.test(raw))?.[1];
            formats.push(detectedCodeFormat || "txt");
        }
    }
    return {
        formats,
        usePrevious: /\b(that|this|it|its|above|previous|last answer|last reply|uploaded|attached)\b/i.test(raw)
            || /\b(?:the|my|that|this|uploaded|attached)\s+(?:file|image|photo|picture|document|spreadsheet)\b/i.test(raw)
    };
}

function getFileWorkStatus(request, format) {
    const text = String(request || "");
    if (/\b(website|web page|webpage|landing page|web app)\b/i.test(text)) return "Planning your website…";
    if (/\b(assignment|coursework|homework|essay|research paper|lab report)\b/i.test(text)) return "Structuring your assignment…";
    if (["js", "ts", "py", "java", "cpp", "c", "php", "go", "rs", "jsx", "tsx"].includes(format)) return "Writing your code…";
    return "Preparing your requested content…";
}

async function waitForUploadAnalysis(progressId) {
    const deadline = Date.now() + 30 * 60 * 1000;
    while (Date.now() < deadline) {
        const response = await fetch(`/api/upload-progress/${encodeURIComponent(progressId)}`, { cache: "no-store" });
        if (!response.ok) throw new Error("The book analysis status was lost. Please upload the book again.");
        const progress = await response.json();
        if (progress.status) updateTypingStatus(progress.status);
        if (progress.complete) return progress.result || {};
        await new Promise(resolve => window.setTimeout(resolve, 1200));
    }
    throw new Error("The book is taking longer than expected to analyze. Please try a smaller file or upload the book again.");
}

async function createGeneratedFile(content, format, requestedName = "") {
    const response = await fetch("/api/create-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, format, requestedName })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Could not create the requested file.");
    return { downloadUrl: data.downloadUrl, filename: data.filename, format };
}

function getSelectedSpeechVoice() {
    const selectedURI = voiceSelect?.value;
    return availableSpeechVoices.find(voice => voice.voiceURI === selectedURI) || null;
}

function handleVoiceChangeRequest(text) {
    const request = String(text).toLowerCase();
    const asksToChangeVoice =
        /\b(change|switch|use|try|pick|select)\b.{0,45}\b(voice|accent|speaker)\b/.test(request) ||
        /\b(voice|accent|speaker)\b.{0,45}\b(change|switch|different|another|new)\b/.test(request);

    if (!asksToChangeVoice) return null;

    populateSpeechVoices();
    if (availableSpeechVoices.length < 2) {
        return "I can’t switch voices because your browser only provides one speech voice. Add another voice in your device or browser settings, then ask me again.";
    }

    const currentVoice = getSelectedSpeechVoice() ||
        availableSpeechVoices.find(voice => voice.default) ||
        availableSpeechVoices[0];
    const currentIndex = availableSpeechVoices.findIndex(
        voice => voice.voiceURI === currentVoice.voiceURI
    );
    const nextVoice = availableSpeechVoices[(currentIndex + 1) % availableSpeechVoices.length];

    if (voiceSelect) voiceSelect.value = nextVoice.voiceURI;
    localStorage.setItem("bzuSpeechVoiceURI", nextVoice.voiceURI);

    return `Sure — I’ve changed my voice to ${nextVoice.name}.`;
}

if (window.speechSynthesis) {
    populateSpeechVoices();
    window.speechSynthesis.addEventListener("voiceschanged", populateSpeechVoices);
}

voiceSelect?.addEventListener("change", () => {
    localStorage.setItem("bzuSpeechVoiceURI", voiceSelect.value);
});

previewVoiceBtn?.addEventListener("click", () => {
    if (!window.speechSynthesis) return;

    const preview = new SpeechSynthesisUtterance("Hello! This is how my voice sounds.");
    const selectedVoice = getSelectedSpeechVoice();
    if (selectedVoice) {
        preview.voice = selectedVoice;
        preview.lang = selectedVoice.lang;
    }
    preview.onend = () => {
        if (voiceMode) resumeVoiceListening();
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(preview);
});

function updateVoiceButton() {
    voiceBtn.classList.toggle("voice-active", voiceMode);
    voiceBtn.classList.toggle("voice-listening", recognitionRunning && !voiceMode);
    voiceBtn.setAttribute("aria-pressed", String(voiceMode || recognitionRunning));
    voiceBtn.title = voiceMode
        ? "Voice chat active — press to stop"
        : recognitionRunning
            ? pointerDown
                ? "Speak now; release for voice chat or tap once for dictation"
                : "Listening for dictation"
            : "Tap to dictate; press and hold for voice chat";
    voiceBtn.setAttribute("aria-label", voiceBtn.title);
    voiceBtn.innerHTML = voiceMode
        ? '<i class="fa-solid fa-microphone-lines"></i>'
        : '<i class="fa-solid fa-microphone"></i>';
}

function finishVoiceChat() {
    voiceMode = false;
    pointerDown = false;
    longPressTriggered = false;
    voiceInputFinalized = true;
    pendingVoiceTranscript = "";
    assistantSpeechText = "";
    assistantSpeechActive = false;
    if (listenRestartTimer) {
        window.clearTimeout(listenRestartTimer);
        listenRestartTimer = null;
    }
    if (recognitionRunning) recognition.stop();
    window.speechSynthesis?.cancel();
    updateVoiceButton();
}

function speakReply(text) {
    if (!voiceMode) return;
    if (!window.speechSynthesis) {
        resumeVoiceListening();
        return;
    }

    window.speechSynthesis.cancel();
    const spokenText = String(text)
        .replace(/```[\s\S]*?```/g, " Code block omitted. ")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/!?\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/https?:\/\/\S+/g, "")
        .replace(/[#*_>~]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (!spokenText) {
        resumeVoiceListening();
        return;
    }

    assistantSpeechText = spokenText.toLowerCase();
    assistantSpeechActive = true;
    const utterance = new SpeechSynthesisUtterance(spokenText);
    const selectedVoice = getSelectedSpeechVoice();
    if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
    } else {
        utterance.lang = recognition?.lang || "en-US";
    }
    utterance.onend = () => {
        assistantSpeechActive = false;
        resumeVoiceListening();
    };
    utterance.onerror = () => {
        assistantSpeechActive = false;
        resumeVoiceListening();
    };
    window.speechSynthesis.speak(utterance);
    resumeVoiceListening();
}

function resumeVoiceListening() {
    if (!voiceMode || isTyping || recognitionRunning ||
        (window.speechSynthesis?.speaking && !assistantSpeechActive) || listenRestartTimer) return;

    listenRestartTimer = window.setTimeout(() => {
        listenRestartTimer = null;
        if (!voiceMode || isTyping || recognitionRunning ||
            (window.speechSynthesis?.speaking && !assistantSpeechActive)) return;
        voiceInputFinalized = false;
        pendingVoiceTranscript = "";
        startVoiceRecognition();
    }, 300);
}

function soundsLikeAssistantEcho(text) {
    const candidate = String(text).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    const response = assistantSpeechText.replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    const words = candidate.split(/\s+/).filter(Boolean);
    if (words.length < 2 || candidate.length < 10) return false;
    if (response.includes(candidate)) return true;

    const responseWords = new Set(response.split(/\s+/));
    const matchedWords = words.filter(word => responseWords.has(word)).length;
    return matchedWords / words.length >= 0.75;
}

function interruptAssistantSpeech() {
    if (!assistantSpeechActive) return;
    assistantSpeechActive = false;
    window.speechSynthesis?.cancel();
}

function startVoiceRecognition() {
    if (!recognition || recognitionRunning) return;
    try {
        recognition.start();
        recognitionRunning = true;
        updateVoiceButton();
    } catch (error) {
        console.warn("Unable to start voice recognition:", error);
        pointerDown = false;
        voiceMode = false;
        voiceInputFinalized = true;
        updateVoiceButton();
    }
}

function finishVoiceInput() {
    if (voiceInputFinalized) return;
    voiceInputFinalized = true;
    const transcript = pendingVoiceTranscript.trim();
    pendingVoiceTranscript = "";

    if (voiceMode) {
        if (transcript) {
            messageInput.value = transcript;
            sendMessage();
        } else {
            resumeVoiceListening();
        }
        return;
    }

    if (!transcript) return;
    messageInput.value = transcript;
    messageInput.focus();
    updateVoiceButton();
}

function beginHoldToTalk(event) {
    if (voiceMode) {
        event.preventDefault();
        finishVoiceChat();
        return;
    }
    if (!recognition || pointerDown || recognitionRunning) return;
    if (event.type === "pointerdown" && event.button !== 0) return;
    event.preventDefault();

    pointerDown = true;
    longPressTriggered = false;
    voiceInputFinalized = false;
    pendingVoiceTranscript = "";
    startVoiceRecognition();

    holdPressTimer = window.setTimeout(() => {
        holdPressTimer = null;
        if (!pointerDown) return;
        longPressTriggered = true;
        voiceMode = true;
        updateVoiceButton();
        window.speechSynthesis?.cancel();
        if (!recognitionRunning) {
            if (pendingVoiceTranscript.trim()) {
                finishVoiceInput();
            } else {
                voiceInputFinalized = false;
                startVoiceRecognition();
            }
        }
    }, 400);
}

function endHoldToTalk() {
    if (!pointerDown) return;
    pointerDown = false;
    if (holdPressTimer) {
        window.clearTimeout(holdPressTimer);
        holdPressTimer = null;
    }
    if (longPressTriggered && voiceMode) {
        if (!recognitionRunning && !isTyping && !window.speechSynthesis?.speaking) {
            resumeVoiceListening();
        }
        updateVoiceButton();
        return;
    }
    if (longPressTriggered && recognitionRunning) {
        recognition.stop();
    } else if (!recognitionRunning) {
        finishVoiceInput();
    } else {
        updateVoiceButton();
    }
}

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
        for (let index = event.resultIndex; index < event.results.length; index++) {
            const result = event.results[index];
            const transcript = result[0]?.transcript?.trim();
            if (!transcript) continue;

            if (assistantSpeechActive && soundsLikeAssistantEcho(transcript)) continue;
            if (assistantSpeechActive) interruptAssistantSpeech();

            if (result.isFinal) {
                pendingVoiceTranscript = `${pendingVoiceTranscript} ${transcript}`.trim();
            }
        }
    };

    recognition.onerror = (event) => {
        recognitionRunning = false;
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
            pointerDown = false;
            finishVoiceChat();
            alert("Microphone access was blocked. Allow microphone access in your browser and try again.");
            return;
        }
        if (voiceMode && event.error !== "no-speech" && event.error !== "aborted") {
            console.warn("Voice recognition error:", event.error);
        }
    };

    recognition.onend = () => {
        recognitionRunning = false;
        updateVoiceButton();
        if (voiceMode) {
            finishVoiceInput();
        } else if (pointerDown && longPressTriggered) {
            window.setTimeout(() => {
                if (pointerDown && longPressTriggered) startVoiceRecognition();
            }, 200);
        } else if (!pointerDown) {
            finishVoiceInput();
        }
    };

    voiceBtn.addEventListener("pointerdown", beginHoldToTalk);
    window.addEventListener("pointerup", endHoldToTalk);
    voiceBtn.addEventListener("pointercancel", endHoldToTalk);
    voiceBtn.addEventListener("contextmenu", event => event.preventDefault());
    voiceBtn.addEventListener("keydown", event => {
        if ((event.key === " " || event.key === "Enter") && !event.repeat) {
            beginHoldToTalk(event);
        }
    });
    voiceBtn.addEventListener("keyup", event => {
        if (event.key === " " || event.key === "Enter") endHoldToTalk();
    });
} else {
    voiceBtn.title = "Voice input is not supported by this browser";
    voiceBtn.setAttribute("aria-label", voiceBtn.title);
    voiceBtn.disabled = true;
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
