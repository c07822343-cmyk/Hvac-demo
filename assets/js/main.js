/* ============================================================
   Page controller — boot, navigation, reveals, form, and the
   progressive-enhancement handshake with the WebGL engine.
   The page is complete without JS-driven 3D; WebGL only adds
   the environmental layer on top.
   ============================================================ */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const state = {
  engine: null,
  rig: null,
  webgl: false,
  chapter: -1,
};

/* ---------- environment fallback ---------- */

function useImageFallback(reason) {
  document.body.classList.remove("is-booting", "webgl-on");
  document.body.classList.add("webgl-off");
  // make sure every chapter backdrop is available immediately
  $$(".scene-bg[data-bg]").forEach(el => { el.style.backgroundImage = `url("${el.dataset.bg}")`; });
  if (reason) console.info(`[aeris] environmental 3D disabled (${reason}) — image layer active.`);
}

function loadBackgroundsLazily() {
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (e.isIntersecting) {
        const el = e.target;
        if (el.dataset.bg && !el.style.backgroundImage) {
          el.style.backgroundImage = `url("${el.dataset.bg}")`;
        }
        io.unobserve(el);
      }
    }
  }, { rootMargin: "30% 0px" });
  $$(".scene-bg[data-bg]").forEach(el => io.observe(el));
}

/* ---------- WebGL boot ---------- */

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch { return false; }
}

function pickTier() {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = window.innerWidth < 860;
  const mem = navigator.deviceMemory || 8;
  const cores = navigator.hardwareConcurrency || 8;
  let tier = 0;
  if (coarse || small) tier = 1;
  if (mem <= 4 || cores <= 4) tier = Math.max(tier, 2);
  return tier;
}

async function bootScene() {
  if (reduced && window.innerWidth < 860) { useImageFallback("reduced motion on small screen"); return; }
  if (!webglAvailable()) { useImageFallback("webgl unavailable"); return; }

  try {
    const [{ Engine }, { CameraRig }, { SCENE }] = await Promise.all([
      import("./scene/scene.js"),
      import("./scene/camera.js"),
      import("./config.js"),
    ]);

    const canvas = $("#scene");
    const sections = $$("main .chapter");

    const engine = new Engine(canvas, {
      tier: pickTier(),
      reduced,
      onReady: () => {
        state.webgl = true;
        document.body.classList.add("webgl-on");
        document.body.classList.remove("is-booting");
      },
      onFail: () => {
        state.webgl = false;
        useImageFallback("performance");
      },
    });

    const rig = new CameraRig(engine.camera, SCENE.keys, sections, SCENE.camera);
    rig.setScroll(window.scrollY);
    rig.snap();
    engine.attachRig(rig);

    state.engine = engine;
    state.rig = rig;
    engine.start();

    window.addEventListener("pointermove", e => {
      rig.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    }, { passive: true });
  } catch (err) {
    console.warn("[aeris] 3D layer failed to start:", err);
    useImageFallback("module error");
  }
}

/* ---------- reveals ---------- */

function initReveals() {
  $$(".display").forEach(h => {
    $$(".w", h).forEach((w, i) => w.style.setProperty("--d", `${0.12 + i * 0.09}s`));
  });
  if (reduced) {
    $$(".reveal, .reveal-img, .display").forEach(el => el.classList.add("is-in"));
    return;
  }
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      }
    }
  }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
  $$(".reveal, .reveal-img, .display").forEach(el => io.observe(el));
}

/* ---------- header / progress / chapters ---------- */

const NAV_OF_CHAPTER = {
  arrival: "#top", comfort: "#top",
  services: "#services", system: "#services",
  about: "#about", local: "#about", afterlight: "#about",
  contact: "#contact",
};

function initScrollUI() {
  const head = $(".site-head");
  const bar = $("#scrollProgress");
  const railLinks = $$("#chapters a");
  const navLinks = $$(".site-nav a");
  const chapters = $$("main .chapter");
  let ticking = false;

  const paint = () => {
    ticking = false;
    const y = window.scrollY;
    const end = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);

    head.classList.toggle("is-scrolled", y > 24);
    bar.style.transform = `scaleX(${Math.min(1, y / end)})`;

    const probe = y + window.innerHeight * 0.5;
    let idx = 0;
    chapters.forEach((c, i) => { if (c.offsetTop <= probe) idx = i; });
    if (idx !== state.chapter) {
      state.chapter = idx;
      railLinks.forEach(a => a.classList.toggle("is-active", +a.dataset.ch === idx));
      const href = NAV_OF_CHAPTER[chapters[idx].id];
      navLinks.forEach(a => {
        if (a.getAttribute("href") === href) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
    }
    if (state.rig) state.rig.setScroll(y);
  };

  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(paint); } };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => { if (state.engine) state.engine.resize(); onScroll(); }, { passive: true });
  window.addEventListener("load", () => { if (state.rig) state.rig.recalc(); onScroll(); });
  paint();
}

/* ---------- mobile menu ---------- */

function initMenu() {
  const burger = $("#burger");
  const menu = $("#menu");
  const open = (on) => {
    menu.hidden = !on;
    burger.setAttribute("aria-expanded", String(on));
    burger.setAttribute("aria-label", on ? "Close menu" : "Open menu");
    document.body.classList.toggle("is-locked", on);
    if (on) menu.querySelector("a").focus();
  };
  burger.addEventListener("click", () => open(menu.hidden));
  menu.addEventListener("click", e => { if (e.target.closest("a")) open(false); });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !menu.hidden) { open(false); burger.focus(); }
  });
}

/* ---------- contact form (demo only — sends nothing) ---------- */

function initForm() {
  const form = $("#serviceForm");
  const status = $("#formStatus");

  const setError = (input, msg) => {
    let err = input.closest(".field").querySelector(".field-error");
    if (msg) {
      input.classList.add("invalid");
      input.setAttribute("aria-invalid", "true");
      if (!err) {
        err = document.createElement("p");
        err.className = "field-error";
        input.closest(".field").appendChild(err);
      }
      err.textContent = msg;
    } else if (err) {
      input.classList.remove("invalid");
      input.removeAttribute("aria-invalid");
      err.remove();
    }
  };

  form.addEventListener("submit", e => {
    e.preventDefault();
    const name = $("#f-name"), phone = $("#f-phone"), email = $("#f-email"), svc = $("#f-service");
    let ok = true;

    setError(name, name.value.trim() ? "" : (ok = false, "Please add your name"));
    setError(phone, /^[+()\-\s\d]{7,}$/.test(phone.value.trim()) ? "" : (ok = false, "Please add a reachable phone number"));
    setError(email, /^\S+@\S+\.\S+$/.test(email.value.trim()) ? "" : (ok = false, "Please add a valid email"));
    setError(svc, svc.value ? "" : (ok = false, "Choose a service"));
    if (!ok) { status.textContent = ""; return; }

    form.classList.add("form-success");
    status.textContent =
      `Received, ${name.value.trim().split(" ")[0]} — ${svc.value}. ` +
      "Demo only: nothing was stored or sent. AERIS HVAC is a fictional company.";
    form.reset();
  });
}

/* ---------- boot ---------- */

document.addEventListener("DOMContentLoaded", () => {
  initReveals();
  initScrollUI();
  initMenu();
  initForm();
  loadBackgroundsLazily();
  bootScene();
});
