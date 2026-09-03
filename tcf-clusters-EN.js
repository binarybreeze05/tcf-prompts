/* TCF prompts — English UI variant of tcf-clusters.js. UI strings translated;
   behaviour identical. Reads the same tcf-coverage.js / tcf-similarity.js data
   (which is already in English) and the same meta[name="tcf-set"] key so that
   Done-ticks persist across the FR and EN versions of a pool. */
(function(){
  function init(){
    var meta = document.querySelector('meta[name="tcf-set"]');
    var setKey = meta ? (meta.getAttribute("content") || "").trim() : "";
    var sections = Array.prototype.slice.call(document.querySelectorAll("section.topic"));
    if (!sections.length || !setKey) return;
    var unit = "prompts";

    // Map badge -> section
    var byNum = {};
    sections.forEach(function(s){
      var b = s.querySelector(".badge");
      var n = b ? parseInt((b.textContent||"").trim(), 10) : NaN;
      if (!isNaN(n)) byNum[n] = s;
    });

    // Difficulty order: each item prints its source rank in span.orig — "· was #N"
    var ranked = sections.map(function(s){
      var o = s.querySelector(".orig");
      var d = o ? (o.textContent || "").match(/\d+/g) : null;
      return { el: s, rank: d ? parseInt(d[d.length - 1], 10) : NaN };
    }).filter(function(r){ return !isNaN(r.rank); })
      .sort(function(a, b){ return a.rank - b.rank; });
    var hasDifficulty = (ranked.length === sections.length);

    // Answer-groups: a section may live inside div.tcf-group; the group is the
    // unit that gets moved by every ordering, positioned by its best member.
    function unitOf(s){
      var g = s.parentNode;
      while (g && g !== document.body){
        if (g.classList && g.classList.contains("tcf-group")) return g;
        g = g.parentNode;
      }
      return s;
    }
    var flow = [];
    sections.forEach(function(s){
      var u = unitOf(s);
      if (flow.indexOf(u) < 0) flow.push(u);
    });
    if (!flow.length) return;
    var parent = flow[0].parentNode;
    var wrap = document.createElement("div");
    wrap.id = "tcf-flow";
    parent.insertBefore(wrap, flow[0]);
    flow.forEach(function(el){ wrap.appendChild(el); });
    var original = flow.slice();
    var groups = flow.filter(function(u){ return u.classList.contains("tcf-group"); });
    var placed = {};
    function unitKey(u){ return u.id || ("s-" + (u.querySelector(".badge") || {}).textContent); }
    function placeUnit(s){
      var u = unitOf(s), k = unitKey(u);
      if (placed[k]) return false;
      placed[k] = 1; wrap.appendChild(u); return true;
    }
    function beginPlacing(){ placed = {}; }

    injectStyle();
    var ui = buildToolbar();
    parent.insertBefore(ui.bar, wrap);
    (function(){
      var inBoxes = 0;
      groups.forEach(function(g){ inBoxes += g.querySelectorAll("section.topic").length; });
      var singles = sections.length - inBoxes;
      ui.boxes.textContent = groups.length
        ? (groups.length + " boxes + " + singles + " singles = " + (groups.length + singles) + " answers to prepare")
        : "";
    })();

    var state = { methodId: "default", hideDone: false };

    // --- done marking (per set_key, cross-page) ---------------------------
    var storeKey = "tcf-done:" + setKey;
    var numbered = sections.map(function(s){
      var b = s.querySelector(".badge");
      return { el: s, num: b ? parseInt((b.textContent || "").trim(), 10) : NaN };
    }).filter(function(it){ return !isNaN(it.num); });

    function store(k, v){ try { window.localStorage.setItem(k, v); } catch(e){} }
    function read(k){ try { return window.localStorage.getItem(k); } catch(e){ return null; } }

    var done = (function(){
      var m = {};
      try {
        var arr = JSON.parse(read(storeKey) || "[]");
        if (Array.isArray(arr)) arr.forEach(function(n){ if (byNum[n]) m[n] = 1; });
      } catch(e){}
      return m;
    })();
    state.hideDone = read(storeKey + ":hide") === "1";
    function saveDone(){ store(storeKey, JSON.stringify(Object.keys(done).map(Number))); }

    numbered.forEach(function(it){
      var head = it.el.querySelector(".topic-head");
      if (!head) return;
      var lab = document.createElement("label");
      lab.className = "tcf-done";
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !!done[it.num];
      cb.setAttribute("aria-label", "Mark " + it.num + " as done");
      var txt = document.createElement("span");
      txt.textContent = "Done";
      lab.appendChild(cb); lab.appendChild(txt);
      cb.addEventListener("change", function(){
        if (cb.checked) done[it.num] = 1; else delete done[it.num];
        saveDone(); refreshDone();
      });
      head.appendChild(lab);
    });

    function headAdd(head, node){
      var d = head.querySelector(".tcf-done");
      if (d) head.insertBefore(node, d); else head.appendChild(node);
    }

    // Cross-exam chips: a prompt that shares an answer-box with a TEF item (same
    // prepared response, task format aside) carries "Also in TEF · <section>" —
    // solid when at least one audit pass called it certain, dashed "≈" when only
    // arguable. Data ships in tcf-xref.js (loaded before this file); the chip is
    // permanent so it survives every ordering. Links go to the TEF section page
    // in this page's language; the tooltip lists the counterpart numbers there.
    (function(){
      var X = window.TCF_XREF && setKey ? window.TCF_XREF[setKey] : null;
      if (!X) return;
      var fr = false;
      var SEC = { A:["Speaking A","tef-section-a-practice-order"], B:["Speaking B","tef-section-b-practice-order"], EA:["Writing A","ecrite-section-a-practice-order"], EB:["Writing B","ecrite-section-b-practice-order"] };
      var base = "https://binarybreeze05.github.io/tef-prompts/";
      numbered.forEach(function(it){
        var refs = X[String(it.num)];
        if (!refs || !refs.length) return;
        var head = it.el.querySelector(".topic-head");
        if (!head) return;
        refs.slice(0, 3).forEach(function(r){
          var sec = SEC[r.s]; if (!sec) return;
          var a = document.createElement("a");
          a.className = "tcf-xref " + (r.t === "c" ? "tcf-xref-c" : "tcf-xref-a");
          a.href = base + sec[1] + (fr ? "-FR" : "") + ".html";
          a.target = "_blank"; a.rel = "noopener";
          a.textContent = (r.t === "c" ? "Also in TEF · " : "≈ TEF · ") + sec[0];
          a.title = "TEF " + sec[0] + " · #" + r.n.slice(0, 12).join(", ") + (r.n.length > 12 ? ", … (" + r.n.length + " in all)" : "") + (r.t === "c" ? " — same prepared answer" : " — close, adjust the answer");
          headAdd(head, a);
        });
      });
    })();

    function refreshDone(){
      var total = numbered.length, ndone = 0;
      numbered.forEach(function(it){
        var d = !!done[it.num];
        if (d) ndone++;
        it.el.classList.toggle("tcf-is-done", d);
        var cb = it.el.querySelector(".tcf-done input");
        if (cb && cb.checked !== d) cb.checked = d;
      });
      var left = total - ndone;
      wrap.querySelectorAll(".tcf-link").forEach(function(l){
        l.classList.toggle("tcf-link-broken",
          !!(done[+l.getAttribute("data-a")] || done[+l.getAttribute("data-b")]));
      });
      if (document.body.classList.contains("tcf-mode-similarity")){
        var shownSecs = [];
        wrap.querySelectorAll("section.topic").forEach(function(s){
          if (!(state.hideDone && s.classList.contains("tcf-is-done"))) shownSecs.push(s);
        });
        shownSecs.forEach(function(s, i){
          var chip = s.querySelector(".tcf-simrank");
          if (!chip) return;
          chip.querySelector("b").textContent = "#" + (i + 1);
          chip.querySelector("i").textContent = "of " + shownSecs.length;
        });
      }
      var boxesDone = 0;
      groups.forEach(function(g){
        var secs = g.querySelectorAll("section.topic"), all = secs.length > 0;
        for (var i = 0; i < secs.length; i++){ if (!secs[i].classList.contains("tcf-is-done")){ all = false; break; } }
        g.classList.toggle("tcf-group-alldone", all);
        if (all) boxesDone++;
        var cores = g.querySelectorAll(".tcf-core");
        for (var c = 0; c < cores.length; c++){
          var cs = cores[c].querySelectorAll("section.topic"), cd = cs.length > 0;
          for (var j = 0; j < cs.length; j++){ if (!cs[j].classList.contains("tcf-is-done")){ cd = false; break; } }
          cores[c].classList.toggle("tcf-core-alldone", cd);
        }
        var seams = g.querySelectorAll(".tcf-seam");
        for (var k = 0; k < seams.length; k++){
          var prev = seams[k].previousElementSibling, next = seams[k].nextElementSibling;
          seams[k].classList.toggle("tcf-seam-hidden",
            !!((prev && prev.classList.contains("tcf-core-alldone")) || (next && next.classList.contains("tcf-core-alldone"))));
        }
      });
      document.body.classList.toggle("tcf-hide-done", !!state.hideDone);
      ui.hideCb.checked = !!state.hideDone;
      ui.progFill.style.width = total ? Math.round(ndone / total * 100) + "%" : "0%";
      ui.progText.innerHTML = "";
      if (!ndone){
        ui.progText.textContent = "None done yet · " + total + " " + unit + " to go";
      } else if (!left){
        ui.progText.textContent = "All " + total + " done.";
      } else {
        var b = document.createElement("b");
        b.textContent = left + " left";
        ui.progText.appendChild(document.createTextNode(ndone + " of " + total + " done · "));
        ui.progText.appendChild(b);
      }
      if (groups.length){
        var bd = document.createElement("span");
        bd.className = "tcf-prog-boxes";
        bd.textContent = " · " + boxesDone + "/" + groups.length + " boxes done";
        ui.progText.appendChild(bd);
      }
      ui.progReset.style.visibility = ndone ? "" : "hidden";
    }

    ui.hideCb.addEventListener("change", function(){
      state.hideDone = ui.hideCb.checked;
      store(storeKey + ":hide", state.hideDone ? "1" : "0");
      refreshDone();
    });
    ui.progReset.addEventListener("click", function(){
      var n = Object.keys(done).length;
      if (!n) return;
      if (!window.confirm("Clear the " + n + " Done ticks for this list?")) return;
      done = {}; saveDone(); refreshDone();
    });
    refreshDone();

    ui.select.addEventListener("change", function(){
      state.methodId = ui.select.value;
      if (state.methodId === "coverage" && !window.TCF_COVERAGE) loadCoverage(render);
      else if (state.methodId === "similarity" && !window.TCF_SIMILARITY) loadSimilarity(render);
      else render();
    });

    var loaders = {};
    function loadData(src, global, note, done){
      if (window[global]) return done();
      var L = loaders[src];
      if (L && L.settled) return done();
      ui.desc.textContent = note;
      if (!L){
        L = loaders[src] = { settled:false, queue:[], el:document.createElement("script") };
        var settle = function(){
          L.settled = true;
          var q = L.queue; L.queue = [];
          q.forEach(function(f){ f(); });
        };
        L.el.src = src;
        L.el.setAttribute("data-tcf-data", "1");
        L.el.addEventListener("load", settle);
        L.el.addEventListener("error", settle);
        document.head.appendChild(L.el);
      }
      L.queue.push(done);
    }
    function loadCoverage(done){
      loadData("tcf-coverage.js", "TCF_COVERAGE", "Loading coverage data…", function(){
        if (!window.TCF_COVERAGE) state.coverageFailed = true;
        done();
      });
    }
    function loadSimilarity(done){
      loadData("tcf-similarity.js", "TCF_SIMILARITY", "Loading similarity data…", function(){
        if (!window.TCF_SIMILARITY) state.similarityFailed = true;
        done();
      });
    }

    // Open on similarity by default
    state.methodId = "similarity";
    ui.select.value = "similarity";
    loadSimilarity(function(){
      if (!window.TCF_SIMILARITY || !window.TCF_SIMILARITY[setKey]){
        state.methodId = "default"; ui.select.value = "default";
        render();
        ui.desc.textContent = "Similarity order could not be loaded — practice order shown.";
        return;
      }
      render();
    });

    function clearCoverage(){
      document.body.classList.remove("tcf-mode-coverage");
      wrap.querySelectorAll(".tcf-milestone, .tcf-caps").forEach(function(n){ n.remove(); });
      sections.forEach(function(s){
        s.querySelectorAll(".tcf-cov-note, .tcf-covrank").forEach(function(n){ n.remove(); });
      });
    }
    function clearSimilarity(){
      document.body.classList.remove("tcf-mode-similarity");
      wrap.querySelectorAll(".tcf-link").forEach(function(n){ n.remove(); });
      sections.forEach(function(s){
        s.querySelectorAll(".tcf-simrank").forEach(function(n){ n.remove(); });
      });
    }
    function render(){ paint(); refreshDone(); }
    function paint(){
      if (state.methodId !== "coverage") clearCoverage();
      if (state.methodId !== "similarity") clearSimilarity();
      if (state.methodId === "coverage"){ renderCoverage(); return; }
      if (state.methodId === "similarity"){ renderSimilarity(); return; }
      if (state.methodId === "difficulty"){
        sections.forEach(function(s){ s.style.display=""; });
        beginPlacing();
        ranked.forEach(function(r){ placeUnit(r.el); });
        ui.desc.textContent = "Sequenced by increasing difficulty · rank #1 first. The original number printed on each item is its difficulty rank.";
        ui.summary.textContent = "Difficulty order · " + sections.length + " " + unit;
        return;
      }
      // default = practice order = document order
      sections.forEach(function(s){ s.style.display=""; });
      original.forEach(function(el){ wrap.appendChild(el); });
      ui.summary.textContent = "Practice order (original) · " + sections.length + " " + unit;
      ui.desc.textContent = "";
    }

    function renderCoverage(){
      var pk = window.TCF_COVERAGE && window.TCF_COVERAGE[setKey];
      if (!pk){
        ui.desc.textContent = state.coverageFailed
          ? "Could not load tcf-coverage.js — the other orders remain available."
          : "No coverage data for this list.";
        ui.summary.textContent = "Coverage order unavailable"; return;
      }
      clearCoverage();
      document.body.classList.add("tcf-mode-coverage");
      sections.forEach(function(s){ s.style.display = ""; });

      var milestones = {};
      (pk.milestones || []).forEach(function(ms){ milestones[ms.after_rank] = ms; });
      var total = pk.order.length;

      if (pk.caps && pk.caps.length){
        var caps = document.createElement("div");
        caps.className = "tcf-caps";
        var ch = document.createElement("div");
        ch.className = "tcf-caps-head";
        ch.textContent = "Before anything else — these rules cap your score no matter your level";
        caps.appendChild(ch);
        var cl = document.createElement("ul");
        pk.caps.forEach(function(c){
          var li = document.createElement("li");
          li.innerHTML = String(c)
            .replace(/[<>&]/g, function(m){ return {"<":"&lt;",">":"&gt;","&":"&amp;"}[m]; })
            .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
            .replace(/\*(.+?)\*/g, "<i>$1</i>");
          cl.appendChild(li);
        });
        caps.appendChild(cl);
        wrap.appendChild(caps);
      }

      beginPlacing();
      pk.order.forEach(function(o){
        var s = byNum[o.badge];
        if (!s) return;
        placeUnit(s);
        var head = s.querySelector(".topic-head");
        if (head){
          var chip = document.createElement("span");
          chip.className = "tcf-covrank";
          chip.innerHTML = '<b></b><i></i>';
          chip.querySelector("b").textContent = "#" + o.rank;
          chip.querySelector("i").textContent = "of " + total;
          headAdd(head, chip);
        }
        var note = document.createElement("div");
        note.className = "tcf-cov-note";
        note.innerHTML =
            '<div class="tcf-cov-why"></div>'
          + '<div class="tcf-cov-meters">'
          +   '<span class="tcf-cov-m"><em>Pool covered</em>'
          +     '<span class="tcf-cov-bar"><i></i></span><b></b></span>'
          +   '<span class="tcf-cov-m"><em>Language machinery</em>'
          +     '<span class="tcf-cov-bar tcf-cov-bar-l"><i></i></span><b></b></span>'
          + '</div>';
        note.querySelector(".tcf-cov-why").textContent = o.why || "";
        var meters = note.querySelectorAll(".tcf-cov-m");
        meters[0].querySelector("i").style.width = (o.cum_pool || 0) + "%";
        meters[0].querySelector("b").textContent = (o.cum_pool || 0) + "%";
        meters[1].querySelector("i").style.width = (o.cum_lang || 0) + "%";
        meters[1].querySelector("b").textContent = (o.cum_lang || 0) + "%";
        s.appendChild(note);
        var ms = milestones[o.rank];
        if (ms){
          var band = document.createElement("div");
          band.className = "tcf-milestone";
          band.innerHTML = '<div class="tcf-ms-kicker"><span></span><b></b></div>'
                         + '<div class="tcf-ms-head"></div><p class="tcf-ms-body"></p>';
          band.querySelector(".tcf-ms-kicker span").textContent =
            "After " + o.rank + " prompt" + (o.rank === 1 ? "" : "s") + " · "
            + (o.cum_pool || 0) + "% of the pool covered";
          if (ms.band) band.querySelector(".tcf-ms-kicker b").textContent = ms.band;
          band.querySelector(".tcf-ms-head").textContent = ms.headline || "";
          band.querySelector(".tcf-ms-body").textContent = ms.body || "";
          wrap.appendChild(band);
        }
      });
      ui.desc.textContent = pk.blurb || "";
      ui.summary.textContent = "Coverage order · " + total + " " + unit;
    }

    function renderSimilarity(){
      var pk = window.TCF_SIMILARITY && window.TCF_SIMILARITY[setKey];
      if (!pk){
        ui.desc.textContent = state.similarityFailed
          ? "Could not load tcf-similarity.js — the other orders remain available."
          : "No similarity data for this list.";
        ui.summary.textContent = "Similarity order unavailable"; return;
      }
      clearSimilarity();
      document.body.classList.add("tcf-mode-similarity");
      sections.forEach(function(s){ s.style.display = ""; });
      var total = pk.order.length;
      beginPlacing();
      pk.order.forEach(function(o, i){
        var s = byNum[o.badge];
        if (!s) return;
        placeUnit(s);
        var head = s.querySelector(".topic-head");
        if (head){
          var chip = document.createElement("span");
          chip.className = "tcf-simrank";
          chip.innerHTML = '<b></b><i></i>';
          chip.querySelector("b").textContent = "#" + o.rank;
          chip.querySelector("i").textContent = "of " + total;
          headAdd(head, chip);
        }
        var nxt = pk.order[i + 1];
        var nxtSec = nxt ? byNum[nxt.badge] : null;
        var nxtNew = nxtSec && unitOf(nxtSec) !== unitOf(s) && !placed[unitKey(unitOf(nxtSec))];
        if (o.link && nxt && nxtNew){
          var link = document.createElement("div");
          link.className = "tcf-link";
          link.setAttribute("data-a", o.badge);
          link.setAttribute("data-b", nxt.badge);
          link.innerHTML = '<span></span>';
          link.querySelector("span").textContent = o.link;
          wrap.appendChild(link);
        }
      });
      ui.desc.textContent = pk.blurb || "";
      ui.summary.textContent = "Similarity order · " + total + " " + unit;
    }

    function buildToolbar(){
      var bar = document.createElement("div");
      bar.className = "tcf-clusterbar";
      var row = document.createElement("div"); row.className = "tcf-row";
      var lab = document.createElement("label"); lab.className = "tcf-lab";
      lab.textContent = "Sort by";
      var sel = document.createElement("select"); sel.className = "tcf-select";
      var optSim = document.createElement("option");
      optSim.value = "similarity";
      optSim.textContent = "Similarity (default · each prompt near its nearest neighbour)";
      sel.appendChild(optSim);
      var optCov = document.createElement("option");
      optCov.value = "coverage";
      optCov.textContent = "Coverage (highest-value first, with why)";
      sel.appendChild(optCov);
      var optD = document.createElement("option");
      optD.value = "default";
      optD.textContent = "Practice order (the file's own order)";
      sel.appendChild(optD);
      if (hasDifficulty){
        var optDiff = document.createElement("option");
        optDiff.value = "difficulty"; optDiff.textContent = "Difficulty (rank #1 = easiest)";
        sel.appendChild(optDiff);
      }
      lab.setAttribute("for","tcf-select"); sel.id="tcf-select";
      var summary = document.createElement("span"); summary.className="tcf-summary";
      summary.textContent = "Similarity order · " + sections.length + " " + unit;
      var boxes = document.createElement("span"); boxes.className = "tcf-boxes";
      row.appendChild(lab); row.appendChild(sel); row.appendChild(summary); row.appendChild(boxes);

      var prog = document.createElement("div"); prog.className = "tcf-progress";
      var pbar = document.createElement("span"); pbar.className = "tcf-prog-bar";
      var pfill = document.createElement("i");
      pbar.appendChild(pfill);
      var ptext = document.createElement("span"); ptext.className = "tcf-prog-text";
      var hide = document.createElement("label"); hide.className = "tcf-prog-hide";
      var hideCb = document.createElement("input"); hideCb.type = "checkbox";
      var hideTx = document.createElement("span"); hideTx.textContent = "Hide done";
      hide.appendChild(hideCb); hide.appendChild(hideTx);
      var reset = document.createElement("button");
      reset.type = "button"; reset.className = "tcf-prog-reset"; reset.textContent = "Reset";
      prog.appendChild(pbar); prog.appendChild(ptext);
      prog.appendChild(hide); prog.appendChild(reset);

      var desc = document.createElement("div"); desc.className="tcf-desc";
      bar.appendChild(row); bar.appendChild(prog); bar.appendChild(desc);
      return { bar:bar, select:sel, summary:summary, desc:desc, boxes:boxes,
               progFill:pfill, progText:ptext, progReset:reset, hideCb:hideCb };
    }

    function injectStyle(){
      if (document.getElementById("tcf-cluster-style")) return;
      var css = ""
      + ".tcf-clusterbar{position:sticky;top:0;z-index:50;background:#ffffff;"
      + "border:1px solid var(--line,#e4e7ec);border-radius:12px;padding:.6rem .8rem;margin:0 0 1rem;"
      + "box-shadow:0 2px 10px rgba(16,24,40,.06)}"
      + ".tcf-row{display:flex;align-items:center;gap:.55rem;flex-wrap:wrap}"
      + ".tcf-lab{font-weight:700;font-size:.85rem;color:var(--ink,#1f2328)}"
      + ".tcf-select{font:inherit;font-size:.9rem;padding:.3rem .5rem;border:1px solid var(--line,#e4e7ec);"
      + "border-radius:8px;background:#fff;color:var(--ink,#1f2328);max-width:100%}"
      + ".tcf-summary{font-size:.83rem;color:var(--muted,#5b6470);margin-left:auto}"
      + ".tcf-boxes{flex:0 0 100%;font-size:.83rem;color:#111827;font-weight:600;margin-top:.15rem}"
      + ".tcf-boxes:empty{display:none}"
      + ".tcf-prog-boxes{margin-left:.35rem;color:#111827}"
      + ".tcf-xref{flex:none;display:inline-flex;align-items:center;font-size:.72rem;line-height:1.4;"
      + "border-radius:999px;padding:.1rem .55rem;margin-left:.35rem;text-decoration:none;white-space:nowrap}"
      + ".tcf-xref-c{background:#f3e8ff;color:#5b21b6;border:1px solid #d8b4fe;font-weight:600}"
      + ".tcf-xref-a{background:#faf5ff;color:#7c3aed;border:1px dashed #d8b4fe}"
      + ".tcf-xref:hover{border-color:#7c3aed}"
      + ".tcf-desc{font-size:.83rem;color:var(--muted,#5b6470);margin:.35rem 0 0}"
      + ".tcf-desc:empty{display:none}"

      + ".tcf-covrank{margin-left:auto;flex:none;display:inline-flex;align-items:baseline;gap:.3rem;"
      + "background:#111827;color:#fff;border-radius:999px;padding:.15rem .6rem;white-space:nowrap}"
      + ".tcf-covrank b{font-size:.9rem;font-weight:700}"
      + ".tcf-covrank i{font-style:normal;font-size:.68rem;opacity:.75}"
      + ".tcf-cov-note{margin:.9rem 0 0;padding:.7rem .85rem;border-radius:10px;"
      + "background:#f6f8fb;border:1px solid var(--line,#e4e7ec)}"
      + ".tcf-cov-why{font-size:.9rem;color:#344054;line-height:1.55}"
      + ".tcf-cov-meters{display:flex;flex-wrap:wrap;gap:.4rem 1.4rem;margin:.6rem 0 0}"
      + ".tcf-cov-m{display:flex;align-items:center;gap:.45rem;font-size:.74rem;color:var(--muted,#5b6470)}"
      + ".tcf-cov-m em{font-style:normal;text-transform:uppercase;letter-spacing:.05em;font-weight:600}"
      + ".tcf-cov-m b{font-size:.78rem;color:var(--ink,#1f2328);min-width:2.2rem}"
      + ".tcf-cov-bar{display:block;width:88px;height:6px;border-radius:999px;background:#dfe4ec;overflow:hidden}"
      + ".tcf-cov-bar i{display:block;height:100%;background:var(--accent,#2563eb)}"
      + ".tcf-cov-bar-l i{background:#b4341f}"
      + ".tcf-caps{margin:.2rem 0 1.4rem;padding:.8rem 1rem;border-radius:12px;"
      + "background:#fdf3f1;border:1px solid #f0cfc7;border-left:3px solid var(--obj,#b4341f)}"
      + ".tcf-caps-head{font-weight:700;font-size:.86rem;color:var(--obj,#b4341f);margin-bottom:.4rem}"
      + ".tcf-caps ul{margin:0;padding-left:1.1rem}"
      + ".tcf-caps li{font-size:.86rem;line-height:1.55;color:#4a3a36;margin:.25rem 0}"
      + ".tcf-caps li b{color:#7a2415}"
      + ".tcf-milestone{margin:1.8rem 0 .4rem;padding:.85rem 1.1rem;border-radius:12px;"
      + "background:#111827;color:#fff}"
      + ".tcf-ms-kicker{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;"
      + "text-transform:uppercase;letter-spacing:.07em;font-size:.66rem;margin-bottom:.3rem}"
      + ".tcf-ms-kicker span{opacity:.7}"
      + ".tcf-ms-kicker b{letter-spacing:.04em;background:#0f7a44;color:#fff;border-radius:999px;"
      + "padding:.1rem .55rem;font-size:.68rem}"
      + ".tcf-ms-kicker b:empty{display:none}"
      + ".tcf-ms-head{font-weight:700;font-size:1.02rem;line-height:1.35}"
      + ".tcf-ms-body{margin:.45rem 0 0;font-size:.87rem;line-height:1.6;opacity:.92}"

      + ".tcf-simrank{margin-left:auto;flex:none;display:inline-flex;align-items:baseline;gap:.3rem;"
      + "background:#f6f8fb;color:#344054;border:1px solid var(--line,#e4e7ec);border-radius:999px;"
      + "padding:.15rem .6rem;white-space:nowrap}"
      + ".tcf-simrank b{font-size:.9rem;font-weight:700}"
      + ".tcf-simrank i{font-style:normal;font-size:.68rem;opacity:.7}"
      + ".tcf-link{display:flex;align-items:center;gap:.55rem;margin:.4rem 0}"
      + ".tcf-link::before,.tcf-link::after{content:'';height:1px;flex:1 1 0;"
      + "background:var(--line,#e4e7ec)}"
      + ".tcf-link span{flex:0 1 auto;max-width:70%;text-align:center;font-size:.74rem;"
      + "line-height:1.45;color:var(--muted,#5b6470);background:#f6f8fb;"
      + "border:1px solid var(--line,#e4e7ec);border-radius:999px;padding:.12rem .7rem}"
      + ".tcf-mode-similarity #tcf-flow > section.topic,.tcf-mode-similarity #tcf-flow > .tcf-group{margin:.6rem 0}"
      + "body.tcf-hide-done .tcf-group-alldone{display:none!important}"
      + "body.tcf-hide-done .tcf-seam-hidden{display:none}"

      + ".topic-head .prompt{flex:1 1 auto}"
      + ".tcf-done{flex:none;display:inline-flex;align-items:center;gap:.32rem;cursor:pointer;"
      + "font-size:.75rem;color:var(--muted,#5b6470);border:1px solid var(--line,#e4e7ec);"
      + "background:#fff;border-radius:999px;padding:.12rem .55rem;margin-left:.45rem;"
      + "white-space:nowrap;user-select:none}"
      + ".tcf-done:hover{border-color:var(--reb,#0f7a44)}"
      + ".tcf-done input{margin:0;cursor:pointer;accent-color:var(--reb,#0f7a44)}"
      + ".tcf-is-done{opacity:.55}"
      + ".tcf-is-done .tcf-done{background:#e8f5ee;border-color:#cbe7d8;color:#0f7a44;font-weight:600}"
      + "body.tcf-hide-done .tcf-is-done{display:none!important}"
      + "body.tcf-hide-done .tcf-link-broken{display:none}"
      + ".tcf-progress{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin:.5rem 0 0}"
      + ".tcf-prog-bar{display:block;flex:0 1 150px;height:7px;border-radius:999px;"
      + "background:#dfe4ec;overflow:hidden}"
      + ".tcf-prog-bar i{display:block;height:100%;width:0;background:var(--reb,#0f7a44);"
      + "transition:width .18s ease}"
      + ".tcf-prog-text{font-size:.8rem;color:var(--muted,#5b6470)}"
      + ".tcf-prog-text b{color:var(--reb,#0f7a44);font-size:.83rem}"
      + ".tcf-prog-hide,.tcf-prog-reset{font:inherit;font-size:.76rem;cursor:pointer;"
      + "color:var(--muted,#5b6470);display:inline-flex;align-items:center;gap:.3rem;"
      + "border:1px solid var(--line,#e4e7ec);background:#f6f8fb;border-radius:999px;"
      + "padding:.12rem .6rem;user-select:none}"
      + ".tcf-prog-hide{margin-left:auto}"
      + ".tcf-prog-hide input{margin:0;cursor:pointer;accent-color:var(--accent,#2563eb)}"
      + ".tcf-prog-hide:hover,.tcf-prog-reset:hover{border-color:var(--accent,#2563eb)}"
      + ".tcf-prog-reset:hover{border-color:var(--obj,#b4341f);color:var(--obj,#b4341f)}"
      + "@media (max-width:520px){.tcf-cov-bar{width:56px}.tcf-link span{max-width:80%}}"
      + "@media print{.tcf-clusterbar{position:static}.tcf-progress{display:none}}";
      var st = document.createElement("style");
      st.id = "tcf-cluster-style"; st.textContent = css;
      document.head.appendChild(st);
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
