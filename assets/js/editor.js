/* =============================================================
 * 後台編輯器邏輯 (editor.js)
 * 純前端、不需後端。編輯內容暫存於 localStorage，
 * 完成後匯出 guides.js 覆蓋資料檔即可更新網站。
 * ============================================================= */
(function () {
  "use strict";

  DV3.mountHeader("editor");

  var DRAFT_KEY = "dv3-editor-draft";

  /* ---------- 取得目前資料(原始順序) ---------- */
  function rawGuides() {
    return (window.DV3_DATA && window.DV3_DATA.guides) ? window.DV3_DATA.guides.slice() : [];
  }
  function rawSite() {
    return (window.DV3_DATA && window.DV3_DATA.site) ? window.DV3_DATA.site : {};
  }

  // 工作中的資料模型
  var model = { site: {}, guides: [] };
  var current = null; // 目前編輯的攻略物件(參照)

  function todayStr() {
    var d = new Date();
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }

  function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

  function loadFromData() {
    model.site = deepClone(rawSite());
    model.guides = deepClone(rawGuides());
  }

  function loadDraft() {
    try {
      var raw = window.localStorage.getItem(DRAFT_KEY);
      if (!raw) return false;
      var parsed = JSON.parse(raw);
      if (parsed && parsed.guides) { model = parsed; return true; }
    } catch (e) { /* 忽略 */ }
    return false;
  }

  var saveTimer;
  function saveDraft() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { window.localStorage.setItem(DRAFT_KEY, JSON.stringify(model)); } catch (e) {}
    }, 250);
  }

  /* ---------- Toast 提示 ---------- */
  var toastTimer;
  function toast(msg) {
    var t = DV3.byId("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2200);
  }

  /* ---------- 分類核取方塊 ---------- */
  function buildTierChecks() {
    var host = DV3.byId("f-tiers");
    host.innerHTML = "";
    DV3.TIERS.forEach(function (t) {
      var id = "tier-" + t.cls;
      var label = document.createElement("label");
      label.innerHTML = '<input type="checkbox" value="' + DV3.escapeHtml(t.key) + '" id="' + id + '" /> ' + DV3.escapeHtml(t.label);
      host.appendChild(label);
      label.querySelector("input").addEventListener("change", function () {
        if (!current) return;
        var checked = [];
        host.querySelectorAll("input:checked").forEach(function (c) { checked.push(c.value); });
        current.tiers = checked;
        saveDraft();
      });
    });
  }

  /* ---------- 攻略清單 ---------- */
  function renderList() {
    var host = DV3.byId("glist");
    DV3.byId("count").textContent = model.guides.length;
    host.innerHTML = "";
    if (!model.guides.length) {
      host.innerHTML = '<p style="color:var(--text-faint);font-size:14px">還沒有攻略，按上方「＋ 新增攻略」開始。</p>';
      return;
    }
    model.guides.forEach(function (g, idx) {
      var item = document.createElement("div");
      item.className = "glist-item" + (g === current ? " is-active" : "");
      item.innerHTML =
        '<span class="gi-title">' + DV3.escapeHtml(g.title || "(未命名)") + "</span>" +
        '<button class="gi-del" title="刪除" type="button">×</button>';
      item.querySelector(".gi-title").addEventListener("click", function () {
        current = g; loadToForm(); renderList();
      });
      item.querySelector(".gi-del").addEventListener("click", function (e) {
        e.stopPropagation();
        if (!window.confirm("確定刪除「" + (g.title || "未命名") + "」？")) return;
        model.guides.splice(idx, 1);
        if (current === g) { current = model.guides[0] || null; loadToForm(); }
        renderList(); saveDraft(); toast("已刪除");
      });
      host.appendChild(item);
    });
  }

  /* ---------- 表單 ↔ 資料 ---------- */
  function loadToForm() {
    var g = current;
    var enable = !!g;
    ["f-title", "f-tags", "f-summary", "f-cover", "f-date", "f-id", "f-body"].forEach(function (id) {
      DV3.byId(id).disabled = !enable;
    });
    DV3.byId("f-title").value = g ? (g.title || "") : "";
    DV3.byId("f-tags").value = g ? (g.tags || []).join(", ") : "";
    DV3.byId("f-summary").value = g ? (g.summary || "") : "";
    DV3.byId("f-cover").value = g ? (g.cover || "") : "";
    DV3.byId("f-date").value = g ? (g.date || "") : "";
    DV3.byId("f-id").value = g ? (g.id || "") : "";
    DV3.byId("f-body").value = g ? (g.body || "") : "";

    // 分類勾選
    var tiers = g ? (g.tiers || []) : [];
    DV3.byId("f-tiers").querySelectorAll("input").forEach(function (c) {
      c.checked = tiers.indexOf(c.value) > -1;
    });

    updatePreview();
  }

  function bindField(inputId, key, transform) {
    DV3.byId(inputId).addEventListener("input", function () {
      if (!current) return;
      var v = DV3.byId(inputId).value;
      current[key] = transform ? transform(v) : v;
      if (key === "title") renderListTitles();
      if (key === "body") updatePreview();
      saveDraft();
    });
  }

  // 只更新清單標題文字(不重建整個清單，避免輸入時失焦)
  function renderListTitles() {
    var items = DV3.byId("glist").querySelectorAll(".glist-item .gi-title");
    var titles = model.guides.map(function (g) { return g.title || "(未命名)"; });
    for (var i = 0; i < items.length && i < titles.length; i++) {
      items[i].textContent = titles[i];
    }
  }

  /* ---------- 即時預覽 ---------- */
  var pvTimer;
  function updatePreview() {
    clearTimeout(pvTimer);
    pvTimer = setTimeout(function () {
      DV3.byId("preview").innerHTML = DV3.renderMarkdown(DV3.byId("f-body").value || "");
    }, 150);
  }

  /* ---------- 新增 ---------- */
  function newGuide() {
    var g = {
      id: "",
      title: "未命名攻略",
      tiers: ["無課小課"],
      tags: [],
      summary: "",
      cover: "",
      date: todayStr(),
      body: ""
    };
    model.guides.unshift(g);
    current = g;
    renderList();
    loadToForm();
    saveDraft();
    DV3.byId("f-title").focus();
    DV3.byId("f-title").select();
  }

  /* ---------- Markdown 工具列 ---------- */
  function insertSnippet(kind) {
    var ta = DV3.byId("f-body");
    if (ta.disabled) { toast("請先選擇或新增一篇攻略"); return; }
    var start = ta.selectionStart, end = ta.selectionEnd;
    var sel = ta.value.slice(start, end);
    var before = ta.value.slice(0, start);
    var after = ta.value.slice(end);
    var insert = "", caret = null;

    switch (kind) {
      case "h2": insert = "\n## " + (sel || "段落標題") + "\n"; break;
      case "h3": insert = "\n### " + (sel || "小標題") + "\n"; break;
      case "bold": insert = "**" + (sel || "重點") + "**"; break;
      case "list": insert = "\n- 項目一\n- 項目二\n- 項目三\n"; break;
      case "table":
        insert = "\n| 項目 | 數值 | 說明 |\n| --- | --- | --- |\n| 範例 | 100 | 說明文字 |\n| 範例 | 200 | 說明文字 |\n";
        break;
      case "img": insert = "![" + (sel || "圖說") + "](assets/img/檔名.png)"; break;
      case "video": insert = "\nhttps://www.youtube.com/watch?v=影片ID\n"; break;
      case "link": insert = "[" + (sel || "連結文字") + "](https://)"; break;
      case "quote": insert = "\n> " + (sel || "提示或重點") + "\n"; break;
    }
    ta.value = before + insert + after;
    ta.focus();
    caret = before.length + insert.length;
    ta.selectionStart = ta.selectionEnd = caret;

    // 同步回資料
    if (current) { current.body = ta.value; saveDraft(); updatePreview(); }
  }

  /* ---------- 匯出 ---------- */
  function tagsFromString(s) {
    return (s || "").split(/[,，]/).map(function (x) { return x.trim(); }).filter(Boolean);
  }

  function ensureIds() {
    var seen = {};
    model.guides.forEach(function (g, i) {
      var id = (g.id || "").trim();
      if (!id) id = DV3.slugify(g.title) || "guide-" + (i + 1);
      var base = id, n = 2;
      while (seen[id]) { id = base + "-" + n; n++; }
      seen[id] = true;
      g.id = id;
    });
  }

  function buildFileText() {
    ensureIds();
    model.site = model.site || {};
    model.site.title = DV3.byId("s-title").value || model.site.title || "Dragon Village 3 攻略";
    model.site.subtitle = DV3.byId("s-subtitle").value || model.site.subtitle || "";
    model.site.updated = todayStr();

    var header =
      "/* =============================================================\n" +
      " * 攻略資料檔  (assets/data/guides.js)\n" +
      " * 由「新增/管理」頁面產生。直接覆蓋舊檔即可更新網站。\n" +
      " * 最後更新：" + model.site.updated + "\n" +
      " * ============================================================= */\n\n";
    return header + "window.DV3_DATA = " + JSON.stringify(model, null, 2) + ";\n";
  }

  function download() {
    if (!model.guides.length) { toast("還沒有任何攻略"); return; }
    var text = buildFileText();
    var blob = new Blob([text], { type: "text/javascript;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = "guides.js";
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    saveDraft();
    toast("已下載 guides.js，請上傳覆蓋舊檔");
  }

  function copyText() {
    var text = buildFileText();
    function done() { toast("已複製，可貼到 guides.js"); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); });
    } else { fallbackCopy(text); }
    function fallbackCopy(t) {
      var ta = document.createElement("textarea");
      ta.value = t; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); done(); } catch (e) { toast("複製失敗，請改用下載"); }
      document.body.removeChild(ta);
    }
  }

  /* ---------- 匯入 ---------- */
  function importFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var text = String(reader.result || "");
      var i = text.indexOf("{");
      var j = text.lastIndexOf("}");
      if (i === -1 || j === -1) { toast("檔案格式無法辨識"); return; }
      try {
        var obj = JSON.parse(text.slice(i, j + 1));
        if (!obj.guides) throw new Error("缺少 guides");
        model = { site: obj.site || {}, guides: obj.guides || [] };
        current = model.guides[0] || null;
        syncSiteFields();
        renderList(); loadToForm(); saveDraft();
        toast("已匯入 " + model.guides.length + " 篇");
      } catch (e) { toast("匯入失敗：" + e.message); }
    };
    reader.readAsText(file, "utf-8");
  }

  function syncSiteFields() {
    DV3.byId("s-title").value = model.site.title || "";
    DV3.byId("s-subtitle").value = model.site.subtitle || "";
  }

  /* ---------- 綁定 ---------- */
  function bindAll() {
    bindField("f-title", "title");
    bindField("f-summary", "summary");
    bindField("f-cover", "cover");
    bindField("f-date", "date");
    bindField("f-id", "id");
    bindField("f-tags", "tags", tagsFromString);
    bindField("f-body", "body");

    DV3.byId("btn-new").addEventListener("click", newGuide);
    DV3.byId("btn-download").addEventListener("click", download);
    DV3.byId("btn-copy").addEventListener("click", copyText);
    DV3.byId("btn-reset").addEventListener("click", function () {
      if (!window.confirm("這會捨棄本機暫存，重新讀取目前的 guides.js，確定嗎？")) return;
      try { window.localStorage.removeItem(DRAFT_KEY); } catch (e) {}
      loadFromData();
      current = model.guides[0] || null;
      syncSiteFields(); renderList(); loadToForm();
      toast("已重新讀取資料檔");
    });
    DV3.byId("btn-import").addEventListener("click", function () { DV3.byId("file-input").click(); });
    DV3.byId("file-input").addEventListener("change", function (e) {
      if (e.target.files && e.target.files[0]) importFile(e.target.files[0]);
      e.target.value = "";
    });

    DV3.byId("s-title").addEventListener("input", function () {
      model.site.title = this.value; saveDraft();
    });
    DV3.byId("s-subtitle").addEventListener("input", function () {
      model.site.subtitle = this.value; saveDraft();
    });

    var tb = DV3.byId("toolbar");
    tb.querySelectorAll("[data-md]").forEach(function (btn) {
      btn.addEventListener("click", function () { insertSnippet(btn.getAttribute("data-md")); });
    });
  }

  /* ---------- 啟動 ---------- */
  buildTierChecks();
  var restored = loadDraft();
  if (!restored) loadFromData();
  current = model.guides[0] || null;
  syncSiteFields();
  renderList();
  loadToForm();
  bindAll();
  if (restored) toast("已載入本機暫存的編輯內容");

  DV3.mountFooter();
})();
