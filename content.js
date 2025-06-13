document.addEventListener("click", (e) => {
  const target = e.target;
  if ((target.tagName === "TEXTAREA" || target.tagName === "INPUT" || target.contentEditable === "true") && window.__geminiResponse) {
    if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") {
      target.value = window.__geminiResponse;
    } else {
      target.innerText = window.__geminiResponse;
    }
    window.__geminiResponse = null;
  }
});
