/// <reference types="chrome"/>
console.log("Strot Extension Content Script Loaded");

function extractLeadData() {
  const url = window.location.href;
  let source = "website";
  let name = document.title;
  let domain = window.location.hostname.replace(/^www\./, "");
  let description = document.querySelector('meta[name="description"]')?.getAttribute("content") || "";

  if (url.includes("linkedin.com/company")) {
    source = "linkedin";
    const h1 = document.querySelector("h1");
    if (h1) name = h1.innerText.trim();
    const websiteLink = document.querySelector('a[href^="http"] .link-without-visited-state');
    if (websiteLink && websiteLink.textContent) {
      domain = websiteLink.textContent.trim().replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
    }
  } else if (url.includes("instagram.com")) {
    source = "instagram";
    const handle = window.location.pathname.replace(/\//g, "");
    name = handle;
    domain = `${handle.replace(/[^a-zA-Z0-9]/g, "")}.com`;
  } else if (url.includes("google.com/maps")) {
    source = "google_maps";
    const h1 = document.querySelector("h1");
    if (h1) name = h1.innerText.trim();
  }

  return {
    id: `${source}-${domain.replace(/\./g, "-")}-${Date.now()}`,
    name,
    domain,
    description,
    sources: [source],
    opportunitySignals: [],
  };
}

function injectButton() {
  if (document.getElementById("strot-extension-btn")) return;

  const btn = document.createElement("button");
  btn.id = "strot-extension-btn";
  btn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"></path></svg>
    Add to Strot
  `;

  btn.addEventListener("click", async () => {
    btn.classList.add("strot-loading");
    btn.innerText = "Adding...";
    
    const leadData = extractLeadData();
    
    chrome.runtime.sendMessage({ type: "ADD_LEAD", payload: leadData }, (response: any) => {
      btn.classList.remove("strot-loading");
      if (response && response.success) {
        btn.classList.add("strot-success");
        btn.innerText = "Added!";
        setTimeout(() => {
          btn.classList.remove("strot-success");
          btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"></path></svg> Add to Strot`;
        }, 3000);
      } else {
        btn.innerText = "Error!";
        console.error("Strot Extension Error:", response?.error);
      }
    });
  });

  document.body.appendChild(btn);
}

// Observe DOM for SPA navigations
const observer = new MutationObserver(() => {
  injectButton();
});
observer.observe(document.body, { childList: true, subtree: true });

injectButton();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GET_PAGE_DATA") {
    sendResponse(extractLeadData());
  }
  return true;
});
