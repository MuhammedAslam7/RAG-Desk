// frontend/public/widget.js
(function () {
  const script = document.currentScript;
  const org = script.getAttribute("data-org");
  const base = script.getAttribute("data-url") || "http://localhost:3000";
  const fallbackPosition = script.getAttribute("data-position") || "bottom-right";

  // sensible defaults until the iframe reports real config
  let dims = { width: 380, height: 600, radius: 16 };

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
      iframe.style.top = "0";
      iframe.style.left = "0";
      iframe.style.width = "100vw";
      iframe.style.height = "100dvh";
      iframe.style.borderRadius = "0";
      return;
    }

    const margin = isMobile() ? MARGIN_MOBILE : MARGIN_DESKTOP;
    iframe.style[vSide] = margin + "px";
    iframe.style[hSide] = margin + "px";

    if (open) {
      iframe.style.width = dims.width + "px";
      iframe.style.height = dims.height + "px";
      iframe.style.borderRadius = dims.radius + "px";
    } else {
      const size = bubbleSize();
      iframe.style.width = size + "px";
      iframe.style.height = size + "px";
      iframe.style.borderRadius = "50%";
    }
  }

  applyState(fallbackPosition, false);

  let lastPosition = fallbackPosition;
  let lastOpen = false;

  window.addEventListener("message", (event) => {
    if (event.source !== iframe.contentWindow) return;
    if (!event.data || event.data.type !== "rag-desk-widget-state") return;

    if (typeof event.data.width === "number") {
      dims = {
        width: event.data.width,
        height: event.data.height,
        radius: event.data.radius,
      };
    }
    lastPosition = event.data.position || fallbackPosition;
    lastOpen = !!event.data.open;
    applyState(lastPosition, lastOpen);
  });

  window.addEventListener("resize", () => {
    applyState(lastPosition, lastOpen);
  });
})();