// frontend/public/widget.js
(function () {
  const script = document.currentScript;
  const org = script.getAttribute("data-org");
  const base = script.getAttribute("data-url") || "http://localhost:3000";
  const fallbackPosition = script.getAttribute("data-position") || "bottom-right";

  const CHAT_WIDTH = 380;
  const CHAT_HEIGHT = 600;
  const MARGIN_DESKTOP = 20;
  const MARGIN_MOBILE = 12;

  const iframe = document.createElement("iframe");
  iframe.src = `${base}/widget/${org}`;
  iframe.title = "Support chat";
  iframe.style.cssText =
    "position:fixed;border:none;z-index:99999;background:transparent;" +
    "transition:width .2s ease, height .2s ease, border-radius .2s ease, " +
    "top .2s ease, bottom .2s ease, left .2s ease, right .2s ease;";
  document.body.appendChild(iframe);

  function isMobile() {
    return window.innerWidth < 480;
  }

  function bubbleSize() {
    return isMobile() ? 52 : 64;
  }

  function applyState(position, open) {
    const [vSide, hSide] = position.split("-");
    iframe.style.top = "";
    iframe.style.bottom = "";
    iframe.style.left = "";
    iframe.style.right = "";

    if (open && isMobile()) {
      // full-screen chat on small viewports
      iframe.style.top = "0";
      iframe.style.left = "0";
      iframe.style.width = "100vw";
      iframe.style.height = "100dvh"; // avoids mobile browser toolbar jump issues
      iframe.style.borderRadius = "0";
      return;
    }

    const margin = isMobile() ? MARGIN_MOBILE : MARGIN_DESKTOP;
    iframe.style[vSide] = margin + "px";
    iframe.style[hSide] = margin + "px";

    if (open) {
      iframe.style.width = CHAT_WIDTH + "px";
      iframe.style.height = CHAT_HEIGHT + "px";
      iframe.style.borderRadius = "16px";
    } else {
      const size = bubbleSize();
      iframe.style.width = size + "px";
      iframe.style.height = size + "px";
      iframe.style.borderRadius = "50%";
    }
  }

  applyState(fallbackPosition, false);

  window.addEventListener("message", (event) => {
    if (event.source !== iframe.contentWindow) return;
    if (!event.data || event.data.type !== "rag-desk-widget-state") return;
    applyState(event.data.position || fallbackPosition, !!event.data.open);
  });

  // Re-apply sizing if viewport crosses the mobile breakpoint while mounted
  // (e.g. device rotation, resizing a browser window).
  let lastOpen = false;
  window.addEventListener("message", (event) => {
    if (event.source !== iframe.contentWindow) return;
    if (event.data?.type === "rag-desk-widget-state") lastOpen = !!event.data.open;
  });
  window.addEventListener("resize", () => {
    applyState(fallbackPosition, lastOpen);
  });
})();