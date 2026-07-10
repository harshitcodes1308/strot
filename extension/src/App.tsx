import { useState, useEffect } from 'react'

function App() {
  const [data, setData] = useState<{name?: string, url?: string, description?: string} | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Request content script to get page data
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab.id) {
        chrome.tabs.sendMessage(activeTab.id, {action: "GET_PAGE_DATA"}, (response) => {
          if (response) {
            setData(response);
          }
          setLoading(false);
        });
      }
    });
  }, []);

  const saveToStrot = () => {
    if (!data) return;
    chrome.runtime.sendMessage({ type: "ADD_LEAD", payload: data }, (response) => {
      if (response && response.success) {
        alert("Saved to Strot!");
      } else {
        alert("Failed to save: " + (response?.error || "Unknown error"));
      }
    });
  };

  return (
    <div style={{ width: 300, padding: 16, fontFamily: "sans-serif" }}>
      <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>Strot Extension</h2>
      {loading ? (
        <p>Analyzing page...</p>
      ) : data ? (
        <div>
          <p style={{ margin: "4px 0", fontSize: 14 }}><strong>Name:</strong> {data.name || "Unknown"}</p>
          <p style={{ margin: "4px 0", fontSize: 12, color: "#555" }}>{data.url}</p>
          <button 
            onClick={saveToStrot}
            style={{ marginTop: 12, padding: "8px 12px", background: "#000", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", width: "100%" }}
          >
            Save Lead
          </button>
        </div>
      ) : (
        <p>No compatible data found on this page.</p>
      )}
    </div>
  )
}

export default App
