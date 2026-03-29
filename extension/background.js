const openSidePanel = async (tabId) => {
  if (!tabId) return;
  await chrome.sidePanel.setOptions({
    tabId,
    path: "sidepanel.html",
    enabled: true,
  });
  await chrome.sidePanel.open({ tabId });
};

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type === "webpgp-open-panel") {
    openSidePanel(sender?.tab?.id).catch(() => undefined);
  }
});
