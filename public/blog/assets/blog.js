/* Reference Home · Blog: movimiento e interacciones.
   Funciona sin librerías: Lenis (scroll suave) es opcional. */
(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.add("js");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var slug = (document.querySelector('meta[property="og:url"]') || {}).content || location.pathname;

  /* ---------- Medición (sin datos personales) ---------- */
  var sent = {};
  function track(name, params, once) {
    if (once) {
      if (sent[once]) return;
      sent[once] = 1;
    }
    try {
      params = params || {};
      params.landing_id = "blog";
      params.page_path = location.pathname;
      if (window.gtag) window.gtag("event", name, params);
    } catch (e) {}
  }
  window.track = track;

  /* ---------- Scroll suave ---------- */
  var lenis = null;
  function startLenis() {
    if (reduced || !window.Lenis || lenis) return;
    lenis = new window.Lenis({ duration: 1.1, smoothWheel: true });
    function raf(t) {
      lenis.raf(t);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("href");
        var el = id.length > 1 && document.querySelector(id);
        if (!el) return;
        e.preventDefault();
        lenis.scrollTo(el, { offset: -130 });
        history.replaceState(null, "", id);
      });
    });
  }
  window.addEventListener("load", startLenis);

  /* ---------- Cabecera, progreso, parallax ---------- */
  var hdr = document.querySelector("[data-hdr]");
  var bar = document.querySelector(".progress");
  var cover = document.querySelector("[data-parallax] img");
  var blobs = document.querySelectorAll(".bh__bg span");
  var lastY = window.scrollY;
  var depth = [25, 50, 75, 90];
  var ticking = false;

  function frame() {
    ticking = false;
    var y = window.scrollY;
    var max = doc.scrollHeight - window.innerHeight;
    var p = max > 0 ? Math.min(1, y / max) : 0;
    if (bar) bar.style.transform = "scaleX(" + p.toFixed(4) + ")";
    if (hdr) {
      hdr.classList.toggle("is-scrolled", y > 20);
      if (y > lastY + 6 && y > 300) hdr.classList.add("is-hidden");
      else if (y < lastY - 6 || y < 120) hdr.classList.remove("is-hidden");
    }
    lastY = y;
    depth.forEach(function (d) {
      if (p * 100 >= d) track("rh_scroll_depth", { percent: d }, "depth" + d);
    });
    if (!reduced && cover) {
      var r = cover.getBoundingClientRect();
      var t = Math.min(1, Math.max(0, 1 - r.bottom / (window.innerHeight + r.height)));
      cover.style.setProperty("--sc", (1.08 - t * 0.08).toFixed(4));
    }
    if (!reduced && blobs.length) {
      blobs.forEach(function (b, i) {
        b.style.setProperty("--y", (y * (0.08 + i * 0.06)).toFixed(1) + "px");
      });
    }
  }
  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(frame);
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  frame();

  /* Manchas de color que siguen un poco al cursor */
  if (!reduced && finePointer && blobs.length) {
    window.addEventListener("pointermove", function (e) {
      var nx = e.clientX / window.innerWidth - 0.5;
      var ny = e.clientY / window.innerHeight - 0.5;
      blobs.forEach(function (b, i) {
        var k = (i + 1) * 24;
        b.style.setProperty("--x", (nx * k).toFixed(1) + "px");
        b.style.setProperty("--y", (window.scrollY * (0.08 + i * 0.06) + ny * k).toFixed(1) + "px");
      });
    });
  }

  /* ---------- Menú móvil ---------- */
  var mBtn = document.querySelector(".hdr__menu");
  var mNav = document.getElementById("menu-movil");
  if (mBtn && mNav) {
    mBtn.addEventListener("click", function () {
      var open = mBtn.getAttribute("aria-expanded") !== "true";
      mBtn.setAttribute("aria-expanded", String(open));
      if (open) {
        mNav.hidden = false;
        requestAnimationFrame(function () {
          mNav.classList.add("is-open");
        });
        if (lenis) lenis.stop();
      } else {
        mNav.classList.remove("is-open");
        setTimeout(function () {
          mNav.hidden = true;
        }, 400);
        if (lenis) lenis.start();
      }
    });
  }

  /* ---------- Titulares palabra a palabra ---------- */
  function split(el) {
    var i = 0;
    function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              frag.appendChild(document.createTextNode(part));
              return;
            }
            var w = document.createElement("span");
            w.className = "split-w";
            var inner = document.createElement("span");
            inner.style.setProperty("--i", i++);
            inner.textContent = part;
            w.appendChild(inner);
            frag.appendChild(w);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1) walk(n);
      });
    }
    walk(el);
  }
  document.querySelectorAll("[data-split]").forEach(function (el) {
    if (reduced) return;
    split(el);
    requestAnimationFrame(function () {
      setTimeout(function () {
        el.classList.add("split-in");
      }, 120);
    });
  });

  /* ---------- Revelado al entrar en pantalla ---------- */
  var revealSel = "[data-rv], .prose h2, .pull, .ph__cover";
  if ("IntersectionObserver" in window && !reduced) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          en.target.classList.add("in");
          io.unobserve(en.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px" }
    );
    document.querySelectorAll(revealSel).forEach(function (el) {
      io.observe(el);
    });
    // Tarjetas con un pequeño escalonado
    document.querySelectorAll(".grid .card").forEach(function (c, i) {
      c.setAttribute("data-rv", "");
      c.style.setProperty("--d", (i % 3) * 0.08 + "s");
      io.observe(c);
    });
  } else {
    document.querySelectorAll(revealSel).forEach(function (el) {
      el.classList.add("in");
    });
  }

  /* ---------- Índice activo ---------- */
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll(".toc a"));
  if (tocLinks.length && "IntersectionObserver" in window) {
    var map = {};
    tocLinks.forEach(function (a) {
      map[a.getAttribute("href").slice(1)] = a;
    });
    var tio = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          tocLinks.forEach(function (a) {
            a.classList.remove("is-active");
          });
          var a = map[en.target.id];
          if (a) {
            a.classList.add("is-active");
            track("rh_section_view", { section: en.target.id }, "sec-" + en.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    document.querySelectorAll(".prose h2[id]").forEach(function (h) {
      tio.observe(h);
    });
  }

  /* ---------- Copiar enlace ---------- */
  document.querySelectorAll("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () {
      var url = b.getAttribute("data-copy");
      var done = function () {
        var t = b.textContent;
        b.textContent = "Enlace copiado";
        setTimeout(function () {
          b.textContent = t;
        }, 1800);
      };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, done);
      else done();
      track("rh_share", { method: "copy" });
    });
  });
  document.querySelectorAll(".toc__share a").forEach(function (a) {
    a.addEventListener("click", function () {
      track("rh_share", { method: a.textContent.trim().toLowerCase() });
    });
  });

  /* ---------- Comparador ---------- */
  document.querySelectorAll("[data-vs] .vs__row").forEach(function (row) {
    row.addEventListener("click", function () {
      var on = !row.classList.contains("is-on");
      row.parentNode.querySelectorAll(".vs__row").forEach(function (r) {
        r.classList.remove("is-on");
      });
      if (on) row.classList.add("is-on");
      track("rh_compare_row", { row: row.firstElementChild.textContent.trim() });
    });
  });

  /* ---------- Test «¿cuál necesitas?» ---------- */
  document.querySelectorAll("[data-quiz]").forEach(function (q) {
    var ans = q.querySelector(".quiz__answer");
    q.querySelectorAll("button[data-a]").forEach(function (b) {
      b.addEventListener("click", function () {
        q.querySelectorAll("button").forEach(function (x) {
          x.classList.remove("is-on");
        });
        b.classList.add("is-on");
        ans.classList.add("is-swap");
        setTimeout(function () {
          ans.innerHTML = b.getAttribute("data-a");
          ans.classList.remove("is-swap");
        }, 220);
        track("rh_quiz", { option: b.textContent.trim() });
      });
    });
  });

  /* ---------- Lista con casillas (se guarda en el navegador) ---------- */
  document.querySelectorAll("[data-checklist]").forEach(function (box) {
    var key = "rh_check_" + box.getAttribute("data-checklist");
    var inputs = Array.prototype.slice.call(box.querySelectorAll('input[type="checkbox"]'));
    var done = box.querySelector("[data-done]");
    var total = box.querySelector("[data-total]");
    var count = box.querySelector(".checklist__count");
    var finished = box.querySelector(".checklist__done");
    var saved = [];
    try {
      saved = JSON.parse(localStorage.getItem(key) || "[]");
    } catch (e) {}
    inputs.forEach(function (inp, i) {
      inp.checked = saved.indexOf(i) > -1;
    });
    function update(user) {
      var on = [];
      inputs.forEach(function (inp, i) {
        if (inp.checked) on.push(i);
      });
      if (done) done.textContent = on.length;
      if (total) total.textContent = inputs.length;
      if (count) count.style.setProperty("--p", Math.round((on.length / inputs.length) * 100) + "%");
      if (finished) finished.hidden = on.length !== inputs.length;
      try {
        localStorage.setItem(key, JSON.stringify(on));
      } catch (e) {}
      if (user) track("rh_checklist", { done: on.length, total: inputs.length });
    }
    inputs.forEach(function (inp) {
      inp.addEventListener("change", function () {
        update(true);
      });
    });
    update(false);
  });

  /* ---------- Buscador y filtros de la portada ---------- */
  var grid = document.querySelector("[data-grid]");
  if (grid) {
    var cards = Array.prototype.slice.call(document.querySelectorAll(".card"));
    var input = document.querySelector("[data-search-input]");
    var chips = Array.prototype.slice.call(document.querySelectorAll("[data-filter]"));
    var empty = document.querySelector("[data-empty]");
    var cat = "all";
    var searchTimer = 0;
    function apply() {
      var q = (input && input.value.trim().toLowerCase()) || "";
      var shown = 0;
      cards.forEach(function (c) {
        var ok = (cat === "all" || c.getAttribute("data-cat") === cat) && (!q || c.getAttribute("data-search").indexOf(q) > -1);
        c.classList.toggle("is-out", !ok);
        if (ok) shown++;
      });
      if (empty) empty.hidden = shown > 0;
      return shown;
    }
    chips.forEach(function (ch) {
      ch.addEventListener("click", function () {
        cat = ch.getAttribute("data-filter");
        chips.forEach(function (x) {
          x.classList.toggle("is-on", x === ch);
        });
        apply();
        history.replaceState(null, "", cat === "all" ? location.pathname : "#" + cat);
        track("rh_filter", { category: cat });
      });
    });
    if (input) {
      input.addEventListener("input", function () {
        var n = apply();
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function () {
          if (input.value.trim()) track("search", { search_term: input.value.trim().slice(0, 60), search_result: n ? "found" : "not_found" });
        }, 1000);
      });
    }
    var h = location.hash.slice(1);
    if (h) {
      var c = chips.filter(function (x) {
        return x.getAttribute("data-filter") === h;
      })[0];
      if (c) c.click();
    }
  }

  /* ---------- Botones magnéticos ---------- */
  if (!reduced && finePointer) {
    document.querySelectorAll(".btn").forEach(function (b) {
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        b.style.transform = "translate(" + ((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1) + "px," + ((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1) + "px)";
      });
      b.addEventListener("pointerleave", function () {
        b.style.transform = "";
      });
    });
  }

  /* ---------- Clics que importan ---------- */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a");
    if (!a) return;
    var href = a.getAttribute("href") || "";
    if (href.indexOf("tel:") === 0) track("generate_lead", { lead_method: "phone", placement: "blog" });
    else if (href.indexOf("wa.me/34") > -1) track("generate_lead", { lead_method: "whatsapp", placement: "blog" });
    else if (a.hasAttribute("data-cta")) track("rh_cta_click", { cta: a.getAttribute("data-cta"), placement: "band" });
  });

  /* ---------- Cookies (misma elección que las landings) ---------- */
  var ck = document.querySelector(".ck");
  function setConsent(ok) {
    try {
      localStorage.setItem("rh_consent", JSON.stringify({ v: 1, ok: ok, t: Date.now() }));
    } catch (e) {}
    var g = ok ? "granted" : "denied";
    if (window.gtag) window.gtag("consent", "update", { ad_storage: g, ad_user_data: g, ad_personalization: g, analytics_storage: g });
    if (ck) ck.hidden = true;
  }
  if (ck) {
    if (!window.RH_CONSENT_DONE) setTimeout(function () {
      ck.hidden = false;
    }, 900);
    ck.querySelector('[data-ck="ok"]').addEventListener("click", function () {
      setConsent(true);
    });
    ck.querySelector('[data-ck="no"]').addEventListener("click", function () {
      setConsent(false);
    });
    document.querySelectorAll("[data-rh-cookies]").forEach(function (b) {
      b.addEventListener("click", function () {
        ck.hidden = false;
      });
    });
  }
})();
