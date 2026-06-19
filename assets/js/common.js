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
    var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  }
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    var btns = document.querySelectorAll("[data-theme-toggle]");
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute("aria-label", theme === "dark" ? "切換到亮色模式" : "切換到暗色模式");
      btns[i].textContent = theme === "dark" ? "☀" : "☾";
    }
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

  function mountHeader(active) {
    var info = siteInfo();
    var header = document.createElement("header");
    header.className = "site-nav";
    header.innerHTML =
      '<div class="nav-pill">' +
        '<a class="nav-brand" href="index.html">' +
          '<span class="nav-logo">🐉</span>' +
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
