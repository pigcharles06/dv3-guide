/* =============================================================
 * Dragon Village 3 攻略站 — 共用程式 (common.js)
 * 提供：分類常數、資料存取、主題(亮/暗)切換、Markdown 渲染、
 *       共用的頁首/頁尾、以及小工具函式。
 *
 * 設計原則：
 *  - 資料以 assets/data/guides.js 載入 (window.DV3_DATA)，
 *    用 <script> 載入 → 本機雙擊 file:// 也能看，放 GitHub Pages 也正常。
 *  - 不依賴任何打包工具，純前端、零建置。
 * ============================================================= */

window.DV3 = (function () {
  "use strict";

  /* ---------- 1. 三大分類常數 ----------
   * key   : 寫進資料 guides[].tiers 裡的字串（請勿任意更動）
   * label : 顯示用名稱
   * cls   : 對應 CSS 的徽章樣式 class
   */
  var TIERS = [
    { key: "無課小課", label: "無課・小課", cls: "tier--free",  desc: "不花錢或小額也能照做的攻略" },
    { key: "中課",     label: "中課",       cls: "tier--mid",   desc: "中等課金的配置與資源取捨" },
    { key: "大課",     label: "大課",       cls: "tier--whale", desc: "追求極致戰力的課金攻略" }
  ];

  function tierMeta(key) {
    for (var i = 0; i < TIERS.length; i++) {
      if (TIERS[i].key === key) return TIERS[i];
    }
    // 找不到時回傳一個安全的預設，避免畫面壞掉
    return { key: key, label: key, cls: "tier--free", desc: "" };
  }

  /* ---------- 2. 資料存取 ---------- */
  function rawData() {
    return window.DV3_DATA || { site: {}, guides: [] };
  }

  function siteInfo() {
    var s = rawData().site || {};
    return {
      title: s.title || "Dragon Village 3 攻略",
      subtitle: s.subtitle || "無課・小課・中課・大課 全分類攻略",
      updated: s.updated || ""
    };
  }

  // 取得所有攻略（依日期新→舊排序）
  function allGuides() {
    var list = (rawData().guides || []).slice();
    list.sort(function (a, b) {
      var da = (a.date || "") + "";
      var db = (b.date || "") + "";
      if (da === db) return 0;
      return da < db ? 1 : -1; // 新的在前
    });
    return list;
  }

  function getGuide(id) {
    var list = rawData().guides || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  // 蒐集所有出現過的標籤（去重、依出現次數排序）
  function allTags() {
    var counts = {};
    allGuides().forEach(function (g) {
      (g.tags || []).forEach(function (t) {
        t = (t || "").trim();
        if (!t) return;
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    return Object.keys(counts).sort(function (a, b) {
      return counts[b] - counts[a] || (a < b ? -1 : 1);
    });
  }

  /* ---------- 3. 小工具 ---------- */
  function byId(id) { return document.getElementById(id); }

  function escapeHtml(str) {
    return (str == null ? "" : String(str))
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // 讀取網址查詢參數，例如 guide.html?id=xxx
  function queryParam(name) {
    var m = new RegExp("[?&]" + name + "=([^&]*)").exec(window.location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : "";
  }

  // 日期格式：2026-06-19 → 2026.06.19
  function formatDate(d) {
    if (!d) return "";
    return String(d).replace(/-/g, ".");
  }

  // 由標題產生網址安全的 id（給編輯器用）
  function slugify(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[\s　]+/g, "-")        // 空白→-
      .replace(/[^\w一-鿿-]+/g, "") // 只留英數、中文、-
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);
  }

  /* ---------- 4. 主題（亮/暗）切換 ---------- */
  var THEME_KEY = "dv3-theme";

  function safeGet(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function safeSet(key, val) {
    try { window.localStorage.setItem(key, val); } catch (e) { /* 隱私模式可能失敗，略過 */ }
  }

  function currentTheme() {
    var saved = safeGet(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
    var prefersDark = window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
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
    safeSet(THEME_KEY, next);
    applyTheme(next);
  }

  /* ---------- 5. Markdown 渲染 ---------- */

  // 從各種 YouTube 連結取出影片 id
  function youTubeId(url) {
    var m = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(url || "");
    return m ? m[1] : "";
  }

  // 把「整行只有一個 YouTube 連結」轉成可嵌入的 iframe
  function embedYouTube(md) {
    var lines = String(md).split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var t = lines[i].trim();
      if (/^https?:\/\/\S+$/.test(t)) {
        var id = youTubeId(t);
        if (id) {
          lines[i] =
            '<div class="dv3-video"><iframe src="https://www.youtube.com/embed/' + id +
            '" title="YouTube video" loading="lazy" frameborder="0" allowfullscreen ' +
            'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe></div>';
        }
      }
    }
    return lines.join("\n");
  }

  // 設定 DOMPurify 只允許 YouTube 的 iframe（防止亂塞外部內容）
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

  // 主要的 Markdown → 安全 HTML
  function renderMarkdown(md) {
    md = md || "";
    var withVideos = embedYouTube(md);

    // marked 未載入（例如離線）時的安全降級：純文字 + 換行
    if (typeof window.marked === "undefined") {
      return "<pre class=\"dv3-rawfallback\">" + escapeHtml(md) + "</pre>";
    }

    if (window.marked.setOptions) {
      window.marked.setOptions({ gfm: true, breaks: true, headerIds: true, mangle: false });
    }
    var html = window.marked.parse ? window.marked.parse(withVideos)
                                   : window.marked(withVideos);

    if (typeof window.DOMPurify !== "undefined") {
      setupPurify();
      html = window.DOMPurify.sanitize(html, {
        ADD_TAGS: ["iframe"],
        ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "scrolling", "loading", "title", "target"]
      });
    }
    return html;
  }

  /* ---------- 6. 分類徽章 HTML ---------- */
  function tierBadges(tiers) {
    return (tiers || []).map(function (k) {
      var m = tierMeta(k);
      return '<span class="tier-badge ' + m.cls + '">' + escapeHtml(m.label) + "</span>";
    }).join("");
  }

  /* ---------- 7. 共用頁首 / 頁尾 ---------- */
  // active: "home" | "guide" | "editor"，用來標示目前頁面
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
          '<a href="editor.html" class="nav-link' + (active === "editor" ? " is-active" : "") + '">新增/管理</a>' +
        "</nav>" +
        '<button class="theme-toggle" data-theme-toggle type="button" aria-label="切換主題">☾</button>' +
      "</div>";
    document.body.insertBefore(header, document.body.firstChild);

    var toggles = header.querySelectorAll("[data-theme-toggle]");
    for (var i = 0; i < toggles.length; i++) {
      toggles[i].addEventListener("click", toggleTheme);
    }
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

  /* ---------- 8. 進場動畫（捲動到才淡入） ---------- */
  function revealOnScroll(selector) {
    var els = document.querySelectorAll(selector || ".reveal");
    if (!("IntersectionObserver" in window)) {
      // 不支援就直接全部顯示
      for (var j = 0; j < els.length; j++) els[j].classList.add("is-in");
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("is-in");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
    for (var i = 0; i < els.length; i++) io.observe(els[i]);
  }

  /* ---------- 對外公開 ---------- */
  return {
    TIERS: TIERS,
    tierMeta: tierMeta,
    siteInfo: siteInfo,
    allGuides: allGuides,
    getGuide: getGuide,
    allTags: allTags,
    byId: byId,
    escapeHtml: escapeHtml,
    queryParam: queryParam,
    formatDate: formatDate,
    slugify: slugify,
    renderMarkdown: renderMarkdown,
    tierBadges: tierBadges,
    initTheme: initTheme,
    toggleTheme: toggleTheme,
    mountHeader: mountHeader,
    mountFooter: mountFooter,
    revealOnScroll: revealOnScroll,
    youTubeId: youTubeId
  };
})();
