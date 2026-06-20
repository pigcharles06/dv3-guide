/* =============================================================
 * Dragon Village 3 攻略站 — 共用程式 (common.js)
 * 提供：分類常數、資料存取、主題(亮/暗)切換、Markdown 渲染、
 *       共用的頁首/頁尾、以及小工具函式。
 * ============================================================= */

window.DV3 = (function () {
  "use strict";

  var TIERS = [
    { key: "無課小課", label: "無課・小課", cls: "tier--free",  desc: "不花錢或小額也能照做的攻略" },
    { key: "中課",     label: "中課",       cls: "tier--mid",   desc: "中等課金的配置與資源取捨" },
    { key: "大課",     label: "大課",       cls: "tier--whale", desc: "追求極致戰力的課金攻略" }
  ];

  function tierMeta(key) {
    for (var i = 0; i < TIERS.length; i++) {
      if (TIERS[i].key === key) return TIERS[i];
    }
    return { key: key, label: key, cls: "tier--free", desc: "" };
  }

  function rawData() { return window.DV3_DATA || { site: {}, guides: [] }; }

  function siteInfo() {
    var s = rawData().site || {};
    return {
      title: s.title || "Dragon Village 3 攻略",
      subtitle: s.subtitle || "無課・小課・中課・大課 全分類攻略",
      updated: s.updated || ""
    };
  }

  function allGuides() {
    var list = (rawData().guides || []).slice();
    list.sort(function (a, b) {
      var da = (a.date || "") + "", db = (b.date || "") + "";
      if (da === db) return 0;
      return da < db ? 1 : -1;
    });
    return list;
  }

  function getGuide(id) {
    var list = rawData().guides || [];
    for (var i = 0; i < list.length; i++) { if (list[i].id === id) return list[i]; }
    return null;
  }

  function allTags() {
    var counts = {};
    allGuides().forEach(function (g) {
      (g.tags || []).forEach(function (t) {
        t = (t || "").trim(); if (!t) return;
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    return Object.keys(counts).sort(function (a, b) {
      return counts[b] - counts[a] || (a < b ? -1 : 1);
    });
  }

  function byId(id) { return document.getElementById(id); }

  function escapeHtml(str) {
    return (str == null ? "" : String(str))
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function queryParam(name) {
    var m = new RegExp("[?&]" + name + "=([^&]*)").exec(window.location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : "";
  }

  function formatDate(d) { return d ? String(d).replace(/-/g, ".") : ""; }

  function slugify(text) {
    return String(text || "").toLowerCase()
      .replace(/[\s　]+/g, "-").replace(/[^\w一-鿿-]+/g, "")
      .replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
  }

  var THEME_KEY = "dv3-theme";
  function safeGet(k){ try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k,v){ try { window.localStorage.setItem(k,v); } catch (e) {} }
  function currentTheme() {
    var saved = safeGet(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
    return "light";
  }
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    var btns = document.querySelectorAll("[data-theme-toggle]");
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute("aria-label", theme === "dark" ? "切換到亮色模式" : "切換到暗色模式");
      btns[i].textContent = theme === "dark" ? "☀" : "☾";
    }
    var bgd = document.querySelectorAll(".bg-dragon");
    for (var j = 0; j < bgd.length; j++) bgd[j].style.opacity = theme === "dark" ? "0.46" : "0.34";
  }
  function initTheme() { applyTheme(currentTheme()); }
  function toggleTheme() {
    var next = currentTheme() === "dark" ? "light" : "dark";
    safeSet(THEME_KEY, next); applyTheme(next);
  }

  function youTubeId(url) {
    var m = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(url || "");
    return m ? m[1] : "";
  }
  function embedYouTube(md) {
    var lines = String(md).split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var t = lines[i].trim();
      if (/^https?:\/\/\S+$/.test(t)) {
        var id = youTubeId(t);
        if (id) {
          lines[i] = '<div class="dv3-video"><iframe src="https://www.youtube.com/embed/' + id +
            '" title="YouTube video" loading="lazy" frameborder="0" allowfullscreen ' +
            'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe></div>';
        }
      }
    }
    return lines.join("\n");
  }
  var purifyHooked = false;
  function setupPurify() {
    if (purifyHooked || typeof window.DOMPurify === "undefined") return;
    window.DOMPurify.addHook("uponSanitizeElement", function (node) {
      if (node.tagName === "IFRAME") {
        var src = node.getAttribute("src") || "";
        if (src.indexOf("https://www.youtube.com/embed/") !== 0) {
          node.parentNode && node.parentNode.removeChild(node);
        }
      }
    });
    purifyHooked = true;
  }
  function renderMarkdown(md) {
    md = md || "";
    var withVideos = embedYouTube(md);
    if (typeof window.marked === "undefined") {
      return "<pre class=\"dv3-rawfallback\">" + escapeHtml(md) + "</pre>";
    }
    if (window.marked.setOptions) {
      window.marked.setOptions({ gfm: true, breaks: true, headerIds: true, mangle: false });
    }
    var html = window.marked.parse ? window.marked.parse(withVideos) : window.marked(withVideos);
    if (typeof window.DOMPurify !== "undefined") {
      setupPurify();
      html = window.DOMPurify.sanitize(html, {
        ADD_TAGS: ["iframe"],
        ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "scrolling", "loading", "title", "target"]
      });
    }
    return html;
  }

  function tierBadges(tiers) {
    return (tiers || []).map(function (k) {
      var m = tierMeta(k);
      return '<span class="tier-badge ' + m.cls + '">' + escapeHtml(m.label) + "</span>";
    }).join("");
  }

  function mountBackground() {
    if (document.querySelector(".bg-stage")) return;
    var N = 10, base = "assets/img/dragons/bg/";
    if (!document.getElementById("bg-kf")) {
      var kf = document.createElement("style");
      kf.id = "bg-kf";
      kf.textContent =
        "@keyframes dv3kb{0%{transform:scale(1.05) translate(0,0)}100%{transform:scale(1.16) translate(-2.2%,-1.6%)}}" +
        ".bg-stage{position:fixed;inset:0;z-index:-2;overflow:hidden;pointer-events:none;background:#0b0b10;transition:transform .6s cubic-bezier(.22,1,.36,1)}" +
        ".bg-slide{position:absolute;inset:0;background-size:cover;background-position:center;opacity:0;transition:opacity 1.8s ease-in-out;will-change:opacity,transform;animation:dv3kb 22s ease-in-out infinite alternate}" +
        ".bg-slide.on{opacity:1}" +
        ".bg-scrim{position:fixed;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(130% 100% at 50% 34%, rgba(8,8,13,.42), rgba(8,8,13,.72) 80%)}" +
        "@media (prefers-reduced-motion: reduce){.bg-slide{animation:none}}";
      document.head.appendChild(kf);
    }
    var stage = document.createElement("div");
    stage.className = "bg-stage";
    stage.setAttribute("aria-hidden", "true");
    var slides = [];
    for (var i = 1; i <= N; i++) {
      var s = document.createElement("div");
      s.className = "bg-slide" + (i === 1 ? " on" : "");
      s.style.backgroundImage = "url('" + base + "bg-" + (i < 10 ? "0" : "") + i + ".webp')";
      s.style.animationDelay = (-(i * 2.4)) + "s";
      stage.appendChild(s);
      slides.push(s);
    }
    var scrim = document.createElement("div");
    scrim.className = "bg-scrim";
    scrim.setAttribute("aria-hidden", "true");
    document.body.insertBefore(scrim, document.body.firstChild);
    document.body.insertBefore(stage, document.body.firstChild);
    var cur = 0;
    if (N > 1) {
      setInterval(function () {
        slides[cur].classList.remove("on");
        cur = (cur + 1) % N;
        slides[cur].classList.add("on");
      }, 6000);
    }
    var raf = null, tx = 0, ty = 0;
    function ap() { stage.style.transform = "translate(" + (tx * -14) + "px," + (ty * -10) + "px)"; raf = null; }
    window.addEventListener("mousemove", function (e) {
      tx = e.clientX / window.innerWidth - 0.5;
      ty = e.clientY / window.innerHeight - 0.5;
      if (!raf) raf = requestAnimationFrame(ap);
    });
  }

  function injectGlass(){ if(document.getElementById("glass-css")) return; var st=document.createElement("style"); st.id="glass-css"; st.textContent="html[data-theme=\"light\"]{--text-soft:#423e36;--text-faint:#5f5849}\n.nav-pill,.search-shell,.tier-tabs,.guide-card,.table-wrap,.compare,.panel,.note,.preview-box,.empty,.footer-inner,.article-layout > article,.toc-inner,.back-link,.hero .eyebrow,.hero h1,.hero .lead,.section-head h2,.section-head .muted,.editor-head h1,.editor-head p,.dex-count,.dex-filter-row .label{backdrop-filter:blur(16px) saturate(130%);-webkit-backdrop-filter:blur(16px) saturate(130%)}\n.nav-pill,.search-shell,.tier-tabs,.table-wrap,.compare,.panel,.note,.preview-box,.empty,.footer-inner,.article-layout > article,.toc-inner,.back-link{background:rgba(20,17,26,.46)!important;border:1px solid rgba(255,255,255,.13)!important}\n.guide-card{background:rgba(22,18,28,.46)!important;border:1px solid rgba(255,255,255,.13)!important;box-shadow:0 14px 38px -16px rgba(0,0,0,.55)!important}\n.guide-card:hover{border-color:rgba(255,255,255,.24)!important;box-shadow:0 22px 50px -18px rgba(0,0,0,.66)!important}\n.nav-pill{box-shadow:0 10px 34px -12px rgba(0,0,0,.5)!important}\n.note,.empty,.footer-inner,.preview-box,.panel{border-radius:var(--radius-lg)!important}\n.search-shell{border-radius:999px!important}\n.search-input{background:transparent!important;border:0!important;box-shadow:none!important}\n.hero .eyebrow,.hero h1,.hero .lead,.editor-head h1,.editor-head p,.dex-count{display:block!important;width:fit-content;max-width:100%;margin-left:auto!important;margin-right:auto!important;background:rgba(20,17,26,.44)!important;border:1px solid rgba(255,255,255,.13)}\n.hero .eyebrow{border-radius:999px!important;padding:6px 16px!important;margin-bottom:16px!important}\n.hero h1{border-radius:24px!important;padding:6px 30px!important;margin-top:0!important;margin-bottom:16px!important}\n.hero .lead{border-radius:999px!important;padding:8px 22px!important;margin-bottom:8px!important}\n.editor-head h1{border-radius:22px!important;padding:8px 26px!important;margin-bottom:12px!important}\n.editor-head p{border-radius:16px!important;padding:8px 18px!important}\n.dex-count{border-radius:999px!important;padding:6px 18px!important}\n.section-head h2{background:rgba(20,17,26,.46)!important;border:1px solid rgba(255,255,255,.13);border-radius:14px!important;padding:6px 18px!important}\n.section-head .muted{background:rgba(20,17,26,.44)!important;border:1px solid rgba(255,255,255,.13);border-radius:999px!important;padding:5px 14px!important}\n.dex-filter-row .label{background:rgba(20,17,26,.44)!important;border:1px solid rgba(255,255,255,.13);border-radius:999px!important;padding:4px 13px!important}\n.chip{background:rgba(20,17,26,.50)!important;border:1px solid rgba(255,255,255,.13)!important;color:var(--text-soft)}\n.chip.is-active{background:rgba(212,173,111,.34)!important;border-color:rgba(212,173,111,.55)!important;color:#fff!important}\n.input,.textarea{background:rgba(20,17,26,.44)!important;border:1px solid rgba(255,255,255,.14)!important}\nhtml[data-theme=\"light\"] .nav-pill,html[data-theme=\"light\"] .search-shell,html[data-theme=\"light\"] .tier-tabs,html[data-theme=\"light\"] .table-wrap,html[data-theme=\"light\"] .compare,html[data-theme=\"light\"] .panel,html[data-theme=\"light\"] .note,html[data-theme=\"light\"] .preview-box,html[data-theme=\"light\"] .empty,html[data-theme=\"light\"] .footer-inner,html[data-theme=\"light\"] .article-layout > article,html[data-theme=\"light\"] .toc-inner,html[data-theme=\"light\"] .back-link,html[data-theme=\"light\"] .hero .eyebrow,html[data-theme=\"light\"] .hero h1,html[data-theme=\"light\"] .hero .lead,html[data-theme=\"light\"] .section-head h2,html[data-theme=\"light\"] .section-head .muted,html[data-theme=\"light\"] .editor-head h1,html[data-theme=\"light\"] .editor-head p,html[data-theme=\"light\"] .dex-count,html[data-theme=\"light\"] .dex-filter-row .label{background:rgba(250,247,241,.64)!important;border:1px solid rgba(0,0,0,.12)!important}\nhtml[data-theme=\"light\"] .guide-card{background:rgba(252,250,245,.68)!important;border:1px solid rgba(0,0,0,.12)!important}\nhtml[data-theme=\"light\"] .chip{background:rgba(250,247,241,.72)!important;border-color:rgba(0,0,0,.12)!important;color:var(--text-soft)}\nhtml[data-theme=\"light\"] .input,html[data-theme=\"light\"] .textarea{background:rgba(250,247,241,.64)!important;border-color:rgba(0,0,0,.14)!important}\n"; document.head.appendChild(st); }

  function mountHeader(active) {
    mountBackground();
    injectGlass();
    var info = siteInfo();
    var header = document.createElement("header");
    header.className = "site-nav";
    header.innerHTML =
      '<div class="nav-pill">' +
        '<a class="nav-brand" href="index.html">' +
          '<img class="nav-logo" src="assets/img/dragons/dragonslayer.webp" alt="" style="width:28px;height:28px;border-radius:7px;object-fit:cover;vertical-align:middle" />' +
          '<span class="nav-title">' + escapeHtml(info.title) + "</span>" +
        "</a>" +
        '<nav class="nav-links">' +
          '<a href="index.html" class="nav-link' + (active === "home" ? " is-active" : "") + '">攻略總覽</a>' +
          '<a href="dragons.html" class="nav-link' + (active === "dex" ? " is-active" : "") + '">龍圖鑑</a>' +
          '<a href="editor.html" class="nav-link' + (active === "editor" ? " is-active" : "") + '">新增/管理</a>' +
        "</nav>" +
        '<button class="theme-toggle" data-theme-toggle type="button" aria-label="切換主題">☾</button>' +
      "</div>";
    document.body.insertBefore(header, document.body.firstChild);
    var toggles = header.querySelectorAll("[data-theme-toggle]");
    for (var i = 0; i < toggles.length; i++) { toggles[i].addEventListener("click", toggleTheme); }
    applyTheme(currentTheme());
  }

  function mountFooter() {
    var info = siteInfo();
    var footer = document.createElement("footer");
    footer.className = "site-footer";
    footer.innerHTML =
      '<div class="footer-inner">' +
        "<p>" + escapeHtml(info.title) + "</p>" +
        (info.updated ? '<p class="footer-sub">最後更新：' + escapeHtml(formatDate(info.updated)) + "</p>" : "") +
        '<p class="footer-sub">本站為玩家自製攻略，與遊戲官方無關。</p>' +
      "</div>";
    document.body.appendChild(footer);
  }

  function revealOnScroll(selector) {
    var els = document.querySelectorAll(selector || ".reveal");
    if (!("IntersectionObserver" in window)) {
      for (var j = 0; j < els.length; j++) els[j].classList.add("is-in");
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
    for (var i = 0; i < els.length; i++) io.observe(els[i]);
  }

  return {
    TIERS: TIERS, tierMeta: tierMeta, siteInfo: siteInfo, allGuides: allGuides,
    getGuide: getGuide, allTags: allTags, byId: byId, escapeHtml: escapeHtml,
    queryParam: queryParam, formatDate: formatDate, slugify: slugify,
    renderMarkdown: renderMarkdown, tierBadges: tierBadges, initTheme: initTheme,
    toggleTheme: toggleTheme, mountHeader: mountHeader, mountFooter: mountFooter,
    revealOnScroll: revealOnScroll, youTubeId: youTubeId
  };
})();
