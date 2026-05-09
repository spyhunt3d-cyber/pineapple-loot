var whTooltips = { colorLinks: true, iconizeLinks: true, renameLinks: true };

// Wowhead positions its tooltip based on the anchor element's bounding rect.
// On flex-1 item links the rect is very wide, pushing the tooltip off-screen right.
// We correct by rescheduling with setTimeout(0) so our handler always runs *after*
// Wowhead's own mousemove handler finishes writing its position.
(function () {
  var mouseX = 0, mouseY = 0;

  document.addEventListener("mousemove", function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    setTimeout(reposition, 0);
  });

  function reposition() {
    var tip = document.getElementById("wowhead-tooltip");
    if (!tip) return;
    if (tip.style.visibility === "hidden" || tip.style.display === "none") return;

    var tipWidth  = tip.offsetWidth  || 320;
    var tipHeight = tip.offsetHeight || 200;
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var offset = 16;

    var x = mouseX + offset;
    var y = mouseY + offset;

    if (x + tipWidth > vw - 8) x = mouseX - tipWidth - offset;
    if (x < 8) x = 8;
    if (y + tipHeight > vh - 8) y = mouseY - tipHeight - offset;
    if (y < 8) y = 8;

    // Tooltip uses position:absolute — convert viewport coords to page coords
    tip.style.left = (x + window.scrollX) + "px";
    tip.style.top  = (y + window.scrollY) + "px";
  }
})();
