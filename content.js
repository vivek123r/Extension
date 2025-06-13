// Typing state management
let typingState = {
  isTyping: false,
  isPaused: false,
  currentResponse: '',
  currentPosition: 0,
  targetElement: null,
  originalText: '',
  speed: 60,
  intervalId: null
};

// Click handler for manual insertion (when toggle is off)
document.addEventListener("click", (e) => {
  const target = e.target;
  if ((target.tagName === "TEXTAREA" || target.tagName === "INPUT" || target.contentEditable === "true") && window.__geminiResponse) {
    // Store the data for typing
    window.__geminiTypingData = {
      response: window.__geminiResponse,
      targetElement: target,
      originalText: target.tagName === "TEXTAREA" || target.tagName === "INPUT" ? target.value : target.innerText
    };
    
    // Clear the stored response
    window.__geminiResponse = null;
    
    // Start typing
    startTyping();
  }
});

// Start typing function
window.__startTyping = startTyping;
function startTyping() {
  if (!window.__geminiTypingData) return;
  
  const { response, targetElement, originalText } = window.__geminiTypingData;
  
  typingState = {
    isTyping: true,
    isPaused: false,
    currentResponse: response,
    currentPosition: 0,
    targetElement: targetElement,
    originalText: originalText,
    speed: 60,
    intervalId: null
  };
  
  continueTyping();
}

// Continue typing function
function continueTyping() {
  if (!typingState.isTyping || typingState.isPaused) return;
  
  const { currentResponse, currentPosition, targetElement, speed } = typingState;
  
  if (currentPosition < currentResponse.length) {
    // Get current text in the field (in case user edited it)
    const currentFieldText = targetElement.tagName === "TEXTAREA" || targetElement.tagName === "INPUT" 
      ? targetElement.value 
      : targetElement.innerText;
    
    // Add next character
    const nextChar = currentResponse[currentPosition];
    const newText = currentFieldText + nextChar;
    
    // Update the field
    if (targetElement.tagName === "TEXTAREA" || targetElement.tagName === "INPUT") {
      targetElement.value = newText;
    } else {
      targetElement.innerText = newText;
    }
    
    // Trigger input event
    targetElement.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Move cursor to end
    if (targetElement.setSelectionRange) {
      targetElement.setSelectionRange(newText.length, newText.length);
    }
    
    typingState.currentPosition++;
    
    // Schedule next character
    typingState.intervalId = setTimeout(continueTyping, speed);
    
    // Update progress in popup
    updateProgress();
  } else {
    // Typing completed
    finishTyping();
  }
}

// Pause typing
window.__pauseTyping = function() {
  typingState.isPaused = true;
  if (typingState.intervalId) {
    clearTimeout(typingState.intervalId);
    typingState.intervalId = null;
  }
};

// Resume typing
window.__resumeTyping = function() {
  if (typingState.isTyping && typingState.isPaused) {
    typingState.isPaused = false;
    continueTyping();
  }
};

// Stop typing
window.__stopTyping = function() {
  typingState.isTyping = false;
  typingState.isPaused = false;
  if (typingState.intervalId) {
    clearTimeout(typingState.intervalId);
    typingState.intervalId = null;
  }
  
  // Clear typing data
  window.__geminiTypingData = null;
};

// Update typing speed
window.__updateTypingSpeed = function(newSpeed) {
  typingState.speed = newSpeed;
};

// Update progress
function updateProgress() {
  const progress = (typingState.currentPosition / typingState.currentResponse.length) * 100;
  
  // Send progress to popup
  if (window.parent && window.parent.postMessage) {
    window.parent.postMessage({
      type: 'typingProgress',
      progress: progress,
      position: typingState.currentPosition,
      total: typingState.currentResponse.length
    }, '*');
  }
}

// Finish typing
function finishTyping() {
  typingState.isTyping = false;
  
  // Final input event
  if (typingState.targetElement) {
    typingState.targetElement.dispatchEvent(new Event('input', { bubbles: true }));
  }
  
  // Notify popup that typing is complete
  if (window.parent && window.parent.postMessage) {
    window.parent.postMessage({
      type: 'typingComplete'
    }, '*');
  }
  
  // Clear typing data
  window.__geminiTypingData = null;
}