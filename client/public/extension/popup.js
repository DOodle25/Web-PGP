const API_URL =
  "https://web-pgp-backend-bgb0fxakaudhdufu.westindia-01.azurewebsites.net";
const WEB_PGP_URL = "https://mango-bush-077d10b00.1.azurestaticapps.net/";

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login");
const logoutBtn = document.getElementById("logout");
const authStatus = document.getElementById("authStatus");
const keysList = document.getElementById("keysList");
const encryptedText = document.getElementById("encryptedText");
const insertEncrypted = document.getElementById("insertEncrypted");
const insertStatus = document.getElementById("insertStatus");
const openWebpgp = document.getElementById("openWebpgp");

const setStatus = (node, message) => {
  node.textContent = message || "";
};

const apiRequest = async (path, { method = "GET", body, token } = {}) => {
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Request failed");
  }
  return response.json();
};

const storeSession = (data) =>
  chrome.storage.local.set({
    webpgpToken: data.token,
    webpgpUser: data.user,
    webpgpExpiry: data.expiresAt,
  });

const clearSession = () =>
  chrome.storage.local.set({
    webpgpToken: null,
    webpgpUser: null,
    webpgpExpiry: null,
  });

const renderKeys = (keys = []) => {
  if (!keys.length) {
    keysList.innerHTML = "<p class=\"hint\">No keys available.</p>";
    return;
  }
  keysList.innerHTML = keys
    .map(
      (key) =>
        `<div class=\"key-item\">${
          key.label || key.fingerprint || "Unnamed key"
        }</div>`,
    )
    .join("");
};

const loadKeys = async () => {
  chrome.storage.local.get(["webpgpToken"], async (data) => {
    if (!data.webpgpToken) {
      renderKeys([]);
      return;
    }
    try {
      const keys = await apiRequest("/api/keys", {
        token: data.webpgpToken,
      });
      renderKeys(keys);
    } catch (err) {
      renderKeys([]);
      setStatus(authStatus, err.message);
    }
  });
};

loginBtn.addEventListener("click", async () => {
  setStatus(authStatus, "Signing in...");
  try {
    const data = await apiRequest("/api/auth/login", {
      method: "POST",
      body: { email: emailInput.value, password: passwordInput.value },
    });
    await storeSession(data);
    setStatus(authStatus, "Logged in.");
    await loadKeys();
  } catch (err) {
    setStatus(authStatus, err.message);
  }
});

logoutBtn.addEventListener("click", async () => {
  await clearSession();
  setStatus(authStatus, "Logged out.");
  renderKeys([]);
});

insertEncrypted.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id;
    if (!tabId) {
      setStatus(insertStatus, "No active Gmail tab found.");
      return;
    }
    chrome.tabs.sendMessage(tabId, {
      type: "webpgp-insert-text",
      payload: encryptedText.value,
    });
    setStatus(insertStatus, "Inserted into Gmail compose.");
  });
});

openWebpgp.addEventListener("click", () => {
  chrome.tabs.create({ url: WEB_PGP_URL });
});

loadKeys();
