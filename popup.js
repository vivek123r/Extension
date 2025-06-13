document.getElementById("sendBtn").addEventListener("click", async () => {
  const prompt = document.getElementById("prompt").value.trim();
  if (!prompt) return alert("Please enter a prompt.");

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const apiKey = "YOUR_GEMINI_API_KEY";  // Replace with your real Gemini API key
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + apiKey;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  const data = await response.json();
  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "[No response]";

  const insertImmediately = document.getElementById("insertToggle").checked;

  if (insertImmediately) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (text) => {
        const active = document.activeElement;
        if (active && (active.tagName === "TEXTAREA" || active.tagName === "INPUT")) {
          active.value = text;
        } else if (active && active.isContentEditable) {
          active.innerText = text;
        }
      },
      args: [reply]
    });
  } else {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (text) => { window.__geminiResponse = text; },
      args: [reply]
    });
  }
});
