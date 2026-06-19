/* =============================================================
 * 龍圖鑑邏輯 (dex.js)
 * 篩選、排序、勾選比較(含雷達圖)。資料來源：window.DV3_DRAGONS
 * ============================================================= */
(function () {
  "use strict";
  DV3.mountHeader("dex");

  var DATA = (window.DV3_DRAGONS || { meta: {}, list: [] });
  var LIST = DATA.list || [];
  var STATS = (DATA.meta && DATA.meta.stats) || [["hp","生命"],["atk","攻擊"],["def","防禦"],["mag","魔力"],["res","抵抗"],["spd","速度"]];

  // 屬性顏色
  var ELEM_COLOR = {
    "火":"#ff6b4a","水":"#3aa0ff","風":"#2fb98a","鋼":"#8a97a6","土":"#c79a2b",
    "雷":"#f4b400","光":"#f0b72e","暗":"#7a5cc7","夢":"#d56bd0","靈魂":"#2fbcbc",
    "黎明":"#ff8fb0","黃昏":"#a86be0","神聖":"#d9b24a","混沌":"#6b6b8f"
  };
  var ELEM_ORDER = ["火","水","風","鋼","土","雷","光","暗","夢","靈魂","黎明","黃昏","神聖","混沌"];
  var TYPES = ["物理","魔法","混合"];
  var CMP_COLORS = ["#7c5cff","#ff7ac6","#1fb6ac","#f4b400","#3aa0ff","#e0556e"];
  var MAX_CMP = 6;

  function hexRgba(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return "rgba(" + ((n>>16)&255) + "," + ((n>>8)&255) + "," + (n&255) + "," + a + ")";
  }
  function lum(hex){ var n=parseInt(hex.slice(1),16); return (0.299*((n>>16)&255)+0.587*((n>>8)&255)+0.114*(n&255)); }
  function elemBadge(name) {
    if (!name) return "";
    var c = ELEM_COLOR[name] || "#8a8aa0";
    var fg = lum(c) > 165 ? "#2a2342" : "#fff";
    return '<span class="elem" style="background:' + c + ';color:' + fg + '">' + DV3.escapeHtml(name) + "</span>";
  }

  var state = {
    q: "",
    mains: {},   // 主屬性集合
    types: {},
    sortKey: "total",
    sortDir: -1, // -1 降序, 1 升序
    selected: [] // 已選龍名(依勾選順序)
  };

  var COLS = [
    { key:"check" },
    { key:"name",    label:"龍名",   txt:true, sort:"str", pin:true },
    { key:"main",    label:"主屬性", txt:true, sort:"str" },
    { key:"subs",    label:"副屬性", txt:true },
    { key:"hp",      label:"生命",   sort:"num", best:true },
    { key:"atk",     label:"攻擊",   sort:"num", best:true },
    { key:"def",     label:"防禦",   sort:"num", best:true },
    { key:"mag",     label:"魔力",   sort:"num", best:true },
    { key:"res",     label:"抵抗",   sort:"num", best:true },
    { key:"spd",     label:"速度",   sort:"num", best:true },
    { key:"total",   label:"總和",   sort:"num", best:true },
    { key:"eff",     label:"有效總和", sort:"num" },
    { key:"ratio",   label:"物魔比", sort:"num" },
    { key:"type",    label:"類型",   txt:true, sort:"str" },
    { key:"passive", label:"被動",   txt:true, sort:"str" }
  ];

  /* ---------- 篩選器 ---------- */
  function buildFilters() {
    var mf = DV3.byId("main-filter");
    ELEM_ORDER.forEach(function (e) {
      var n = LIST.filter(function (d){ return d.main === e; }).length;
      if (!n) return;
      var b = document.createElement("button");
      b.className = "chip"; b.type = "button";
      b.innerHTML = elemBadge(e) + ' <span style="opacity:.6">' + n + "</span>";
      b.addEventListener("click", function () {
        state.mains[e] = !state.mains[e]; b.classList.toggle("is-active");
        render();
      });
      mf.appendChild(b);
    });
    var tf = DV3.byId("type-filter");
    TYPES.forEach(function (t) {
      var b = document.createElement("button");
      b.className = "chip"; b.type = "button"; b.textContent = t;
      b.addEventListener("click", function () {
        state.types[t] = !state.types[t]; b.classList.toggle("is-active");
        render();
      });
      tf.appendChild(b);
    });
  }

  /* ---------- 篩選 + 排序 ---------- */
  function activeKeys(obj){ return Object.keys(obj).filter(function(k){return obj[k];}); }

  function filtered() {
    var mains = activeKeys(state.mains), types = activeKeys(state.types), q = state.q.toLowerCase();
    var r = LIST.filter(function (d) {
      if (mains.length && mains.indexOf(d.main) < 0) return false;
      if (types.length && types.indexOf(d.type) < 0) return false;
      if (q) {
        var hay = (d.name + " " + d.passive + " " + d.main + " " + (d.sub1||"") + " " + (d.sub2||"")).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
    var k = state.sortKey, dir = state.sortDir;
    r.sort(function (a, b) {
      var va = a[k], vb = b[k];
      if (typeof va === "string" || typeof vb === "string") {
        va = (va||"")+""; vb = (vb||"")+"";
        return va < vb ? -dir : va > vb ? dir : 0;
      }
      va = va == null ? -Infinity : va; vb = vb == null ? -Infinity : vb;
      return (va - vb) * dir;
    });
    return r;
  }

  /* ---------- 表格 ---------- */
  function headerHtml() {
    var ths = COLS.map(function (c) {
      if (c.key === "check") return '<th class="col-pin" style="width:34px"></th>';
      var cls = (c.txt ? "txt " : "") + (c.sort ? "sortable " : "") + (c.pin ? "col-pin " : "") + (state.sortKey===c.key?"active":"");
      var arr = c.sort ? '<span class="arr">' + (state.sortKey===c.key ? (state.sortDir<0?"▼":"▲") : "▼") + "</span>" : "";
      return '<th class="' + cls.trim() + '" data-key="' + c.key + '">' + c.label + arr + "</th>";
    }).join("");
    return "<thead><tr>" + ths + "</tr></thead>";
  }

  function bodyHtml(rows) {
    // 各數值欄最大值(用於 best 標記)
    var best = {};
    COLS.forEach(function (c) {
      if (c.best) best[c.key] = Math.max.apply(null, rows.map(function (d){ return d[c.key]==null?-Infinity:d[c.key]; }));
    });
    var trs = rows.map(function (d) {
      var sel = state.selected.indexOf(d.name) > -1;
      var tds = COLS.map(function (c) {
        if (c.key === "check")
          return '<td class="col-pin"><input class="dex-check" type="checkbox" data-name="' + DV3.escapeHtml(d.name) + '"' + (sel?" checked":"") + " /></td>";
        if (c.key === "name") return '<td class="txt name col-pin">' + DV3.escapeHtml(d.name) + "</td>";
        if (c.key === "main") return '<td class="txt">' + elemBadge(d.main) + "</td>";
        if (c.key === "subs") return '<td class="txt">' + elemBadge(d.sub1) + elemBadge(d.sub2) + "</td>";
        if (c.key === "type") return '<td class="txt"><span class="type-tag">' + DV3.escapeHtml(d.type) + "</span></td>";
        if (c.key === "passive") return '<td class="txt passive">' + DV3.escapeHtml(d.passive) + "</td>";
        if (c.key === "ratio") return '<td class="num">' + (d.ratio==null?"–":d.ratio.toFixed(2)) + "</td>";
        var v = d[c.key];
        var isBest = c.best && v === best[c.key] && v > -Infinity;
        return '<td class="num' + (isBest?" best":"") + '">' + (v==null?"–":v) + "</td>";
      }).join("");
      return '<tr class="' + (sel?"sel":"") + '">' + tds + "</tr>";
    }).join("");
    return "<tbody>" + trs + "</tbody>";
  }

  function render() {
    var rows = filtered();
    var t = DV3.byId("dex-table");
    t.innerHTML = headerHtml() + bodyHtml(rows);
    DV3.byId("shown").textContent = rows.length;
    DV3.byId("total").textContent = LIST.length;

    // 排序事件
    t.querySelectorAll("thead th.sortable").forEach(function (th) {
      th.addEventListener("click", function () {
        var k = th.getAttribute("data-key");
        var col = COLS.filter(function(c){return c.key===k;})[0];
        if (state.sortKey === k) state.sortDir = -state.sortDir;
        else { state.sortKey = k; state.sortDir = (col.sort === "num") ? -1 : 1; }
        render();
      });
    });
    // 勾選事件
    t.querySelectorAll(".dex-check").forEach(function (cb) {
      cb.addEventListener("change", function () {
        var name = cb.getAttribute("data-name");
        if (cb.checked) {
          if (state.selected.length >= MAX_CMP) { cb.checked = false; flashLead("最多比較 " + MAX_CMP + " 隻，請先取消一隻"); return; }
          if (state.selected.indexOf(name) < 0) state.selected.push(name);
        } else {
          state.selected = state.selected.filter(function (n){ return n !== name; });
        }
        cb.closest("tr").classList.toggle("sel", cb.checked);
        renderCompare();
      });
    });
  }

  var leadTimer;
  function flashLead(msg) {
    var el = DV3.byId("dex-lead"); var old = el.getAttribute("data-old") || el.textContent;
    el.setAttribute("data-old", old); el.textContent = msg; el.style.color = "#e0556e";
    clearTimeout(leadTimer);
    leadTimer = setTimeout(function(){ el.textContent = old; el.style.color = ""; }, 2500);
  }

  /* ---------- 比較面板 ---------- */
  var chart = null;
  function selectedDragons(){ return state.selected.map(function(n){ return LIST.filter(function(d){return d.name===n;})[0]; }).filter(Boolean); }

  function renderCompare() {
    var box = DV3.byId("compare");
    var ds = selectedDragons();
    DV3.byId("cmp-count").textContent = ds.length;
    if (!ds.length) { box.style.display = "none"; if (chart){ chart.destroy(); chart = null; } return; }
    box.style.display = "";

    // chips
    DV3.byId("cmp-chips").innerHTML = ds.map(function (d, i) {
      return '<span class="chip is-active" style="border-color:' + CMP_COLORS[i] + '">' +
        '<span style="color:' + CMP_COLORS[i] + ';font-weight:700">●</span> ' + DV3.escapeHtml(d.name) +
        ' <button class="chip-x" data-name="' + DV3.escapeHtml(d.name) + '">✕</button></span>';
    }).join(" ");
    DV3.byId("cmp-chips").querySelectorAll(".chip-x").forEach(function (x) {
      x.addEventListener("click", function () {
        var name = x.getAttribute("data-name");
        state.selected = state.selected.filter(function (n){ return n !== name; });
        render(); renderCompare();
      });
    });

    // 比較表(每列一項數值，標出最高)
    var rowsDef = STATS.concat([["total","總和"]]);
    var head = "<thead><tr><th>數值</th>" + ds.map(function(d){return "<th>"+DV3.escapeHtml(d.name)+"</th>";}).join("") + "</tr></thead>";
    var body = "<tbody>" + rowsDef.map(function (s) {
      var key = s[0], label = s[1];
      var mx = Math.max.apply(null, ds.map(function(d){return d[key];}));
      return "<tr><td>" + label + "</td>" + ds.map(function (d) {
        return '<td class="' + (d[key]===mx?"best":"") + '">' + d[key] + "</td>";
      }).join("") + "</tr>";
    }).join("") +
    "<tr><td>類型</td>" + ds.map(function(d){return "<td>"+DV3.escapeHtml(d.type)+"</td>";}).join("") + "</tr>" +
    "<tr><td>主屬性</td>" + ds.map(function(d){return "<td>"+elemBadge(d.main)+"</td>";}).join("") + "</tr>" +
    "</tbody>";
    DV3.byId("cmp-table").innerHTML = head + body;

    drawRadar(ds);
  }

  function drawRadar(ds) {
    var canvas = DV3.byId("radar");
    if (typeof window.Chart === "undefined") { canvas.parentNode.style.display = "none"; return; }
    canvas.parentNode.style.display = "";
    var dark = document.documentElement.getAttribute("data-theme") === "dark";
    var grid = dark ? "rgba(255,255,255,0.12)" : "rgba(80,50,160,0.12)";
    var tick = dark ? "#b6addb" : "#645b80";
    var labels = STATS.map(function(s){return s[1];});
    var datasets = ds.map(function (d, i) {
      var c = CMP_COLORS[i];
      return { label: d.name, data: STATS.map(function(s){return d[s[0]];}),
        borderColor: c, backgroundColor: hexRgba(c, 0.15), pointBackgroundColor: c, borderWidth: 2 };
    });
    var maxv = Math.max.apply(null, ds.map(function(d){ return Math.max(d.hp,d.atk,d.def,d.mag,d.res,d.spd); }));
    if (chart) chart.destroy();
    chart = new window.Chart(canvas, {
      type: "radar",
      data: { labels: labels, datasets: datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { r: {
          suggestedMin: 500, suggestedMax: Math.ceil((maxv+100)/100)*100,
          angleLines: { color: grid }, grid: { color: grid },
          pointLabels: { color: tick, font: { size: 12 } },
          ticks: { color: tick, backdropColor: "transparent", showLabelBackdrop: false, stepSize: 300 }
        } }
      }
    });
  }

  // 暗/亮切換時重畫雷達圖
  new MutationObserver(function () { if (state.selected.length) drawRadar(selectedDragons()); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  /* ---------- 搜尋 ---------- */
  var sd;
  DV3.byId("dex-search").addEventListener("input", function (e) {
    clearTimeout(sd); var v = e.target.value.trim();
    sd = setTimeout(function(){ state.q = v; render(); }, 120);
  });

  /* ---------- 啟動 ---------- */
  buildFilters();
  render();
  DV3.mountFooter();
})();
