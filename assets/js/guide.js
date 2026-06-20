/* =============================================================
 * 攻略內頁邏輯 (guide.js)
 * 依網址 ?id= 載入單篇攻略、渲染 Markdown、自動產生目錄(TOC)。
 * ============================================================= */
(function () {
  "use strict";

  DV3.mountHeader("guide");
  (function(){ if(document.getElementById("guide-css")) return; var st=document.createElement("style"); st.id="guide-css"; st.textContent=".article-layout > article{border-radius:var(--radius-lg);padding:30px clamp(18px,4vw,40px)}\n.toc-inner{border-radius:var(--radius-lg);padding:16px 18px}\n.back-link{display:inline-block;border-radius:999px;padding:6px 15px}\n.article-meta{color:var(--text-soft)}\n@media(max-width:760px){.article-layout > article{padding:22px 18px}}\n"; document.head.appendChild(st); })();

  var id = DV3.queryParam("id");
  var g = id ? DV3.getGuide(id) : null;

  if (!g) {
    DV3.byId("notfound").style.display = "";
    DV3.mountFooter();
    return;
  }

  // 標題列
  document.title = g.title + " · Dragon Village 3";
  DV3.byId("art-tiers").innerHTML = DV3.tierBadges(g.tiers);
  DV3.byId("art-title").textContent = g.title;

  // meta：日期 + 標籤
  var metaParts = [];
  if (g.date) metaParts.push("📅 " + DV3.formatDate(g.date));
  if (g.tags && g.tags.length) {
    metaParts.push(g.tags.map(function (t) { return "#" + DV3.escapeHtml(t); }).join("　"));
  }
  DV3.byId("art-meta").innerHTML = metaParts.join('<span style="opacity:.4">·</span>');

  // 封面
  if (g.cover) {
    var coverBox = DV3.byId("art-cover");
    coverBox.style.display = "";
    coverBox.innerHTML = '<img src="' + DV3.escapeHtml(g.cover) + '" alt="' + DV3.escapeHtml(g.title) + '" />';
  }

  // 內文（Markdown → 安全 HTML）
  var bodyEl = DV3.byId("art-body");
  bodyEl.innerHTML = DV3.renderMarkdown(g.body || "");

  // 顯示文章區
  DV3.byId("article").style.display = "";

  /* ---------- 自動目錄 (TOC) ---------- */
  var heads = bodyEl.querySelectorAll("h2, h3");
  if (heads.length >= 2) {
    var tocList = DV3.byId("toc-list");
    var frag = document.createDocumentFragment();
    for (var i = 0; i < heads.length; i++) {
      var h = heads[i];
      var anchor = "sec-" + i;
      h.id = anchor;
      var a = document.createElement("a");
      a.href = "#" + anchor;
      a.textContent = h.textContent;
      a.className = h.tagName === "H3" ? "lvl-3" : "lvl-2";
      frag.appendChild(a);
    }
    tocList.appendChild(frag);
    DV3.byId("toc").style.display = "";
  }

  DV3.mountFooter();
})();
