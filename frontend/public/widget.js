// frontend/public/widget.js
(function () {
  const script = document.currentScript;
  const org = script.getAttribute("data-org");
  const base = script.getAttribute("data-url") || "http://localhost:3000";

  const iframe = document.createElement("iframe");
  iframe.src = `${base}/widget/${org}`;
  iframe.title = "Support chat";
  iframe.style.cssText =
    "position:fixed;bottom:20px;right:20px;width:380px;height:560px;" +
    "border:none;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.2);z-index:99999;" +
    "background:transparent;";
  document.body.appendChild(iframe);
})();