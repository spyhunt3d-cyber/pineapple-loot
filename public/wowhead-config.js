var whTooltips = { colorLinks: true, iconizeLinks: true, renameLinks: true };

// Reposition Wowhead tooltip near the cursor instead of using its default (often off-screen) position
(function () {
  var mouseX = 0, mouseY = 0;

  document.addEventListener("mousemove", function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  }, true);

  function positionTooltip() {
    var tip = document.getElementById("wowhead-tooltip");
    if (!tip) return;
    var vis = tip.style.visibility;
    var disp = tip.style.display;
    if (vis === "hidden" || disp === "none") return;

    var tipWidth  = tip.offsetWidth  || 320;
    var tipHeight = tip.offsetHeight || 200;
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var offset = 16;

    var x = mouseX + offset;
    var y = mouseY + offset;

    // Flip left if overflowing right edge
    if (x + tipWidth > vw - 8) {
      x = mouseX - tipWidth - offset;
    }
    // Clamp to viewport edges
    if (x < 8) x = 8;
    if (y + tipHeight > vh - 8) {
      y = mouseY - tipHeight - offset;
    }
    if (y < 8) y = 8;

    // Convert to page coords (add scroll)
    tip.style.left = (x + window.scrollX) + "px";
    tip.style.top  = (y + window.scrollY) + "px";
  }

  var observer = new MutationObserver(positionTooltip);

  function attachObserver() {
    var tip = document.getElementById("wowhead-tooltip");
    if (tip) {
      observer.observe(tip, { attributes: true, attributeFilter: ["style"] });
    } else {
      var bodyObserver = new MutationObserver(function (_, obs) {
        var t = document.getElementById("wowhead-tooltip");
        if (t) {
          obs.disconnect();
          observer.observe(t, { attributes: true, attributeFilter: ["style"] });
        }
      });
      bodyObserver.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attachObserver);
  } else {
    attachObserver();
  }
})();
