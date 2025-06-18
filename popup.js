window.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get({ chatHistory: [] }, (result) => {
    const history = result.chatHistory;
    let chatContainer = document.getElementById("chatContainer");

    if (!chatContainer) {
      chatContainer = document.createElement("div");
      chatContainer.id = "chatContainer";
      chatContainer.className = "chat-container";
      document.querySelector(".container").appendChild(chatContainer);
    }

    history.forEach((msg) => {
      const messageDiv = document.createElement("div");
      messageDiv.className = `message ${msg.role === "user" ? "user-message" : "ai-message"}`;
      messageDiv.innerHTML = `<div class="message-label">${msg.role === "user" ? "You" : "AI"}:</div><div class="message-content">${escapeHtml(msg.content)}</div>`;
      chatContainer.appendChild(messageDiv);
    });

    chatContainer.scrollTop = chatContainer.scrollHeight;
  });
});

document.getElementById("clearHistoryBtn").addEventListener("click", () => {
  chrome.storage.local.remove("chatHistory", () => {
    document.getElementById("chatContainer").innerHTML = "";
  });
});

document.getElementById("sendBtn").addEventListener("click", async () => {
  const prompt = document.getElementById("prompt").value.trim();
  if (!prompt) return alert("Please enter a prompt.");

  // Show loading state
  const btn = document.getElementById("sendBtn");
  const originalText = btn.textContent;
  btn.textContent = "Loading...";
  btn.disabled = true;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Check if we're on a restricted page
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('moz-extension://')) {
      throw new Error("Cannot run on this page. Please navigate to a regular website first.");
    }

    const apiKey = "AIzaSyBGj_5tBrjR1XQvJQYop3j57xdq9pk_pxE";  // Replace with your real Gemini API key
    
    // Check if API key is still placeholder
    if (apiKey === "YOUR_GEMINI_API_KEY") {
      throw new Error("Please replace YOUR_GEMINI_API_KEY with your actual API key");
    }

    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey;

    console.log("Making API request...");
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    console.log("Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error Response:", errorText);
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("API Response:", data);
    
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "[No response generated]";

    if (!reply || reply === "[No response generated]") {
      console.error("No valid response from API:", data);
      throw new Error("No valid response received from API");
    }

    const insertImmediately = document.getElementById("insertToggle").checked;

    if (insertImmediately) {
      console.log("Inserting immediately into active element");
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (text) => {
          const active = document.activeElement;
          console.log("Active element:", active);
          if (active && (active.tagName === "TEXTAREA" || active.tagName === "INPUT")) {
            active.value = text;
            active.dispatchEvent(new Event('input', { bubbles: true }));
          } else if (active && active.isContentEditable) {
            active.innerText = text;
            active.dispatchEvent(new Event('input', { bubbles: true }));
          } else {
            alert("Please click on a text input field first, then try again.");
          }
        },
        args: [reply]
      });
    } else {
      console.log("Storing response for click insertion and displaying in popup");
      
      // Store for click insertion
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (text) => { 
          window.__geminiResponse = text;
          console.log("Response stored:", text.substring(0, 50) + "...");
        },
        args: [reply]
      });
      
      // Display conversation in popup
      displayConversation(prompt, reply);
    }

    // Clear prompt and show success
    document.getElementById("prompt").value = "";
    btn.textContent = "Success!";
    setTimeout(() => {
      btn.textContent = originalText;
      btn.disabled = false;
    }, 1000);

  } catch (error) {
    console.error("Extension Error:", error);
    alert("Error: " + error.message);
    
    // Reset button
    btn.textContent = originalText;
    btn.disabled = false;
  }
});

// Function to display conversation
function displayConversation(userPrompt, aiResponse) {
  let chatContainer = document.getElementById("chatContainer");
  
  if (!chatContainer) {
    // Create chat container if it doesn't exist
    chatContainer = document.createElement("div");
    chatContainer.id = "chatContainer";
    chatContainer.className = "chat-container";
    document.querySelector(".container").appendChild(chatContainer);
  }
  
  // Add user message
  const userMessage = document.createElement("div");
  userMessage.className = "message user-message";
  userMessage.innerHTML = `<div class="message-label">You:</div><div class="message-content">${escapeHtml(userPrompt)}</div>`;
  chatContainer.appendChild(userMessage);
  
  // Add AI response
  const aiMessage = document.createElement("div");
  aiMessage.className = "message ai-message";
  aiMessage.innerHTML = `<div class="message-label">AI:</div><div class="message-content">${escapeHtml(aiResponse)}</div>`;
  chatContainer.appendChild(aiMessage);
  
  // Scroll to bottom
  chatContainer.scrollTop = chatContainer.scrollHeight;

  chrome.storage.local.get({ chatHistory: [] }, (result) => {
    const history = result.chatHistory;
    history.push({ role: "user", content: userPrompt });
    history.push({ role: "ai", content: aiResponse });
    chrome.storage.local.set({ chatHistory: history });
  });
}

// Helper function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}