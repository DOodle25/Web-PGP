const PANEL_BUTTON_ID = "webpgp-gmail-fab";

const findComposeBox = () => {
  const active = document.activeElement;
  if (active && active.getAttribute("role") === "textbox") {
    return active;
  }
  return document.querySelector('div[role="textbox"][contenteditable="true"]');
};

const insertText = (text) => {
  const box = findComposeBox();
  if (!box) return false;
  box.focus();
  try {
    document.execCommand("insertText", false, text);
    return true;
  } catch (err) {
    box.textContent = text;
    return true;
  }
};

const cacheDraft = () => {
  const box = findComposeBox();
  if (!box) return;
  chrome.storage.local.set({ webpgpDraft: box.innerText });
};

const ensureButton = () => {
  if (document.getElementById(PANEL_BUTTON_ID)) return;
  const button = document.createElement("button");
  button.id = PANEL_BUTTON_ID;
  button.type = "button";
  button.textContent = "Web-PGP";
  button.style.position = "fixed";
  button.style.bottom = "20px";
  button.style.right = "20px";
  button.style.zIndex = "9999";
  button.style.padding = "10px 14px";
  button.style.borderRadius = "999px";
  button.style.border = "1px solid #d0d7e2";
  button.style.background = "#ffffff";
  button.style.color = "#1c2430";
  button.style.fontWeight = "600";
  button.style.cursor = "pointer";
  button.addEventListener("click", () => {
    cacheDraft();
    chrome.runtime.sendMessage({ type: "webpgp-open-panel" });
  });
  document.body.appendChild(button);
};

const init = () => {
  ensureButton();
  setInterval(ensureButton, 4000);
  document.addEventListener("focusin", () => cacheDraft());
};

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "webpgp-insert-text") {
    insertText(message.payload || "");
  }
});

init();
