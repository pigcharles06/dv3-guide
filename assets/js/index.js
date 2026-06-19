/* =============================================================
 * 首頁邏輯 (index.js)
 * 負責：分類分頁、標籤篩選、搜尋、攻略卡片渲染。
 * ============================================================= */
(function () {
  "use strict";

  DV3.mountHeader("home");

  // 填入站台標題/副標
  var info = DV3.siteInfo();
  DV3.byId("hero-title").textContent = info.title;
  DV3.byId("hero-lead").textContent = info.subtitle;
  document.title = info.title;

  var state = {
    tier: "all",          // all | 無課小課 | 中課 | 大課
    tags: [],             // 已選標籤
    query: ""             // 搜尋字串
  };

  /* ---------- 分類分頁 ---------- */
  function buildTabs() {
    var all = DV3.allGuides();
    var tabs = [{ key: "all", label: "全部", count: all.length }];
    DV3.TIERS.forEach(function (t) {
      var c = all.filter(function (g) { return (g.tiers || []).indexOf(t.key) > -1; }).length;
      tabs.push({ key: t.key, label: t.label, count: c });
    });

    var host = DV3.byId("tier-tabs");
    host.innerHTML = "";
    tabs.forEach(function (tab) {
      var btn = document.createElement("button");
      btn.className = "tier-tab" + (state.tier === tab.key ? " is-active" : "");
      btn.type = "button";
      btn.innerHTML = DV3.escapeHtml(tab.label) + '<span class="count">' + tab.count + "</span>";
      btn.addEventListener("click", function () {
        state.tier = tab.key;
        buildTabs();
        render();
      });
      host.appendChild(btn);
    });
  }

  /* ---------- 標籤 chips ---------- */
  function buildTags() {
    var host = DV3.byId("tag-row");
    var tags = DV3.allTags();
    host.innerHTML = "";
    if (!tags.length) return;
    tags.forEach(function (tag) {
      var chip = document.createElement("button");
      chip.className = "chip" + (state.tags.indexOf(tag) > -1 ? " is-active" : "");
      chip.type = "button";
      chip.textContent = "#" + tag;
      chip.addEventListener("click", function () {
        var i = state.tags.indexOf(tag);
        if (i > -1) state.tags.splice(i, 1); else state.tags.push(tag);
        buildTags();
        render();
      });
      host.appendChild(chip);
    });
  }

  /* ---------- 篩選邏輯 ---------- */
  function matches(g) {
    // 分類
    if (state.tier !== "all" && (g.tiers || []).indexOf(state.tier) === -1) return false;
    // 標籤（OR：選到的任一個符合即可）
    if (state.tags.length) {
      var hit = state.tags.some(function (t) { return (g.tags || []).indexOf(t) > -1; });
      if (!hit) return false;
    }
    // 搜尋
    if (state.query) {
      var q = state.query.toLowerCase();
      var hay = [g.title, g.summary, (g.tags || []).join(" "), g.body]
        .join(" ").toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  }

  /* ---------- 卡片 ---------- */
  function cardHtml(g) {
    var cover = g.cover
      ? '<img src="' + DV3.escapeHtml(g.cover) + '" alt="' + DV3.escapeHtml(g.title) + '" loading="lazy" />'
      : '<span class="placeholder">🐲</span>';
    var tags = (g.tags || []).slice(0, 3).map(function (t) {
      return '<span class="card-tag">' + DV3.escapeHtml(t) + "</span>";
    }).join("");

    return '' +
      '<a class="guide-card reveal" href="guide.html?id=' + encodeURIComponent(g.id) + '">' +
        '<div class="card-cover">' + cover + "</div>" +
        '<div class="card-body">' +
          '<div class="card-tiers">' + DV3.tierBadges(g.tiers) + "</div>" +
          '<h3 class="card-title">' + DV3.escapeHtml(g.title) + "</h3>" +
          '<p class="card-summary">' + DV3.escapeHtml(g.summary || "") + "</p>" +
          '<div class="card-meta">' +
            '<span>' + DV3.escapeHtml(DV3.formatDate(g.date)) + "</span>" +
            '<span class="card-tags">' + tags + "</span>" +
          "</div>" +
        "</div>" +
      "</a>";
  }

  /* ---------- 渲染 ---------- */
  function render() {
    var list = DV3.allGuides().filter(matches);
    var grid = DV3.byId("grid");
    var empty = DV3.byId("empty");

    // 標題
    var label = state.tier === "all" ? "全部攻略" : DV3.tierMeta(state.tier).label;
    DV3.byId("list-title").textContent = label;
    DV3.byId("list-count").textContent = list.length + " 篇";

    if (!list.length) {
      grid.innerHTML = "";
      empty.style.display = "";
      return;
    }
    empty.style.display = "none";
    grid.innerHTML = list.map(cardHtml).join("");
    DV3.revealOnScroll("#grid .reveal");
  }

  /* ---------- 搜尋輸入 ---------- */
  var searchEl = DV3.byId("search");
  var debounce;
  searchEl.addEventListener("input", function () {
    clearTimeout(debounce);
    debounce = setTimeout(function () {
      state.query = searchEl.value.trim();
      render();
    }, 120);
  });

  /* ---------- 啟動 ---------- */
  buildTabs();
  buildTags();
  render();
  DV3.mountFooter();
})();
