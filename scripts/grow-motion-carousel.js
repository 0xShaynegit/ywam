/* ============================================================
   Grow Motion Carousel (test variant, standalone)
   Same 5-slot system, same sizes (featured 1.8x, second-tier 1.0x,
   outer-tier 0.6x) as Card Carousel, but every tier crossing runs
   over the FULL autoplay interval, using one plain continuous
   formula throughout — no frozen outer slots. Completely separate
   from scripts/main.js's Card Carousel: own class names
   (.grow-carousel / .grow-slide), own init function, own file, so
   it can be tuned during testing with zero risk to the carousel
   already live on project-video.html.
   ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var GROW_DIRECTIONS = {
    up:    { axis: "y", flip: 1 },
    down:  { axis: "y", flip: -1 },
    left:  { axis: "x", flip: 1 },
    right: { axis: "x", flip: -1 }
  };

  var initGrowMotionCarousel = function (carousel) {
    var dir = GROW_DIRECTIONS[carousel.dataset.direction] || GROW_DIRECTIONS.up;
    var slides = Array.prototype.slice.call(carousel.querySelectorAll(".grow-slide"));
    if (!slides.length) return;
    var STEP = 360 / slides.length;
    var rotation = 0;
    var TICK_MS = 3500;
    // Every value change animates over the full gap until the next
    // autoplay move (minus a small buffer), so cards 1/2/4/5 are all
    // still resizing/fading right up until the next tick lands, never
    // finishing early and sitting still.
    var LONG = "transform " + (TICK_MS / 1000 - 0.3).toFixed(2) + "s var(--ease-out), opacity " +
      (TICK_MS / 1000 - 0.3).toFixed(2) + "s linear";

    var renderWheel = function () {
      var baseSize = (dir.axis === "y" ? slides[0].offsetHeight : slides[0].offsetWidth) || 1;
      slides.forEach(function (slide, i) {
        // Signed slot distance from the centre: 0 = featured card
        // (size 3, scale 1.8), -1/+1 = second cards (size 2/4, scale
        // 1.0), -2/+2 = outer cards (size 1/5, scale 0.6).
        var t = ((((i * STEP - rotation) % 360) + 540) % 360 - 180) / STEP;
        var dt = dir.flip * t;
        var at = Math.abs(t);
        var grow = Math.max(0, 1 - at);
        var floatPct = grow * 6;
        var scale = at <= 1
          ? 1 + 0.8 * grow
          : Math.max(0.6, 1 - 0.4 * (at - 1));
        var offset = Math.sign(dt) * baseSize * (0.6 * Math.min(at, 1) + Math.max(0, at - 1) * 0.3);
        var opacity = Math.max(0, 1 - Math.max(0, at - 2) / 0.8);

        var centering = "translate(-50%, -50%)";
        var cross = dir.axis === "y"
          ? "translateX(" + floatPct.toFixed(2) + "%)"
          : "translateY(" + floatPct.toFixed(2) + "%)";
        var primary = dir.axis === "y"
          ? "translateY(" + offset.toFixed(1) + "px)"
          : "translateX(" + offset.toFixed(1) + "px)";
        slide.style.transition = LONG;
        slide.style.transform = centering + " " + cross + " " + primary + " scale(" + scale.toFixed(3) + ")";
        slide.style.opacity = opacity.toFixed(3);
        slide.style.pointerEvents = at < 0.5 ? "auto" : "none";
        slide.style.zIndex = String(100 - Math.round(at * 10));
      });
    };
    renderWheel();
    window.addEventListener("resize", renderWheel);

    if (reduceMotion) return;

    var paused = false;
    var resumeTimer = 0;

    setInterval(function () {
      if (paused) return;
      rotation += STEP;
      renderWheel();
    }, TICK_MS);

    var pause = function () {
      paused = true;
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(function () {
        rotation = Math.round(rotation / STEP) * STEP;
        renderWheel();
        paused = false;
      }, 4000);
    };

    carousel.addEventListener("wheel", function (e) {
      e.preventDefault();
      pause();
      var delta = dir.axis === "x" ? (e.deltaX || e.deltaY) : e.deltaY;
      rotation += delta * 0.15;
      renderWheel();
    }, { passive: false });

    var dragPos = null;
    var pointerCoord = function (e) { return dir.axis === "y" ? e.clientY : e.clientX; };
    carousel.addEventListener("pointerdown", function (e) {
      dragPos = pointerCoord(e);
      carousel.classList.add("dragging");
      pause();
    });
    window.addEventListener("pointermove", function (e) {
      if (dragPos === null) return;
      var pos = pointerCoord(e);
      rotation += (dragPos - pos) * 0.4;
      dragPos = pos;
      renderWheel();
    });
    window.addEventListener("pointerup", function () {
      if (dragPos === null) return;
      dragPos = null;
      carousel.classList.remove("dragging");
      rotation = Math.round(rotation / STEP) * STEP;
      renderWheel();
    });
    carousel.addEventListener("mouseenter", pause);
  };

  Array.prototype.forEach.call(document.querySelectorAll(".grow-carousel"), initGrowMotionCarousel);
})();
