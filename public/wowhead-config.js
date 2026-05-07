// Wowhead tooltip configuration — loaded before the tooltip script
// Enables colored item links, icons, and renamed links in tooltips
var whTooltips = { colorLinks: true, iconizeLinks: true, renameLinks: true };

// Reposition Wowhead tooltip if it overflows the right edge of the viewport
(function () {
  var observer = new MutationObserver(function () {
    var tip = document.getElementById("wowhead-tooltip");
    if (!tip || tip.style.display === "none" || !tip.style.left) return;
    var rect = tip.getBoundingClientRect();
    var vw = window.innerWidth;
    if (rect.right > vw - 10) {
      var overflow = rect.right - vw + 20;
      var currentLeft = parseInt(tip.style.left, 10) || 0;
      tip.style.left = Math.max(0, currentLeft - overflow) + "px";
    }
  });
  document.addEventListener("DOMContentLoaded", function () {
    var tip = document.getElementById("wowhead-tooltip");
    if (tip) observer.observe(tip, { attributes: true, attributeFilter: ["style"] });
    // Also observe body for when tooltip is first injected
    observer.observe(document.body, { childList: true, subtree: false });
  });
})();
