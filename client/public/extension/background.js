const openSidePanel = async (tabId) => {
  if (!tabId) return;
  await chrome.sidePanel.setOptions({
    tabId,
    path: "sidepanel.html",
    enabled: true,
  });
  await chrome.sidePanel.open({ tabId });
};

const openFallbackTab = () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("sidepanel.html") });
};

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type === "webpgp-open-panel") {
    openSidePanel(sender?.tab?.id).catch(() => openFallbackTab());
  }
});

chrome.action.onClicked.addListener((tab) => {
  openSidePanel(tab?.id).catch(() => openFallbackTab());
});
