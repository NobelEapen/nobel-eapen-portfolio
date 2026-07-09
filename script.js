/* ================================================================
   NOBEL PORTFOLIO — INTERACTIONS
   Vanilla JS, no build step. Organized by feature; each block is
   independent, so you can delete a section without breaking others.
================================================================= */
(function () {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;

  /* ------------------------------------------------------------
     1. LOADING SCREEN
     Shows for a minimum visible duration so the draw-in animation
     is never skipped on a fast connection, then fades out.
  ------------------------------------------------------------ */
  (function loader() {
    const el = document.getElementById("loader");
    const fill = document.getElementById("loaderFill");
    if (!el) return;

    const MIN_VISIBLE_MS = prefersReducedMotion ? 0 : 1100;
    const start = Date.now();

    requestAnimationFrame(() => { if (fill) fill.style.width = "100%"; });

    function hide() {
      const elapsed = Date.now() - start;
      const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
      setTimeout(() => {
        el.classList.add("is-hidden");
        document.body.style.overflow = "";
      }, wait);
    }

    document.body.style.overflow = "hidden";
    if (document.readyState === "complete") {
      hide();
    } else {
      window.addEventListener("load", hide);
      // Safety net: never block the site if the load event is delayed
      setTimeout(hide, 3500);
    }
  })();

  /* ------------------------------------------------------------
     2. CUSTOM CURSOR (fine pointers only)
  ------------------------------------------------------------ */
  (function cursor() {
    if (isCoarsePointer || prefersReducedMotion) return;
    const dot = document.getElementById("cursorDot");
    const ring = document.getElementById("cursorRing");
    if (!dot || !ring) return;

    let mouseX = 0, mouseY = 0;
    let ringX = 0, ringY = 0;

    window.addEventListener("mousemove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
    });

    function tick() {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
      requestAnimationFrame(tick);
    }
    tick();

    const hoverTargets = document.querySelectorAll("a, button, .case-study__summary, input, textarea");
    hoverTargets.forEach((target) => {
      target.addEventListener("mouseenter", () => ring.classList.add("is-active"));
      target.addEventListener("mouseleave", () => ring.classList.remove("is-active"));
    });
  })();

  /* ------------------------------------------------------------
     3. STICKY HEADER STATE
  ------------------------------------------------------------ */
  (function header() {
    const header = document.getElementById("siteHeader");
    if (!header) return;
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  })();

  /* ------------------------------------------------------------
     4. MOBILE NAV TOGGLE
  ------------------------------------------------------------ */
  (function mobileNav() {
    const toggle = document.getElementById("navToggle");
    const nav = document.getElementById("nav");
    if (!toggle || !nav) return;

    function setOpen(open) {
      nav.classList.toggle("is-open", open);
      toggle.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    }

    toggle.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
    nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setOpen(false)));
  })();

  /* ------------------------------------------------------------
     5. SCROLL-TRIGGERED REVEALS (fade-in / slide-up / stagger)
  ------------------------------------------------------------ */
  (function reveals() {
    const items = Array.from(document.querySelectorAll(".reveal"));
    if (!items.length) return;

    if (prefersReducedMotion) {
      items.forEach((el) => el.classList.add("in-view"));
      return;
    }

    // Stagger siblings that reveal together (e.g. hero title lines, project cards)
    const groups = new Map();
    items.forEach((el) => {
      const parent = el.parentElement;
      const index = groups.has(parent) ? groups.get(parent) + 1 : 0;
      groups.set(parent, index);
      el.style.transitionDelay = `${Math.min(index, 6) * 90}ms`;
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );

    items.forEach((el) => observer.observe(el));
  })();

  /* ------------------------------------------------------------
     6. HERO PARALLAX
  ------------------------------------------------------------ */
  (function parallax() {
    if (prefersReducedMotion) return;
    const bg = document.getElementById("heroBg");
    const hero = document.getElementById("home");
    if (!bg || !hero) return;

    let ticking = false;
    function update() {
      const rect = hero.getBoundingClientRect();
      const progress = 1 - Math.max(0, Math.min(1, (rect.bottom) / (rect.height + window.innerHeight)));
      bg.style.transform = `translateY(${progress * 60}px)`;
      ticking = false;
    }
    window.addEventListener("scroll", () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  })();

  /* ------------------------------------------------------------
     7. GLOBAL EXPERIENCE TICKER — duplicate content for seamless loop
  ------------------------------------------------------------ */
  (function ticker() {
    const track = document.getElementById("tickerTrack");
    if (!track) return;
    const base = track.innerHTML;
    // Duplicate an EVEN number of times so the -50% keyframe always lands on a
    // whole multiple of the base set (seamless loop), and keep going until the
    // track is comfortably wider than its container (matters for short lists).
    let copies = 2;
    track.innerHTML = base.repeat(copies);
    const container = track.parentElement;
    while (track.scrollWidth < container.clientWidth * 2.5 && copies < 12) {
      copies += 2;
      track.innerHTML = base.repeat(copies);
    }
    if (prefersReducedMotion) track.style.animation = "none";
  })();

  /* ------------------------------------------------------------
     8. CASE STUDIES — expand/collapse + telemetry count-up
     Each row toggles open independently. The first time a row opens,
     its "Velocity" numbers animate from 0 up to their target value —
     like a telemetry read-out — then stay put on later opens.
  ------------------------------------------------------------ */
  (function caseStudies() {
    const studies = document.querySelectorAll(".case-study");
    if (!studies.length) return;

    function animateMetric(el) {
      const target = parseFloat(el.dataset.target);
      const decimals = parseInt(el.dataset.decimals || "0", 10);
      const useComma = el.dataset.format === "comma";
      if (Number.isNaN(target)) return;

      if (prefersReducedMotion) {
        el.textContent = formatNumber(target, decimals, useComma);
        return;
      }

      const duration = 1000;
      const start = performance.now();
      function tick(now) {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
        const value = target * eased;
        el.textContent = formatNumber(value, decimals, useComma);
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = formatNumber(target, decimals, useComma);
      }
      requestAnimationFrame(tick);
    }

    function formatNumber(value, decimals, useComma) {
      const fixed = value.toFixed(decimals);
      if (!useComma) return fixed;
      const [intPart, decPart] = fixed.split(".");
      const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      return decPart ? `${withCommas}.${decPart}` : withCommas;
    }

    studies.forEach((study) => {
      const btn = study.querySelector(".case-study__summary");
      if (!btn) return;
      btn.addEventListener("click", () => {
        const opening = !study.classList.contains("is-open");
        study.classList.toggle("is-open", opening);
        btn.setAttribute("aria-expanded", String(opening));

        if (opening && !study.dataset.animated) {
          study.dataset.animated = "true";
          study.querySelectorAll(".metric__num[data-target]").forEach(animateMetric);
        }
      });
    });
  })();

  /* ------------------------------------------------------------
     9. SCROLL CUE BUTTON
  ------------------------------------------------------------ */
  (function scrollCue() {
    const btn = document.getElementById("scrollCue");
    const about = document.getElementById("about");
    if (!btn || !about) return;
    btn.addEventListener("click", () => about.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" }));
  })();

  /* ------------------------------------------------------------
     10. CONTACT FORM
     No backend is wired up yet. Point the form at your own endpoint
     (Formspree, Netlify Forms, a serverless function, etc.) and
     replace the fake "success" branch below with a real fetch() call.
  ------------------------------------------------------------ */
  (function contactForm() {
    const form = document.getElementById("contactForm");
    const status = document.getElementById("formStatus");
    if (!form || !status) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        status.textContent = "Please fill in every field before sending.";
        return;
      }

      fetch("https://formspree.io/f/xvzjjnoq", {
  method: "POST",
  body: new FormData(form),
  headers: { Accept: "application/json" }
})
  .then((response) => {
    if (response.ok) {
      status.textContent = "Message received — I'll be in touch shortly.";
      form.reset();
    } else {
      status.textContent = "Something went wrong — please email me directly instead.";
    }
  })
  .catch(() => {
    status.textContent = "Something went wrong — please email me directly instead.";
  });
    });
  })();

  /* ------------------------------------------------------------
     11. FOOTER YEAR
  ------------------------------------------------------------ */
  (function footerYear() {
    const el = document.getElementById("year");
    if (el) el.textContent = new Date().getFullYear();
  })();

})();
