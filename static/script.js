const log = document.getElementById("log");
const form = document.getElementById("f");
const textarea = document.getElementById("q");
const sendBtn = document.getElementById("send");
const clearBtn = document.getElementById("clear-btn");
const welcomeCard = document.getElementById("welcome-card");

let history = [];
let currentAbortController = null;
let isGenerating = false;

// Configure marked for GitHub Flavored Markdown and breaks
if (window.marked) {
  marked.setOptions({
    breaks: true,
    gfm: true
  });
}

function renderContent(element, text) {
  if (window.marked) {
    try {
      element.innerHTML = marked.parse(text);
      element.querySelectorAll("a").forEach(a => {
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      });
      return;
    } catch (e) {
      console.warn("Markdown parse error:", e);
    }
  }
  element.textContent = text;
}

function scrollToBottom() {
  log.scrollTop = log.scrollHeight;
}

function removeWelcomeCard() {
  if (welcomeCard && welcomeCard.parentNode) {
    welcomeCard.remove();
  }
}

function setGeneratingState(generating) {
  isGenerating = generating;
  if (generating) {
    sendBtn.classList.add("stop-state");
    sendBtn.title = "Stop generating";
    sendBtn.setAttribute("aria-label", "Stop generating");
    sendBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <rect x="5" y="5" width="14" height="14" rx="2" ry="2"></rect>
      </svg>
    `;
  } else {
    sendBtn.classList.remove("stop-state");
    sendBtn.title = "Send message";
    sendBtn.setAttribute("aria-label", "Send message");
    sendBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
      </svg>
    `;
    currentAbortController = null;
  }
}

function createTypingIndicator() {
  const wrapper = document.createElement("div");
  wrapper.className = "msg-wrapper bot-wrapper";

  const msg = document.createElement("div");
  msg.className = "msg";
  msg.innerHTML = `
    <div class="typing-dots">
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    </div>
  `;

  wrapper.appendChild(msg);
  log.appendChild(wrapper);
  scrollToBottom();

  return { wrapper, msg };
}

function addMessage(role, text) {
  removeWelcomeCard();

  const wrapper = document.createElement("div");
  wrapper.className = `msg-wrapper ${role}-wrapper`;

  const msg = document.createElement("div");
  msg.className = "msg";

  if (role === "user") {
    msg.textContent = text;
    wrapper.appendChild(msg);
  } else {
    renderContent(msg, text);
    wrapper.appendChild(msg);
    attachCopyAction(wrapper, text);
  }

  log.appendChild(wrapper);
  scrollToBottom();
  return { wrapper, msg };
}

function attachCopyAction(wrapper, text) {
  const actions = document.createElement("div");
  actions.className = "msg-actions";

  const copyBtn = document.createElement("button");
  copyBtn.className = "action-btn";
  copyBtn.type = "button";
  copyBtn.innerHTML = `
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
    <span>Copy</span>
  `;
  copyBtn.onclick = () => {
    navigator.clipboard.writeText(text).then(() => {
      const span = copyBtn.querySelector("span");
      span.textContent = "Copied!";
      setTimeout(() => (span.textContent = "Copy"), 2000);
    });
  };
  actions.appendChild(copyBtn);
  wrapper.appendChild(actions);
}

// Auto-expand textarea as user types
textarea.addEventListener("input", () => {
  textarea.style.height = "auto";
  textarea.style.height = Math.min(textarea.scrollHeight, 140) + "px";
});

// Submit on Enter (unless Shift is held)
textarea.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    form.requestSubmit();
  }
});

async function handleSendMessage(text) {
  if (!text) return;

  textarea.value = "";
  textarea.style.height = "auto";

  addMessage("user", text);
  history.push({ role: "user", content: text });

  const { wrapper: typingWrapper, msg: typingMsg } = createTypingIndicator();
  
  currentAbortController = new AbortController();
  setGeneratingState(true);

  try {
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history, stream: true }),
      signal: currentAbortController.signal
    });

    if (res.status === 429) {
      typingMsg.textContent = "⏳ Too many requests. Please wait a minute before asking again.";
      setGeneratingState(false);
      return;
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let accumulatedText = "";
    let isFirstChunk = true;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payloadStr = line.replace(/^data:\s*/, "").trim();
        if (!payloadStr) continue;

        try {
          const payload = JSON.parse(payloadStr);

          if (payload.error) {
            accumulatedText = `⚠️ ${payload.error}`;
            break;
          }

          if (isFirstChunk && payload.token) {
            typingMsg.innerHTML = "";
            isFirstChunk = false;
          }

          if (payload.token) {
            accumulatedText += payload.token;
            renderContent(typingMsg, accumulatedText);
            scrollToBottom();
          }

          if (payload.done) {
            break;
          }
        } catch (e) {
          console.warn("SSE parse error", e);
        }
      }
    }

    if (!accumulatedText) {
      accumulatedText = "No response received.";
      renderContent(typingMsg, accumulatedText);
    }

    history.push({ role: "assistant", content: accumulatedText });
    attachCopyAction(typingWrapper, accumulatedText);

  } catch (err) {
    if (err.name === "AbortError") {
      // Stopped by user
      const stoppedNotice = document.createElement("span");
      stoppedNotice.style.cssText = "display:block; font-size: 0.78rem; color: var(--text-muted); margin-top: 0.35rem; font-style: italic;";
      stoppedNotice.textContent = "(Generation stopped)";
      typingWrapper.querySelector(".msg").appendChild(stoppedNotice);
    } else {
      console.error("Chat error:", err);
      typingMsg.textContent = "⚠️ Connection error. Please ensure the backend and Ollama are running.";
    }
  } finally {
    setGeneratingState(false);
    textarea.focus();
  }
}

form.onsubmit = async (e) => {
  e.preventDefault();
  if (isGenerating && currentAbortController) {
    // User pressed Stop
    currentAbortController.abort();
    return;
  }
  const text = textarea.value.trim();
  if (!text) return;
  await handleSendMessage(text);
};

// Quick prompt chip triggers
document.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (chip) {
    const prompt = chip.getAttribute("data-prompt");
    if (prompt && !isGenerating) {
      handleSendMessage(prompt);
    }
  }
});

// Clear conversation
if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    if (isGenerating && currentAbortController) {
      currentAbortController.abort();
    }
    history = [];
    log.innerHTML = "";
    if (welcomeCard) {
      log.appendChild(welcomeCard);
    }
    textarea.focus();
  });
}
