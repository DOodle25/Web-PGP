import { useState } from "react";

const EXTENSION_FOLDER = "extension";
const EXTENSION_FILES = [
  "manifest.json",
  "background.js",
  "contentScript.js",
  "sidepanel.html",
  "sidepanel.js",
  "sidepanel.css",
];
const JSZIP_URL = "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";

export const ExtensionSetup = () => {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const loadZipLibrary = () =>
    new Promise((resolve, reject) => {
      if (window.JSZip) {
        resolve(window.JSZip);
        return;
      }
      const script = document.createElement("script");
      script.src = JSZIP_URL;
      script.async = true;
      script.onload = () => resolve(window.JSZip);
      script.onerror = () => reject(new Error("Failed to load zip library."));
      document.body.appendChild(script);
    });

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const JSZip = await loadZipLibrary();
      const zip = new JSZip();
      const basePath = `/${EXTENSION_FOLDER}`;
      await Promise.all(
        EXTENSION_FILES.map(async (fileName) => {
          const response = await fetch(`${basePath}/${fileName}`);
          const content = await response.text();
          zip.file(fileName, content);
        }),
      );
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "web-pgp-extension.zip";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloading(false);
      return;
    }
    setDownloading(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(EXTENSION_FOLDER);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      setCopied(false);
    }
  };

  return (
    <section className="panel page">
      <div className="page-header">
        <div>
          <h2>Gmail Extension Setup</h2>
          <p className="page-subtitle">
            Install the Web-PGP extension in Chrome/Edge and enable it for
            Gmail.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Download and install</h3>
          <span className="hint">Get the extension ZIP from this page.</span>
        </div>
        <div className="actions">
          <button onClick={handleDownload} disabled={downloading}>
            {downloading ? "Preparing..." : "Download extension ZIP"}
          </button>
          <button className="ghost" onClick={handleCopy}>
            {copied ? "Copied" : "Copy folder name"}
          </button>
        </div>
        <ol className="steps">
          <li>Download the ZIP and extract it.</li>
          <li>Open the Extensions page in Chrome/Edge.</li>
          <li>Enable Developer mode.</li>
          <li>Click "Load unpacked" and select the extracted folder.</li>
          <li>Open Gmail and click the Web-PGP button.</li>
        </ol>
        <p className="hint">
          Browser stores require publishing to the Chrome Web Store or Edge
          Add-ons.
        </p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>How it works</h3>
          <span className="hint">Gmail integration overview.</span>
        </div>
        <ul className="steps">
          <li>The Gmail page gets a Web-PGP button.</li>
          <li>The side panel loads your hosted Web-PGP app.</li>
          <li>Paste encrypted text and insert it into Gmail.</li>
        </ul>
      </div>
    </section>
  );
};
