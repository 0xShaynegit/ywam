/* ============================================================
   YWAM Chiang Mai. Night into Day.
   Vanilla JS. No libraries.
   1. Lantern canvas hero (Canvas 2D, sprite-cached glows)
   2. Phase engine: flips body[data-phase] per section
   3. Scroll reveals + horizon line draw
   4. Nav state + mobile menu
   ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. Lantern canvas ---------- */
  var hero = document.querySelector(".hero");
  var canvas = document.getElementById("lanterns");

  if (canvas && hero && !reduceMotion && canvas.getContext) {
    initLanterns(canvas, hero);
  } else if (hero) {
    hero.classList.add("static-sky");
  }

  function initLanterns(canvas, hero) {
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0;
    var COUNT = 80;
    var lanterns = [];
    var mouseX = 0.5, mouseY = 0.5;
    var running = true;
    var rafId = 0;

    // Pre-render one soft glow sprite. Drawing gradients per particle
    // per frame is the classic perf killer; drawImage of a cached
    // sprite keeps this cheap on mid-range phones.
    var sprite = document.createElement("canvas");
    var SPRITE = 64;
    sprite.width = SPRITE;
    sprite.height = SPRITE;
    var sctx = sprite.getContext("2d");
    var g = sctx.createRadialGradient(SPRITE / 2, SPRITE / 2, 0, SPRITE / 2, SPRITE / 2, SPRITE / 2);
    g.addColorStop(0, "rgba(255, 214, 140, 1)");
    g.addColorStop(0.25, "rgba(240, 170, 70, 0.85)");
    g.addColorStop(0.6, "rgba(220, 130, 40, 0.25)");
    g.addColorStop(1, "rgba(220, 130, 40, 0)");
    sctx.fillStyle = g;
    sctx.fillRect(0, 0, SPRITE, SPRITE);

    function resize() {
      W = hero.clientWidth;
      H = hero.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawn(anywhere) {
      // depth 0..1: far lanterns are small, slow, dim
      var depth = Math.random();
      return {
        x: Math.random() * W,
        y: anywhere ? Math.random() * H : H + 30,
        depth: depth,
        size: 5 + depth * 22,
        speed: 0.14 + depth * 0.5,
        swayAmp: 8 + depth * 22,
        swayFreq: 0.0004 + Math.random() * 0.0006,
        swayPhase: Math.random() * Math.PI * 2,
        flickerPhase: Math.random() * Math.PI * 2,
        alpha: 0.25 + depth * 0.6
      };
    }

    function frame(t) {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);

      var px = (mouseX - 0.5) * 2; // -1..1
      var py = (mouseY - 0.5) * 2;

      for (var i = 0; i < lanterns.length; i++) {
        var l = lanterns[i];
        l.y -= l.speed;
        if (l.y < -40) lanterns[i] = l = spawn(false);

        var sway = Math.sin(t * l.swayFreq + l.swayPhase) * l.swayAmp;
        var flicker = 0.82 + 0.18 * Math.sin(t * 0.003 + l.flickerPhase);
        var parX = px * l.depth * 26;
        var parY = py * l.depth * 14;

        ctx.globalAlpha = l.alpha * flicker;
        ctx.drawImage(
          sprite,
          l.x + sway + parX - l.size,
          l.y + parY - l.size,
          l.size * 2,
          l.size * 2
        );
      }
      ctx.globalAlpha = 1;
      rafId = requestAnimationFrame(frame);
    }

    function start() {
      if (!running) {
        running = true;
        rafId = requestAnimationFrame(frame);
      }
    }
    function stop() {
      running = false;
      cancelAnimationFrame(rafId);
    }

    resize();
    for (var i = 0; i < COUNT; i++) lanterns.push(spawn(true));
    rafId = requestAnimationFrame(frame);

    window.addEventListener("resize", resize);

    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      mouseX = (e.clientX - r.left) / r.width;
      mouseY = (e.clientY - r.top) / r.height;
    });

    // Pause when the hero scrolls away or the tab hides
    new IntersectionObserver(function (entries) {
      entries[0].isIntersecting ? start() : stop();
    }, { threshold: 0 }).observe(hero);

    document.addEventListener("visibilitychange", function () {
      document.hidden ? stop() : start();
    });
  }

  /* ---------- 2. Phase engine ---------- */
  // Each section declares data-phase. Whichever section straddles the
  // viewport midline sets the body phase. Sections stay reorderable
  // with zero JS edits.
  var phased = document.querySelectorAll("[data-phase]");
  if ("IntersectionObserver" in window) {
    var phaseIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          document.body.dataset.phase = entry.target.dataset.phase;
        }
      });
    }, { rootMargin: "-50% 0% -50% 0%", threshold: 0 });
    phased.forEach(function (el) { phaseIO.observe(el); });
  }

  /* ---------- 3. Reveals + horizon ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          revealIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { revealIO.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  var horizon = document.querySelector(".horizon");
  if (horizon && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries, io) {
      if (entries[0].isIntersecting) {
        horizon.classList.add("drawn");
        io.disconnect();
      }
    }, { threshold: 0.4 }).observe(horizon);
  }

  /* ---------- 4. Nav ---------- */
  var nav = document.getElementById("nav");
  var onScroll = function () {
    nav.classList.toggle("scrolled", window.scrollY > 40);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var burger = document.getElementById("navBurger");
  var menu = document.getElementById("mobileMenu");
  if (burger && menu) {
    burger.addEventListener("click", function () {
      var open = burger.getAttribute("aria-expanded") === "true";
      burger.setAttribute("aria-expanded", String(!open));
      burger.setAttribute("aria-label", open ? "Open menu" : "Close menu");
      menu.hidden = open;
    });
    // Close the menu after any in-page navigation
    menu.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        burger.setAttribute("aria-expanded", "false");
        burger.setAttribute("aria-label", "Open menu");
        menu.hidden = true;
      }
    });
  }

  /* ---------- 5. Film still subtitle cycle (Project Video subpage signature) ---------- */
  var filmCaption = document.getElementById("filmCaption");
  if (filmCaption && !reduceMotion) {
    var languages = ["ภาษาไทย", "ພາສາລາວ", "ភាសាខ្មែរ", "Tiếng Việt", "မြန်မာဘာသာ"];
    var langIndex = 0;
    setInterval(function () {
      filmCaption.classList.add("fading");
      setTimeout(function () {
        langIndex = (langIndex + 1) % languages.length;
        filmCaption.textContent = languages[langIndex];
        filmCaption.classList.remove("fading");
      }, 600);
    }, 2600);
  }

  /* ---------- 6. Card Carousel (reusable): growing-featured-card flywheel ----------
     Slides sit on a cylinder rotating around an axis, like a waterwheel
     seen side-on. The centered card faces the viewer flat and doubles
     toward full size; neighbours tilt away and shrink, and the two
     outer slots freeze in place and fade rather than keep travelling.
     Rotation is continuous, so looping is inherent. Direction (up/down/
     left/right, from data-direction, default "up") only changes which
     screen axis and sign the same math is applied to. Every
     .card-carousel on the page is initialised independently. ---------- */
  var CAROUSEL_DIRECTIONS = {
    up:    { axis: "y", flip: 1 },
    down:  { axis: "y", flip: -1 },
    left:  { axis: "x", flip: 1 },
    right: { axis: "x", flip: -1 }
  };

  var initCardCarousel = function (carousel) {
    var dir = CAROUSEL_DIRECTIONS[carousel.dataset.direction] || CAROUSEL_DIRECTIONS.up;
    var slides = Array.prototype.slice.call(carousel.querySelectorAll(".carousel-slide"));
    if (!slides.length) return;
    var STEP = 360 / slides.length;
    var rotation = 0;
    var TICK_MS = 3500;

    var renderWheel = function () {
      var baseSize = (dir.axis === "y" ? slides[0].offsetHeight : slides[0].offsetWidth) || 1;
      slides.forEach(function (slide, i) {
        // Signed slot distance from the centre: 0 = featured card,
        // -1 = one before, +1 = one after, fractional mid-turn.
        var t = ((((i * STEP - rotation) % 360) + 540) % 360 - 180) / STEP;
        var dt = dir.flip * t;
        var at = Math.abs(t);
        // Featured card is 80% bigger than the second cards and floats
        // slightly toward the cross axis; growth eases in over the last
        // slot of travel.
        var grow = Math.max(0, 1 - at);
        var floatPct = grow * 6;
        // Size tiers: featured 1.8, second cards 1.0, third cards 0.6
        // (60% of the second cards), interpolated between slots.
        var scale = at <= 1
          ? 1 + 0.8 * grow
          : Math.max(0.6, 1 - 0.4 * (at - 1));
        // Second cards tuck 80% behind the featured card and move
        // continuously, unchanged. The two outer cards are frozen at
        // their own slot and never travel further — each just fades
        // there for its whole time on screen. At each tick "at" is
        // always a whole number, so the ACTUAL opacity change only
        // happens on one specific tick per side: the exiting card's
        // fade-out lands while at is still >1 (its target drops to 0
        // there); the entering card's fade-in only completes once at
        // drops to 2 (its target rises to 1 there — the tick before,
        // at=1, is the untouched second card and must stay untouched).
        // Each gets a long, full-duration transition on the tick where
        // its change happens, short/no transition otherwise since
        // nothing is animating then.
        var LONG = "opacity " + (TICK_MS / 1000 - 0.3).toFixed(2) + "s linear, transform 1.1s var(--ease-out)";
        var offset, opacity, transition;
        if (dt < 0 && at > 1) {
          offset = -baseSize * 0.9;
          opacity = Math.max(0, 1 - (at - 1) / 0.8);
          transition = LONG;
        } else if (dt > 0 && Math.round(at) >= 3) {
          offset = baseSize * 0.9;
          opacity = 0;
          transition = "";
        } else if (dt > 0 && Math.round(at) === 2) {
          offset = baseSize * 0.9;
          opacity = 1;
          transition = LONG;
        } else {
          offset = Math.sign(dt) * baseSize * (0.6 * Math.min(at, 1) + Math.max(0, at - 1) * 0.3);
          opacity = 1;
          transition = "";
        }
        var centering = "translate(-50%, -50%)";
        var cross = dir.axis === "y"
          ? "translateX(" + floatPct.toFixed(2) + "%)"
          : "translateY(" + floatPct.toFixed(2) + "%)";
        var primary = dir.axis === "y"
          ? "translateY(" + offset.toFixed(1) + "px)"
          : "translateX(" + offset.toFixed(1) + "px)";
        slide.style.transition = transition;
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
        // Settle on the nearest card before autoplay resumes.
        rotation = Math.round(rotation / STEP) * STEP;
        renderWheel();
        paused = false;
      }, 4000);
    };

    // Mouse wheel spins the wheel directly, along whichever delta
    // matches this carousel's axis (falling back to deltaY for
    // horizontal carousels, since plain mice rarely report deltaX).
    carousel.addEventListener("wheel", function (e) {
      e.preventDefault();
      pause();
      var delta = dir.axis === "x" ? (e.deltaX || e.deltaY) : e.deltaY;
      rotation += delta * 0.15;
      renderWheel();
    }, { passive: false });

    // Drag (touch or mouse), along the carousel's own axis, spins it
    // too. While dragging, the .dragging class kills the transition so
    // the wheel tracks the pointer 1:1 instead of lagging behind it.
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

  Array.prototype.forEach.call(document.querySelectorAll(".card-carousel"), initCardCarousel);

  /* ---------- 7. Email obfuscation ---------- */
  // Addresses are split into data-user/data-domain so they never sit as
  // plain text or a plain mailto href in the page source for scrapers,
  // and the href is only built on click, not on load, so no mailto:
  // address shows in the browser's hover status bar preview either.
  var emailLinks = document.querySelectorAll("[data-user][data-domain]");
  emailLinks.forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      window.location.href = "mailto:" + el.dataset.user + "@" + el.dataset.domain;
    });
  });
})();
