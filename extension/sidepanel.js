const WEB_PGP_URL = "https://mango-bush-077d10b00.1.azurestaticapps.net/";

const frame = document.getElementById("webpgpFrame");
const openWebpgp = document.getElementById("openWebpgp");
const encryptedText = document.getElementById("encryptedText");
const insertEncrypted = document.getElementById("insertEncrypted");
const refreshDraft = document.getElementById("refreshDraft");
const copyDraft = document.getElementById("copyDraft");
const draftStatus = document.getElementById("draftStatus");

frame.src = `${WEB_PGP_URL}?source=gmail-extension`;
openWebpgp.addEventListener("click", () => {
  chrome.tabs.create({ url: WEB_PGP_URL });
});

const loadDraft = () => {
  chrome.storage.local.get(["webpgpDraft"], (data) => {
    const draft = data.webpgpDraft || "";
    draftStatus.textContent = draft
      ? "Loaded draft from Gmail compose."
      : "No draft found yet. Focus a Gmail compose box first.";
  });
};

refreshDraft.addEventListener("click", loadDraft);

copyDraft.addEventListener("click", () => {
  chrome.storage.local.get(["webpgpDraft"], (data) => {
    const draft = data.webpgpDraft || "";
    navigator.clipboard.writeText(draft);
    draftStatus.textContent = draft
      ? "Draft copied to clipboard."
      : "No draft available to copy.";
  });
});

insertEncrypted.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id;
    if (!tabId) return;
    chrome.tabs.sendMessage(tabId, {
      type: "webpgp-insert-text",
      payload: encryptedText.value,
    });
  });
});

loadDraft();
