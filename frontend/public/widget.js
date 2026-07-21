// frontend/public/widget.js
(function () {
  const script = document.currentScript;
  const org = script.getAttribute("data-org");
  const base = script.getAttribute("data-url") || "http://localhost:3000";
  const fallbackPosition = script.getAttribute("data-position") || "bottom-right";
  const sessionKey = `rag_desk_widget_open_${org}`;

  let dims = { width: 380, height: 600, radius: 16 };
  let keepOpenAcrossPages = false;
  let autoOpenFired = false;

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
      dims = { width: event.data.width, height: event.data.height, radius: event.data.radius };
    }
    keepOpenAcrossPages = !!event.data.keepOpenAcrossPages;
    lastPosition = event.data.position || fallbackPosition;
    lastOpen = !!event.data.open;

    if (keepOpenAcrossPages) {
      try {
        sessionStorage.setItem(sessionKey, lastOpen ? "1" : "0");
      } catch {
        /* storage may be unavailable (privacy mode) — ignore */
      }
    }

    applyState(lastPosition, lastOpen);
  });

  window.addEventListener("resize", () => {
    applyState(lastPosition, lastOpen);
  });

  // Ask the iframe to open itself; it decides pre-chat-form / welcome screen logic.
  function requestOpen() {
    if (autoOpenFired) return;
    autoOpenFired = true;
    iframe.contentWindow?.postMessage({ type: "rag-desk-request-open" }, "*");
  }

  // Restore "kept open across pages" state on load, before config arrives.
  try {
    if (sessionStorage.getItem(sessionKey) === "1") {
      requestOpen();
    }
  } catch {
    /* ignore */
  }

  // Auto-open after N seconds — the value itself lives in org settings, which only
  // the iframe knows. Simplest robust approach: let the iframe tell the parent
  // once it has loaded its config, then the parent arms the corresponding triggers.
  window.addEventListener("message", (event) => {
    if (event.source !== iframe.contentWindow) return;
    if (!event.data || event.data.type !== "rag-desk-widget-triggers") return;

    const { autoOpenSeconds, autoOpenOnScroll, autoOpenOnExitIntent } = event.data;

    if (autoOpenSeconds) {
      setTimeout(requestOpen, autoOpenSeconds * 1000);
    }

    if (autoOpenOnScroll) {
      const onScroll = () => {
        const scrolled =
          window.scrollY / (document.body.scrollHeight - window.innerHeight || 1);
        if (scrolled > 0.4) {
          requestOpen();
          window.removeEventListener("scroll", onScroll);
        }
      };
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    if (autoOpenOnExitIntent) {
      const onMouseOut = (e) => {
        if (e.clientY <= 0) {
          requestOpen();
          document.removeEventListener("mouseout", onMouseOut);
        }
      };
      document.addEventListener("mouseout", onMouseOut);
    }
  });
})();