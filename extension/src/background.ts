/// <reference types="chrome"/>
chrome.runtime.onMessage.addListener((message: any, _sender: any, sendResponse: any) => {
  if (message.type === "ADD_LEAD") {
    fetch("http://localhost:3000/api/extension/leads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message.payload)
    })
    .then(res => res.json())
    .then(data => {
      console.log("Success:", data);
      sendResponse({ success: true, data });
    })
    .catch(err => {
      console.error("Error:", err);
      sendResponse({ success: false, error: err.message });
    });

    return true; // Keep message channel open for async response
  }
});
