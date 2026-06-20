/* =============================================================
 * 龍圖鑑邏輯 (dex.js) — 卡片式
 * 篩選(稀有度/主屬性/類型)、搜尋、排序、勾選比較(含頭像與雷達圖)。
 * 資料：window.DV3_DRAGONS（譯名/技能來自 DV3查詢助手；圖片來自 dv3guide.com；數值來自 Yeng）
 * ============================================================= */
(function () {
  "use strict";
  DV3.mountHeader("dex");
  (function(){
    if(document.getElementById("dex-css")) return;
    var st=document.createElement("style"); st.id="dex-css";
    st.textContent=`
.dex-controls{display:flex;flex-direction:column;gap:13px;margin:8px 0 18px}
.dex-filter-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:center}
.dex-filter-row .label{font-size:12px;letter-spacing:.08em;margin-right:2px}
.dex-count{text-align:center;font-size:14px;margin-bottom:12px}
.dex-count b{font-family:var(--font-display)}
.elem{display:inline-block;font-size:12px;font-weight:700;padding:3px 10px;border-radius:6px;line-height:1.5;white-space:nowrap}
.type-tag{font-size:11.5px;font-weight:600;padding:3px 9px;border-radius:6px;background:rgba(127,127,140,.16);color:var(--text-soft);white-space:nowrap}
.sort-chip .dir{margin-left:4px;font-size:10px}
.dex-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(248px,1fr));gap:16px}
.dragoncard{position:relative;border-radius:var(--radius-lg);padding:16px;display:flex;flex-direction:column;gap:12px;background:rgba(20,17,26,.46);backdrop-filter:blur(18px) saturate(130%);-webkit-backdrop-filter:blur(18px) saturate(130%);border:1px solid rgba(255,255,255,.12);transition:transform .15s ease, box-shadow .2s ease}
html[data-theme="light"] .dragoncard{background:rgba(252,250,245,.66);border-color:rgba(0,0,0,.10)}
.dragoncard:hover{transform:translateY(-3px);box-shadow:var(--shadow-md)}
.dragoncard.sel{outline:2px solid var(--accent);outline-offset:-1px}
.dc-check{position:absolute;top:13px;right:13px;display:flex;align-items:center;gap:5px;font-size:11px;color:var(--text-faint);cursor:pointer;user-select:none}
.dc-check input{width:16px;height:16px;accent-color:var(--accent);cursor:pointer}
.dc-top{display:flex;align-items:center;gap:13px;padding-right:44px}
.dc-portrait{width:78px;height:78px;border-radius:14px;object-fit:cover;background:var(--bg-soft);flex:none;box-shadow:var(--shadow-sm)}
.dc-name{font-family:var(--font-display);font-size:1.1rem;font-weight:700;color:var(--text);display:flex;align-items:center;gap:7px;flex-wrap:wrap;line-height:1.2}
.dc-elems{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-top:8px}
.dc-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px}
.dc-stat{display:flex;flex-direction:column;gap:1px;background:rgba(127,127,140,.12);border-radius:9px;padding:6px 9px}
.dc-stat span{font-size:10.5px;color:var(--text-faint);letter-spacing:.03em}
.dc-stat b{font-size:14.5px;color:var(--text);font-variant-numeric:tabular-nums}
.dc-stat.max{background:rgba(212,173,111,.20)}
.dc-stat.max b{color:var(--primary-ink)}
.dc-foot{display:flex;align-items:baseline;justify-content:space-between;gap:10px;border-top:1px solid var(--hairline);padding-top:11px}
.dc-total{font-size:13px;color:var(--text-soft)}
.dc-total b{font-family:var(--font-display);font-size:1.3rem;color:var(--text);margin-left:5px}
.dc-meta{font-size:11.5px;color:var(--text-faint);text-align:right;line-height:1.5}
.dc-passive{font-size:12px;color:var(--text-soft);cursor:help;border-top:1px solid var(--hairline);padding-top:10px;line-height:1.5}
.dc-passive b{color:var(--primary-ink);font-weight:700;margin-right:6px}
.dc-skill{font-size:12px;color:var(--text-soft);cursor:help;line-height:1.5;margin-top:7px}
.dc-skill b{color:var(--accent);font-weight:700;margin-right:6px}
.compare{border-radius:var(--radius-lg);padding:18px;margin:0 0 18px}
.compare-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;flex-wrap:wrap}
.compare-head h3{margin:0;font-family:var(--font-display);font-size:1.15rem}
.compare-grid{display:grid;grid-template-columns:1fr;gap:18px}
@media(min-width:860px){.compare-grid{grid-template-columns:360px 1fr;align-items:start}}
.radar-box{position:relative;width:100%;max-width:360px;margin:0 auto;aspect-ratio:1/1}
.cmp-table-wrap{overflow-x:auto}
table.cmp{width:100%;border-collapse:collapse;font-size:13.5px}
table.cmp th,table.cmp td{padding:8px 11px;text-align:right;border-bottom:1px solid var(--hairline);white-space:nowrap}
table.cmp th:first-child,table.cmp td:first-child{text-align:left}
table.cmp thead th{color:var(--text);font-weight:700}
table.cmp td.best{color:var(--primary-ink);font-weight:700}
.cmp-portraits{display:flex;flex-wrap:wrap;gap:14px;margin-bottom:14px}
.cmp-card{text-align:center;padding:10px;border-radius:14px;background:rgba(127,127,140,.10)}
.cmp-card img{width:76px;height:76px;border-radius:13px;object-fit:cover;box-shadow:var(--shadow-sm);display:block}
.cmp-card span{display:block;font-size:12.5px;margin-top:5px;font-weight:600}
.cmp-skill{text-align:left}
.cmp-skill b{color:var(--text)}
.cmp-desc{font-size:12px;color:var(--text-soft);font-weight:400;margin-top:3px;line-height:1.5}
.rarity{font-size:11px;font-weight:700;padding:1px 8px;border-radius:5px;white-space:nowrap}
.rarity--legend{color:var(--accent);background:rgba(212,173,111,.18)}
.rarity--hero{color:var(--primary-ink);background:rgba(159,176,192,.18)}
.rarity--rare{color:#7fae8a;background:rgba(127,174,138,.18)}
.chip-x{border:0;background:transparent;color:var(--text-faint);cursor:pointer;font-size:14px;margin-left:4px}
.chip-x:hover{color:#e0556e}
`;
    document.head.appendChild(st);
  })();

  var DATA = (window.DV3_DRAGONS || { meta: {}, list: [] });
  var LIST = DATA.list || [];
  var STATS = (DATA.meta && DATA.meta.stats) || [["hp","生命"],["atk","攻擊"],["def","防禦"],["mag","魔力"],["res","抵抗"],["spd","速度"]];

  var ELEM_COLOR = {
    "火":"#ff6b4a","水":"#3aa0ff","風":"#2fb98a","鋼":"#8a97a6","土":"#c79a2b",
    "雷":"#f4b400","光":"#f0b72e","暗":"#7a5cc7","夢":"#d56bd0","靈魂":"#2fbcbc",
    "黎明":"#ff8fb0","黃昏":"#a86be0","神聖":"#d9b24a","混沌":"#6b6b8f"
  };
  var ELEM_ORDER = ["火","水","風","鋼","土","雷","光","暗","夢","靈魂","黎明","黃昏","神聖","混沌"];
  var TYPES = ["物理","魔法","混合"];
  var RARITY = ["傳說","英雄","稀有"];
  var RARITY_CLS = { "傳說":"legend", "英雄":"hero", "稀有":"rare" };
  var CMP_COLORS = ["#7c5cff","#ff7ac6","#1fb6ac","#f4b400","#3aa0ff","#e0556e"];
  var MAX_CMP = 6;
  var SORTS = [["total","總和"],["hp","生命"],["atk","攻擊"],["def","防禦"],["mag","魔力"],["res","抵抗"],["spd","速度"],["eff","有效總和"],["name","名稱"]];

  function hexRgba(hex, a) { var n = parseInt(hex.slice(1),16); return "rgba("+((n>>16)&255)+","+((n>>8)&255)+","+(n&255)+","+a+")"; }
  function lum(hex){ var n=parseInt(hex.slice(1),16); return 0.299*((n>>16)&255)+0.587*((n>>8)&255)+0.114*(n&255); }
  function elemBadge(name) {
    if (!name || name==="無") return "";
    var c = ELEM_COLOR[name] || "#8a8aa0";
    var fg = lum(c) > 165 ? "#2a2342" : "#fff";
    return '<span class="elem" style="background:'+c+';color:'+fg+'">'+DV3.escapeHtml(name)+"</span>";
  }
  function rarityBadge(r){ return r ? '<span class="rarity rarity--'+(RARITY_CLS[r]||"hero")+'">'+DV3.escapeHtml(r)+'</span>' : ""; }
  function imgTag(d, cls, alt){
    var fb=d.image||"";
    var local=d.code?("assets/img/dragons/"+d.code+".webp"):"";
    var src=local||fb; if(!src) return "";
    var oe=(local&&fb)?" onerror=\"this.onerror=null;this.src='"+fb+"'\"":(fb?"":" onerror=\"this.style.visibility='hidden'\"");
    return '<img class="'+cls+'" loading="lazy" src="'+src+'" alt="'+DV3.escapeHtml(alt||"")+'"'+oe+'>';
  }

  var state = { q:"", rarities:{}, mains:{}, types:{}, sortKey:"total", sortDir:-1, selected:[] };

  function activeKeys(o){ return Object.keys(o).filter(function(k){return o[k];}); }

  function chip(label, on, click){
    var b=document.createElement("button"); b.type="button";
    b.className="chip"+(on?" is-active":""); b.innerHTML=label;
    b.addEventListener("click",click); return b;
  }

  function buildFilters() {
    var rf=DV3.byId("rarity-filter");
    RARITY.forEach(function(r){
      var n=LIST.filter(function(d){return d.rarity===r;}).length; if(!n)return;
      rf.appendChild(chip(rarityBadge(r)+' <span style="opacity:.6">'+n+"</span>", false, function(){
        state.rarities[r]=!state.rarities[r]; this.classList.toggle("is-active"); render();
      }));
    });
    var mf=DV3.byId("main-filter");
    ELEM_ORDER.forEach(function(e){
      var n=LIST.filter(function(d){return d.main===e;}).length; if(!n)return;
      mf.appendChild(chip(elemBadge(e)+' <span style="opacity:.6">'+n+"</span>", false, function(){
        state.mains[e]=!state.mains[e]; this.classList.toggle("is-active"); render();
      }));
    });
    var tf=DV3.byId("type-filter");
    TYPES.forEach(function(t){
      tf.appendChild(chip(t, false, function(){
        state.types[t]=!state.types[t]; this.classList.toggle("is-active"); render();
      }));
    });
  }

  function buildSort(){
    var ctr=document.querySelector(".dex-controls"); if(!ctr) return;
    var host=document.createElement("div"); host.className="dex-filter-row"; host.id="sort-row";
    host.innerHTML='<span class="label">排序</span>';
    SORTS.forEach(function(s){
      var on=state.sortKey===s[0];
      var b=document.createElement("button"); b.type="button"; b.className="chip sort-chip"+(on?" is-active":"");
      b.innerHTML=DV3.escapeHtml(s[1])+(on?'<span class="dir">'+(state.sortDir<0?"▼":"▲")+'</span>':'');
      b.addEventListener("click",function(){
        if(state.sortKey===s[0]) state.sortDir=-state.sortDir;
        else { state.sortKey=s[0]; state.sortDir=(s[0]==="name")?1:-1; }
        buildSort(); render();
      });
      host.appendChild(b);
    });
    var old=DV3.byId("sort-row"); if(old) ctr.replaceChild(host,old); else ctr.appendChild(host);
  }

  function filtered() {
    var rs=activeKeys(state.rarities), mains=activeKeys(state.mains), types=activeKeys(state.types), q=state.q.toLowerCase();
    var r = LIST.filter(function(d){
      if (rs.length && rs.indexOf(d.rarity)<0) return false;
      if (mains.length && mains.indexOf(d.main)<0) return false;
      if (types.length && types.indexOf(d.type)<0) return false;
      if (q){ var hay=(d.name+" "+d.passive+" "+(d.skill||"")+" "+d.main+" "+(d.sub1||"")+" "+(d.sub2||"")).toLowerCase();
              if (hay.indexOf(q)<0) return false; }
      return true;
    });
    var k=state.sortKey, dir=state.sortDir;
    r.sort(function(a,b){
      var va=a[k], vb=b[k];
      if (typeof va==="string"||typeof vb==="string"){ va=(va||"")+""; vb=(vb||"")+""; return va<vb?-dir:va>vb?dir:0; }
      va=va==null?-Infinity:va; vb=vb==null?-Infinity:vb; return (va-vb)*dir;
    });
    return r;
  }

  function cardHtml(d){
    var sel=state.selected.indexOf(d.name)>-1;
    var vals=STATS.map(function(s){return d[s[0]]==null?-Infinity:d[s[0]];});
    var mx=Math.max.apply(null,vals);
    var stats=STATS.map(function(s){ var v=d[s[0]];
      return '<div class="dc-stat'+(v!=null&&v===mx?" max":"")+'"><span>'+s[1]+'</span><b>'+(v==null?"–":v)+"</b></div>"; }).join("");
    var portrait=(d.code||d.image)?imgTag(d,"dc-portrait",d.name):'<img class="dc-portrait" src="assets/img/dragons/dragonslayer.webp" alt="" />';
    var ratio=(d.ratio==null?"–":d.ratio.toFixed(2));
    return '<article class="dragoncard'+(sel?" sel":"")+'" data-name="'+DV3.escapeHtml(d.name)+'">'
      +'<label class="dc-check"><input class="dex-check" type="checkbox" data-name="'+DV3.escapeHtml(d.name)+'"'+(sel?" checked":"")+' />比較</label>'
      +'<div class="dc-top">'+portrait
        +'<div class="dc-id"><div class="dc-name">'+DV3.escapeHtml(d.name)+rarityBadge(d.rarity)+'</div>'
        +'<div class="dc-elems">'+elemBadge(d.main)+elemBadge(d.sub1)+elemBadge(d.sub2)+'<span class="type-tag">'+DV3.escapeHtml(d.type||"–")+'</span></div></div></div>'
      +'<div class="dc-stats">'+stats+'</div>'
      +'<div class="dc-foot"><div class="dc-total">總和<b>'+(d.total==null?"–":d.total)+'</b></div>'
        +'<div class="dc-meta">有效 '+(d.eff==null?"–":d.eff)+'<br>物魔 '+ratio+'</div></div>'
      +'<div class="dc-passive" title="'+DV3.escapeHtml(d.passiveDesc||"")+'"><b>被動</b>'+DV3.escapeHtml(d.passive||"–")+'</div>'
      +'<div class="dc-skill" title="'+DV3.escapeHtml(d.skillDesc||"")+'"><b>必殺</b>'+DV3.escapeHtml(d.skill||"–")+'</div>'
      +'</article>';
  }

  function render() {
    var rows=filtered();
    var grid=DV3.byId("dex-grid"); if(!grid) return;
    grid.innerHTML=rows.map(cardHtml).join("");
    DV3.byId("shown").textContent=rows.length;
    DV3.byId("total").textContent=LIST.length;
    grid.querySelectorAll(".dex-check").forEach(function(cb){
      cb.addEventListener("change",function(){
        var name=cb.getAttribute("data-name");
        if(cb.checked){ if(state.selected.length>=MAX_CMP){cb.checked=false;flashLead("最多比較 "+MAX_CMP+" 隻，請先取消一隻");return;}
          if(state.selected.indexOf(name)<0) state.selected.push(name); }
        else state.selected=state.selected.filter(function(n){return n!==name;});
        var card=cb.closest(".dragoncard"); if(card) card.classList.toggle("sel",cb.checked);
        renderCompare();
      });
    });
  }

  var leadTimer;
  function flashLead(msg){
    var el=DV3.byId("dex-lead"); if(!el) return;
    var old=el.getAttribute("data-old")||el.textContent;
    el.setAttribute("data-old",old); el.textContent=msg; el.style.color="#e0556e";
    clearTimeout(leadTimer); leadTimer=setTimeout(function(){el.textContent=old;el.style.color="";},2500);
  }

  var chart=null;
  function selectedDragons(){ return state.selected.map(function(n){return LIST.filter(function(d){return d.name===n;})[0];}).filter(Boolean); }

  function renderCompare() {
    var box=DV3.byId("compare"), ds=selectedDragons();
    DV3.byId("cmp-count").textContent=ds.length;
    if(!ds.length){ box.style.display="none"; if(chart){chart.destroy();chart=null;} return; }
    box.style.display="";
    DV3.byId("cmp-chips").innerHTML='<div class="cmp-portraits">'+ds.map(function(d,i){
      var im=(d.code||d.image)?imgTag(d,"",d.name):'<div style="font-size:40px">🐲</div>';
      return '<div class="cmp-card">'+im+'<span style="color:'+CMP_COLORS[i]+'">'+DV3.escapeHtml(d.name)+
        ' <button class="chip-x" data-name="'+DV3.escapeHtml(d.name)+'">✕</button></span></div>';
    }).join("")+'</div>';
    DV3.byId("cmp-chips").querySelectorAll(".chip-x").forEach(function(x){
      x.addEventListener("click",function(){ var n=x.getAttribute("data-name");
        state.selected=state.selected.filter(function(z){return z!==n;}); render(); renderCompare(); });
    });
    var statRows=STATS.concat([["total","總和"]]);
    var head="<thead><tr><th>項目</th>"+ds.map(function(d){return "<th>"+DV3.escapeHtml(d.name)+"</th>";}).join("")+"</tr></thead>";
    var body="<tbody>"+statRows.map(function(s){
      var key=s[0], mx=Math.max.apply(null,ds.map(function(d){return d[key]==null?-Infinity:d[key];}));
      return "<tr><td>"+s[1]+"</td>"+ds.map(function(d){return '<td class="'+(d[key]===mx?"best":"")+'">'+(d[key]==null?"–":d[key])+"</td>";}).join("")+"</tr>";
    }).join("")+
    "<tr><td>類型</td>"+ds.map(function(d){return "<td>"+DV3.escapeHtml(d.type||"–")+"</td>";}).join("")+"</tr>"+
    "<tr><td>主屬性</td>"+ds.map(function(d){return "<td>"+elemBadge(d.main)+"</td>";}).join("")+"</tr>"+
    "<tr><td>稀有度</td>"+ds.map(function(d){return "<td>"+rarityBadge(d.rarity)+"</td>";}).join("")+"</tr>"+
    "<tr><td>被動</td>"+ds.map(function(d){return '<td><div class="cmp-skill"><b>'+DV3.escapeHtml(d.passive||"–")+"</b>"+(d.passiveDesc?'<div class="cmp-desc">'+DV3.escapeHtml(d.passiveDesc)+"</div>":"")+"</div></td>";}).join("")+"</tr>"+
    "<tr><td>必殺技</td>"+ds.map(function(d){return '<td><div class="cmp-skill"><b>'+DV3.escapeHtml(d.skill||"–")+"</b>"+(d.skillDesc?'<div class="cmp-desc">'+DV3.escapeHtml(d.skillDesc)+"</div>":"")+"</div></td>";}).join("")+"</tr>"+
    "<tr><td>取得</td>"+ds.map(function(d){return "<td>"+DV3.escapeHtml(d.obtain||"–")+"</td>";}).join("")+"</tr>"+
    "</tbody>";
    DV3.byId("cmp-table").innerHTML=head+body;
    drawRadar(ds);
  }

  function drawRadar(ds) {
    var canvas=DV3.byId("radar");
    if(typeof window.Chart==="undefined"){ canvas.parentNode.style.display="none"; return; }
    canvas.parentNode.style.display="";
    var dark=document.documentElement.getAttribute("data-theme")==="dark";
    var grid=dark?"rgba(255,255,255,0.12)":"rgba(80,50,160,0.14)", tick=dark?"#b6addb":"#645b80";
    var labels=STATS.map(function(s){return s[1];});
    var datasets=ds.map(function(d,i){ var c=CMP_COLORS[i];
      return { label:d.name, data:STATS.map(function(s){return d[s[0]]||0;}), borderColor:c, backgroundColor:hexRgba(c,0.15), pointBackgroundColor:c, borderWidth:2 }; });
    var maxv=Math.max.apply(null,ds.map(function(d){return Math.max(d.hp||0,d.atk||0,d.def||0,d.mag||0,d.res||0,d.spd||0);}));
    if(chart) chart.destroy();
    chart=new window.Chart(canvas,{type:"radar",data:{labels:labels,datasets:datasets},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
        scales:{r:{suggestedMin:500,suggestedMax:Math.ceil((maxv+100)/100)*100,angleLines:{color:grid},grid:{color:grid},
          pointLabels:{color:tick,font:{size:12}},ticks:{color:tick,backdropColor:"transparent",showLabelBackdrop:false,stepSize:300}}}}});
  }

  new MutationObserver(function(){ if(state.selected.length) drawRadar(selectedDragons()); })
    .observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]});

  var sd;
  DV3.byId("dex-search").addEventListener("input",function(e){ clearTimeout(sd); var v=e.target.value.trim(); sd=setTimeout(function(){state.q=v;render();},120); });

  var cc=DV3.byId("cmp-clear"); if(cc) cc.addEventListener("click",function(){ state.selected=[]; render(); renderCompare(); });

  // 啟動：把原本的表格容器換成卡片網格
  (function(){ var tw=document.querySelector(".table-wrap"); if(tw){ var g=document.createElement("div"); g.id="dex-grid"; g.className="dex-grid"; tw.parentNode.replaceChild(g,tw);} })();
  buildFilters(); buildSort(); render(); DV3.mountFooter();
})();
