(function () {
  "use strict";

  var TRIMS = {
    "6x9": [6, 9, "6 × 9 in · most fiction and memoir"],
    "5.5x8.5": [5.5, 8.5, "5.5 × 8.5 in · digest, poetry, novellas"],
    "5x8": [5, 8, "5 × 8 in · pocket fiction"],
    "5.25x8": [5.25, 8, "5.25 × 8 in · trade fiction"],
    "7x10": [7, 10, "7 × 10 in · workbooks and manuals"],
    "8.5x11": [8.5, 11, "8.5 × 11 in · letter, planners, kids"],
    "8x10": [8, 10, "8 × 10 in · children's picture books"]
  };
  var PAPER = { white: 0.002252, cream: 0.0025 };
  var BLEED = 0.125;

  function spineWidth(pages, paper) {
    var p = parseFloat(pages) || 0;
    return p * (PAPER[paper] || PAPER.white);
  }

  function dims(trimKey, pages, paper) {
    var t = TRIMS[trimKey] || TRIMS["6x9"];
    var spine = spineWidth(pages, paper);
    return {
      trimW: t[0], trimH: t[1], spine: spine,
      fullW: t[0] * 2 + spine + BLEED * 2,
      fullH: t[1] + BLEED * 2
    };
  }

  function fmt(n, d) { return (Math.round(n * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d); }

  /* ---------- minimal PDF writer with one JPEG image ---------- */
  function jpegPdf(jpegBytes, widthPx, heightPx, pageWpt, pageHpt) {
    var enc = new TextEncoder();
    var chunks = [];
    var offsets = [];
    var pos = 0;
    function push(data) {
      var b = typeof data === "string" ? enc.encode(data) : data;
      chunks.push(b); pos += b.length;
    }
    function obj(n, body, stream) {
      offsets[n] = pos;
      push(n + " 0 obj\n" + body + "\n");
      if (stream) {
        push("stream\n"); push(stream); push("\nendstream\n");
      }
      push("endobj\n");
    }
    push("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n");
    obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
    obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    obj(3, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + fmt(pageWpt, 2) + " " + fmt(pageHpt, 2) +
      "] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>");
    // image object with raw JPEG stream
    offsets[4] = pos;
    push("4 0 obj\n<< /Type /XObject /Subtype /Image /Width " + widthPx + " /Height " + heightPx +
      " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " + jpegBytes.length + " >>\nstream\n");
    push(jpegBytes); push("\nendstream\nendobj\n");
    var content = "q\n" + fmt(pageWpt, 2) + " 0 0 " + fmt(pageHpt, 2) + " 0 0 cm\n/Im0 Do\nQ";
    obj(5, "<< /Length " + content.length + " >>", content);
    var xref = pos;
    push("xref\n0 6\n0000000000 65535 f \n");
    for (var i = 1; i <= 5; i++) {
      var o = "" + offsets[i];
      while (o.length < 10) o = "0" + o;
      push(o + " 00000 n \n");
    }
    push("trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF\n");
    var total = 0; chunks.forEach(function (c) { total += c.length; });
    var out = new Uint8Array(total), off = 0;
    chunks.forEach(function (c) { out.set(c, off); off += c.length; });
    return new Blob([out], { type: "application/pdf" });
  }

  /* ---------- generator ---------- */
  function initGenerator() {
    var root = document.getElementById("cover-tool");
    if (!root) return;
    var canvas = document.getElementById("cover-canvas");
    var ctx = canvas.getContext("2d");
    var $ = function (id) { return document.getElementById(id); };

    var els = {
      title: $("f-title"), subtitle: $("f-subtitle"), author: $("f-author"),
      trim: $("f-trim"), pages: $("f-pages"), paper: $("f-paper"),
      bg: $("f-bg"), fg: $("f-fg"), accent: $("f-accent"),
      font: $("f-font"), image: $("f-image"), guides: $("f-guides"),
      spineText: $("f-spine-text"),
      fullW: $("r-fullw"), fullH: $("r-fullh"), spineOut: $("r-spine"),
      px: $("r-px"), pngBtn: $("btn-png"), pdfBtn: $("btn-pdf"), resetBtn: $("btn-reset")
    };
    var uploaded = null;
    var crop = { x: 0.5, y: 0.5, z: 1 };
    var statusEl = document.getElementById("tool-status");
    var statusTimer = null;

    function setStatus(msg, isError) {
      if (!statusEl) return;
      statusEl.hidden = false;
      statusEl.textContent = msg;
      statusEl.classList.toggle("is-error", !!isError);
      clearTimeout(statusTimer);
      statusTimer = setTimeout(function () { statusEl.hidden = true; }, 8000);
    }

    function clearStatus() {
      if (!statusEl) return;
      clearTimeout(statusTimer);
      statusEl.hidden = true;
      statusEl.textContent = "";
    }


    function hexLum(hex) {
      var h = (hex || "#000000").replace("#", "");
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      var v = [0, 2, 4].map(function (i) {
        var c = parseInt(h.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
    }

    function contrastRatio(a, b) {
      var l1 = hexLum(a), l2 = hexLum(b);
      var hi = Math.max(l1, l2), lo = Math.min(l1, l2);
      return (hi + 0.05) / (lo + 0.05);
    }

    function runPreflight(st, d) {
      var list = document.getElementById("preflight-list");
      if (!list) return;
      var rows = [];
      var probe = document.createElement("canvas").getContext("2d");
      var size = fitFont(probe, st.title, st.font, d.trimW * 0.84, d.trimH * 0.16, d.trimH * 0.085);
      probe.font = "700 " + size + "px " + st.font;
      var lines = wrapText(probe, st.title, d.trimW * 0.84, 3);
      var truncated = lines.length > 0 && /…$/.test(lines[lines.length - 1]);
      if (truncated) rows.push({ cls: "bad", txt: "Title is truncated on the front cover.", fix: "edit-title", label: "Edit" });
      else rows.push({ cls: "ok", txt: "Title fits the front cover." });

      var c = contrastRatio(st.fg, st.bg);
      if (c < 4.5) rows.push({ cls: "warn", txt: "Text contrast is " + c.toFixed(1) + ":1. Aim for 4.5:1.", fix: "fix-contrast", label: "Fix" });
      else rows.push({ cls: "ok", txt: "Text contrast is " + c.toFixed(1) + ":1." });

      var ac = contrastRatio(st.accent, st.bg);
      if (ac < 3) rows.push({ cls: "warn", txt: "Author line contrast is " + ac.toFixed(1) + ":1.", fix: "fix-author", label: "Fix" });

      if (uploaded) {
        var base = Math.max(d.trimW / uploaded.width, d.trimH / uploaded.height) * crop.z;
        var dpi = 1 / base;
        if (dpi < 300) {
          rows.push({
            cls: "warn",
            txt: "Image resolves to about " + Math.round(dpi) + " DPI. Use at least " +
              Math.ceil(d.trimW * 300) + " × " + Math.ceil(d.trimH * 300) + " px.",
            fix: crop.z > 1 ? "reset-crop" : null,
            label: "Fit image"
          });
        } else {
          rows.push({ cls: "ok", txt: "Image resolves to " + Math.round(dpi) + " DPI at this crop." });
        }
      }

      if (st.spineText) {
        if (d.spine < 0.25) rows.push({ cls: "warn", txt: "Spine is " + fmt(d.spine, 3) + " in; spine text will be cramped.", fix: "spine-off", label: "Turn off" });
        else rows.push({ cls: "ok", txt: "Spine text fits a " + fmt(d.spine, 3) + " in spine." });
      }

      list.innerHTML = rows.map(function (r) {
        return '<li><span class="dot ' + r.cls + '"></span><span class="txt">' + r.txt + '</span>' +
          (r.fix ? '<button type="button" data-fix="' + r.fix + '">' + r.label + '</button>' : '') + '</li>';
      }).join("");
    }

    function current() {
      return {
        trim: els.trim.value, pages: Math.max(24, Math.min(828, parseInt(els.pages.value, 10) || 0)),
        paper: els.paper.value, title: els.title.value || "Book Title",
        subtitle: els.subtitle.value, author: els.author.value || "Author Name",
        bg: els.bg.value, fg: els.fg.value, accent: els.accent.value,
        font: els.font.value, guides: els.guides.checked, spineText: els.spineText.checked
      };
    }

    function draw(cv, state, dpi, guides) {
      var d = dims(state.trim, state.pages, state.paper);
      var scale = dpi;
      cv.width = Math.round(d.fullW * scale);
      cv.height = Math.round(d.fullH * scale);
      var g = cv.getContext("2d");
      g.setTransform(scale, 0, 0, scale, 0, 0);

      var W = d.fullW, H = d.fullH;
      var xFront = BLEED + d.trimW + d.spine;
      var xSpine = BLEED + d.trimW;

      g.fillStyle = state.bg;
      g.fillRect(0, 0, W, H);

      // front panel artwork
      var frontX = xFront, frontY = BLEED, frontW = d.trimW, frontH = d.trimH;
      if (uploaded) {
        g.save();
        g.beginPath(); g.rect(frontX, frontY, frontW, frontH); g.clip();
        var base = Math.max(frontW / uploaded.width, frontH / uploaded.height) * crop.z;
        var dw = uploaded.width * base, dh = uploaded.height * base;
        var dx = frontX - (dw - frontW) * crop.x;
        var dy = frontY - (dh - frontH) * crop.y;
        g.drawImage(uploaded, dx, dy, dw, dh);
        g.restore();
        g.fillStyle = "rgba(0,0,0,.28)";
        g.fillRect(frontX, frontY, frontW, frontH);
      } else {
        g.fillStyle = state.accent;
        g.globalAlpha = 0.16;
        g.fillRect(frontX + frontW * 0.06, frontY + frontH * 0.16, frontW * 0.88, frontH * 0.012);
        g.globalAlpha = 1;
        g.strokeStyle = state.accent;
        g.lineWidth = 0.02;
        g.strokeRect(frontX + frontW * 0.08, frontY + frontH * 0.08, frontW * 0.84, frontH * 0.84);
      }

      // spine tint
      g.fillStyle = state.accent;
      g.globalAlpha = 0.10;
      g.fillRect(xSpine, BLEED, d.spine, d.trimH);
      g.globalAlpha = 1;

      // back cover text block
      g.fillStyle = state.fg;
      g.textAlign = "left";
      g.textBaseline = "top";
      var backX = BLEED + d.trimW * 0.12;
      var backY = BLEED + d.trimH * 0.14;
      g.font = "600 " + (d.trimH * 0.022) + "px " + state.font;
      g.fillText("ABOUT THIS BOOK", backX, backY);
      g.font = (d.trimH * 0.018) + "px " + state.font;
      var lines = wrapText(g, state.subtitle || "A short description of the book goes here. Replace this text with your own blurb, then export a print-ready file.", d.trimW * 0.76, 8);
      lines.forEach(function (line, i) { g.fillText(line, backX, backY + d.trimH * 0.05 + i * d.trimH * 0.028); });

      // front text
      g.textAlign = "center";
      var cx = frontX + frontW / 2;
      var ty = frontY + frontH * 0.58;
      g.fillStyle = state.fg;
      var titleSize = fitFont(g, state.title, state.font, frontW * 0.84, frontH * 0.16, frontH * 0.085);
      g.font = "700 " + titleSize + "px " + state.font;
      var tLines = wrapText(g, state.title, frontW * 0.84, 3);
      tLines.forEach(function (line, i) {
        var lh = titleSize * 1.12;
        g.fillText(line, cx, ty + i * lh - (tLines.length - 1) * lh);
      });
      var afterTitle = ty + titleSize * 1.5;
      if (state.subtitle && !uploaded) {
        g.font = (frontH * 0.026) + "px " + state.font;
        g.fillStyle = state.fg;
        wrapText(g, state.subtitle, frontW * 0.8, 2).forEach(function (line, i) {
          g.fillText(line, cx, afterTitle + i * frontH * 0.04);
        });
      }
      g.font = "600 " + (frontH * 0.03) + "px " + state.font;
      g.fillStyle = state.accent;
      g.fillText(state.author, cx, frontY + frontH * 0.88);

      // spine text
      if (state.spineText && d.spine > 0.18) {
        g.save();
        g.translate(xSpine + d.spine / 2, BLEED + d.trimH / 2);
        g.rotate(Math.PI / 2);
        g.textAlign = "center"; g.textBaseline = "middle";
        g.fillStyle = state.fg;
        var fs = Math.min(d.spine * 0.55, d.trimH * 0.026);
        g.font = "600 " + fs + "px " + state.font;
        var maxW = d.trimH * 0.78;
        var label = state.title + "   ·   " + state.author;
        while (g.measureText(label).width > maxW && label.length > 8) {
          label = label.slice(0, -2);
        }
        g.fillText(label, 0, 0);
        g.restore();
      }

      if (guides) {
        g.strokeStyle = "rgba(255,0,0,.55)";
        g.lineWidth = 0.006;
        g.setLineDash([0.05, 0.04]);
        g.strokeRect(BLEED, BLEED, W - BLEED * 2, H - BLEED * 2);
        g.strokeStyle = "rgba(0,90,255,.5)";
        g.strokeRect(BLEED + 0.25, BLEED + 0.25, W - BLEED * 2 - 0.5, H - BLEED * 2 - 0.5);
        g.setLineDash([]);
        g.strokeStyle = "rgba(0,0,0,.35)";
        g.beginPath();
        g.moveTo(xSpine, 0); g.lineTo(xSpine, H);
        g.moveTo(xSpine + d.spine, 0); g.lineTo(xSpine + d.spine, H);
        g.stroke();
      }
    }

    function wrapText(g, text, maxW, maxLines) {
      var words = String(text).split(/\s+/).filter(Boolean), lines = [], line = "";
      for (var i = 0; i < words.length; i++) {
        var test = line ? line + " " + words[i] : words[i];
        if (g.measureText(test).width > maxW && line) { lines.push(line); line = words[i]; }
        else line = test;
      }
      if (line) lines.push(line);
      if (lines.length > maxLines) {
        lines = lines.slice(0, maxLines);
        lines[maxLines - 1] = lines[maxLines - 1].replace(/\s+\S*$/, "") + "…";
      }
      return lines;
    }

    function fitFont(g, text, family, maxW, maxH, start) {
      var size = start;
      for (var i = 0; i < 40; i++) {
        g.font = "700 " + size + "px " + family;
        if (g.measureText(text).width <= maxW * 1.8 && size * 1.15 <= maxH) break;
        size *= 0.93;
        if (size < 8) break;
      }
      return size;
    }

    function render() {
      var st = current();
      draw(canvas, st, 96, st.guides);
      var d = dims(st.trim, st.pages, st.paper);
      els.fullW.textContent = fmt(d.fullW, 3) + " in";
      els.fullH.textContent = fmt(d.fullH, 3) + " in";
      els.spineOut.textContent = fmt(d.spine, 3) + " in";
      els.px.textContent = Math.round(d.fullW * 300) + " × " + Math.round(d.fullH * 300);
      if (els.pages.dataset.warn !== "1" && (st.pages < 24 || st.pages > 828)) {
        els.pages.parentElement.querySelector(".hint").textContent = "KDP accepts 24 to 828 pages for paperback interiors.";
        els.pages.dataset.warn = "1";
      }
      runPreflight(st, d);
    }

    els.image && els.image.addEventListener("change", function () {
      var f = this.files && this.files[0];
      var nm = document.getElementById("f-image-name");
      if (nm) nm.textContent = f ? f.name : "No image selected";
      if (!f) { uploaded = null; toggleCrop(false); clearStatus(); render(); return; }
      if (!/^image\//.test(f.type)) {
        this.value = ""; uploaded = null;
        if (nm) nm.textContent = "No image selected";
        setStatus("That file is not an image. Use a JPG, PNG, or WebP.", true);
        render(); return;
      }
      if (f.size > 25 * 1024 * 1024) {
        this.value = ""; uploaded = null;
        if (nm) nm.textContent = "No image selected";
        setStatus("Image is larger than 25 MB. Resize it first, then try again.", true);
        render(); return;
      }
      var url = URL.createObjectURL(f);
      var img = new Image();
      img.onload = function () { uploaded = img; URL.revokeObjectURL(url); toggleCrop(true); clearStatus(); render(); };
      img.onerror = function () {
        URL.revokeObjectURL(url); uploaded = null;
        setStatus("The image could not be decoded. Try exporting it again as JPG or PNG.", true);
        render();
      };
      img.src = url;
    });

    ["title", "subtitle", "author", "trim", "pages", "paper", "bg", "fg", "accent", "font", "spineText", "guides"].forEach(function (k) {
      var el = els[k];
      if (!el) return;
      el.addEventListener("input", render);
      el.addEventListener("change", render);
    });

    function toggleCrop(show) {
      var box = document.getElementById("crop-controls");
      if (box) box.hidden = !show;
    }

    var cx = document.getElementById("f-crop-x"), cy = document.getElementById("f-crop-y"), cz = document.getElementById("f-crop-z");
    if (cx) cx.addEventListener("input", function () { crop.x = parseFloat(this.value); render(); });
    if (cy) cy.addEventListener("input", function () { crop.y = parseFloat(this.value); render(); });
    if (cz) cz.addEventListener("input", function () { crop.z = parseFloat(this.value); render(); });
    var cropReset = document.getElementById("crop-reset");
    if (cropReset) cropReset.addEventListener("click", function () {
      crop = { x: 0.5, y: 0.5, z: 1 };
      if (cx) cx.value = 0.5; if (cy) cy.value = 0.5; if (cz) cz.value = 1;
      render();
    });

    (function initDrag() {
      if (!canvas || !canvas.addEventListener) return;
      var dragging = false, lastX = 0, lastY = 0;
      function pos(e) {
        var r = canvas.getBoundingClientRect();
        var sx = canvas.width / r.width, sy = canvas.height / r.height;
        return { x: (e.clientX - r.left) * sx / 96, y: (e.clientY - r.top) * sy / 96, r: r };
      }
      canvas.addEventListener("pointerdown", function (e) {
        if (!uploaded) return;
        var st = current(), d = dims(st.trim, st.pages, st.paper), p = pos(e);
        var fx = 0.125 + d.trimW + d.spine;
        if (p.x < fx || p.x > fx + d.trimW || p.y < 0.125 || p.y > 0.125 + d.trimH) return;
        dragging = true; lastX = e.clientX; lastY = e.clientY;
        canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
        canvas.classList.add("dragging");
        e.preventDefault();
      });
      canvas.addEventListener("pointermove", function (e) {
        if (!dragging || !uploaded) return;
        var st = current(), d = dims(st.trim, st.pages, st.paper);
        var base = Math.max(d.trimW / uploaded.width, d.trimH / uploaded.height) * crop.z;
        var slackX = uploaded.width * base - d.trimW;
        var slackY = uploaded.height * base - d.trimH;
        var dx = (e.clientX - lastX) * (canvas.width / canvas.getBoundingClientRect().width) / 96;
        var dy = (e.clientY - lastY) * (canvas.height / canvas.getBoundingClientRect().height) / 96;
        if (slackX > 0.001) crop.x = Math.min(1, Math.max(0, crop.x - dx / slackX));
        if (slackY > 0.001) crop.y = Math.min(1, Math.max(0, crop.y - dy / slackY));
        lastX = e.clientX; lastY = e.clientY;
        if (cx) cx.value = crop.x.toFixed(2);
        if (cy) cy.value = crop.y.toFixed(2);
        render();
      });
      function stop() {
        dragging = false; canvas.classList.remove("dragging");
      }
      canvas.addEventListener("pointerup", stop);
      canvas.addEventListener("pointercancel", stop);
      canvas.addEventListener("dblclick", function () {
        if (!uploaded) return;
        crop = { x: 0.5, y: 0.5, z: 1 };
        if (cx) cx.value = 0.5; if (cy) cy.value = 0.5; if (cz) cz.value = 1;
        render();
      });
    })();

    var pfList = document.getElementById("preflight-list");
    if (pfList) pfList.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-fix]");
      if (!btn) return;
      var fix = btn.getAttribute("data-fix");
      if (fix === "edit-title") { els.title.focus(); els.title.select(); return; }
      if (fix === "fix-contrast") {
        els.fg.value = hexLum(els.bg.value) > 0.4 ? "#2b2118" : "#f4ecdd";
      } else if (fix === "fix-author") {
        els.accent.value = els.fg.value;
      } else if (fix === "reset-crop") {
        crop = { x: 0.5, y: 0.5, z: 1 };
        if (cx) cx.value = 0.5; if (cy) cy.value = 0.5; if (cz) cz.value = 1;
      } else if (fix === "spine-off") {
        els.spineText.checked = false;
      }
      render();
    });

    els.pages.addEventListener("change", function () { this.dataset.warn = ""; });

    els.pages.addEventListener("change", function () {
      var raw = this.value.trim();
      var v = parseInt(raw, 10);
      if (raw === "" || isNaN(v) || v < 24 || v > 828) {
        var fixed = isNaN(v) ? 320 : Math.min(828, Math.max(24, v));
        this.value = fixed;
        setStatus("KDP accepts 24 to 828 pages. Page count set to " + fixed + ".", true);
      } else {
        clearStatus();
      }
      render();
    });

    var samples = [[els.title, els.title.value], [els.subtitle, els.subtitle.value], [els.author, els.author.value]];
    samples.forEach(function (pair) {
      var el = pair[0], sample = pair[1];
      el.addEventListener("focus", function () {
        if (this.value === sample) this.select();
      });
    });

    var textTimer = null;
    function checkText() {
      clearTimeout(textTimer);
      textTimer = setTimeout(function () {
        if (!els.title.value.trim()) setStatus('Title is empty, so the preview shows "Book Title" until you type one.');
        else if (!els.author.value.trim()) setStatus('Author is empty, so the preview shows "Author Name" until you type one.');
        else clearStatus();
      }, 700);
    }
    els.title.addEventListener("input", checkText);
    els.author.addEventListener("input", checkText);

    els.pngBtn && els.pngBtn.addEventListener("click", function () {
      try {
        var st = current();
        var d = dims(st.trim, st.pages, st.paper);
        if (Math.max(d.fullW, d.fullH) * 300 > 16000) {
          setStatus("This trim is too large to export at 300 DPI in this browser. Choose a smaller trim.", true);
          return;
        }
        var out = document.createElement("canvas");
        draw(out, st, 300, false);
        out.toBlob(function (blob) {
          if (!blob) { setStatus("PNG export failed. Try a smaller trim or a different browser.", true); return; }
          var a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "coverfit-" + st.trim + "-300dpi.png";
          a.click();
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
          setStatus("PNG saved at " + out.width + " x " + out.height + " pixels.");
        }, "image/png");
      } catch (err) {
        setStatus("PNG export failed: " + (err && err.message ? err.message : "unknown error"), true);
      }
    });

    els.pdfBtn && els.pdfBtn.addEventListener("click", function () {
      var st = current();
      var d = dims(st.trim, st.pages, st.paper);
      if (Math.max(d.fullW, d.fullH) * 300 > 16000) {
        setStatus("This trim is too large to export at 300 DPI in this browser. Choose a smaller trim.", true);
        return;
      }
      els.pdfBtn.disabled = true;
      els.pdfBtn.textContent = "Building PDF";
      try {
        var out = document.createElement("canvas");
        draw(out, st, 300, false);
        var data = out.toDataURL("image/jpeg", 0.92).split(",")[1];
        if (!data) throw new Error("the canvas could not be encoded");
        var bin = atob(data), bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        var blob = jpegPdf(bytes, out.width, out.height, d.fullW * 72, d.fullH * 72);
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "coverfit-" + st.trim + "-print-ready.pdf";
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
        setStatus("PDF saved. Check it in KDP's previewer before publishing.");
      } catch (err) {
        setStatus("PDF export failed: " + (err && err.message ? err.message : "unknown error"), true);
      } finally {
        els.pdfBtn.disabled = false;
        els.pdfBtn.textContent = "Save print PDF";
      }
    });

    els.resetBtn && els.resetBtn.addEventListener("click", function () {
      els.title.value = "The Quiet Cartographer";
      els.subtitle.value = "A novel about maps, memory, and the places we refuse to leave.";
      els.author.value = "A. R. Whitfield";
      els.trim.value = "6x9"; els.pages.value = "320"; els.paper.value = "cream";
      els.bg.value = "#f4ecdd"; els.fg.value = "#2b2118"; els.accent.value = "#b4472a";
      els.font.value = "Georgia, serif"; els.spineText.checked = true; els.guides.checked = false;
      uploaded = null; crop = { x: 0.5, y: 0.5, z: 1 }; toggleCrop(false);
      var cx = document.getElementById("f-crop-x"), cy = document.getElementById("f-crop-y"), cz = document.getElementById("f-crop-z");
      if (cx) cx.value = 0.5; if (cy) cy.value = 0.5; if (cz) cz.value = 1;
      var nm = document.getElementById("f-image-name"); if (nm) nm.textContent = "No image selected"; clearStatus(); render();
    });

    render();
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () {
        var cv = canvas;
        if (cv.width > 0) {
          var maxH = 520 * (window.devicePixelRatio || 1);
          if (cv.height > maxH) { cv.style.maxHeight = "520px"; cv.style.width = "auto"; }
        }
      });
      ro.observe(canvas);
    }
  }

  /* ---------- standalone spine calculator ---------- */
  function initSpine() {
    var form = document.getElementById("spine-tool");
    if (!form) return;
    var pages = document.getElementById("s-pages");
    var trim = document.getElementById("s-trim");
    var paper = document.getElementById("s-paper");
    var out = document.getElementById("s-out");
    var mm = document.getElementById("s-mm");
    var px = document.getElementById("s-px");
    function run() {
      var p = Math.max(24, Math.min(828, parseInt(pages.value, 10) || 0));
      var sp = spineWidth(p, paper.value);
      out.textContent = fmt(sp, 3) + " in";
      mm.textContent = fmt(sp * 25.4, 2) + " mm";
      px.textContent = Math.round(sp * 300) + " px @300dpi";
      var d = dims(trim.value, p, paper.value);
      var w = document.getElementById("s-fullw"), h = document.getElementById("s-fullh");
      if (w) w.textContent = fmt(d.fullW, 3) + " in";
      if (h) h.textContent = fmt(d.fullH, 3) + " in";
    }
    [pages, trim, paper].forEach(function (el) { el.addEventListener("input", run); el.addEventListener("change", run); });
    run();
  }

  /* ---------- printing cost ---------- */
  function initPrinting() {
    var form = document.getElementById("print-tool");
    if (!form) return;
    var pages = document.getElementById("p-pages");
    var ink = document.getElementById("p-ink");
    var fixed = document.getElementById("p-fixed");
    var perPage = document.getElementById("p-perpage");
    var retail = document.getElementById("p-retail");
    var out = document.getElementById("p-out");
    var royalty = document.getElementById("p-royalty");
    var rate = document.getElementById("p-rate");
    function run() {
      var p = Math.max(24, Math.min(828, parseInt(pages.value, 10) || 0));
      var f = parseFloat(fixed.value) || 0;
      var pp = parseFloat(perPage.value) || 0;
      var cost = f + p * pp;
      var r = parseFloat(retail.value) || 0;
      var roy = Math.max(0, r * 0.6 - cost);
      out.textContent = "$" + fmt(cost, 2);
      royalty.textContent = "$" + fmt(roy, 2);
      rate.textContent = "$" + fmt(cost / p, 3) + " / page";
    }
    [pages, fixed, perPage, retail, ink].forEach(function (el) { el.addEventListener("input", run); el.addEventListener("change", run); });
    if (ink) ink.addEventListener("change", function () {
      if (ink.value === "bw") { fixed.value = "0.85"; perPage.value = "0.012"; }
      else if (ink.value === "premium") { fixed.value = "0.85"; perPage.value = "0.0575"; }
      else { fixed.value = "0.85"; perPage.value = "0.0225"; }
      run();
    });
    run();
  }

  function initProofs() {
    var specs = [
      { id: "proof-a", bg: "#efe3cf", fg: "#2b2118", accent: "#a9542c", title: "The Quiet Cartographer", author: "A. R. Whitfield", sub: "A novel", serif: true },
      { id: "proof-b", bg: "#8b9d83", fg: "#f7efdf", accent: "#e0b877", title: "Salt & Orchard", author: "Mara Bell", sub: "Recipes from a small farm", serif: true },
      { id: "proof-c", bg: "#2b2118", fg: "#f0e4cf", accent: "#c66b3d", title: "Night Ledger", author: "J. Cole", sub: "A thriller", serif: false }
    ];
    specs.forEach(function (sp) {
      var cv = document.getElementById(sp.id);
      if (!cv) return;
      var g = cv.getContext("2d");
      var W = cv.width, H = cv.height;
      g.fillStyle = sp.bg; g.fillRect(0, 0, W, H);

      if (sp.id === "proof-a") {
        g.strokeStyle = sp.accent; g.lineWidth = 2;
        g.strokeRect(W * 0.09, H * 0.08, W * 0.82, H * 0.84);
        g.beginPath(); g.moveTo(W * 0.09, H * 0.2); g.lineTo(W * 0.91, H * 0.2); g.stroke();
        g.fillStyle = sp.accent;
        g.fillRect(W * 0.42, H * 0.13, W * 0.16, 3);
      } else if (sp.id === "proof-b") {
        g.globalAlpha = 0.22; g.fillStyle = sp.accent;
        g.beginPath(); g.arc(W * 0.76, H * 0.24, W * 0.22, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(W * 0.24, H * 0.78, W * 0.26, 0, Math.PI * 2); g.fill();
        g.globalAlpha = 1;
      } else {
        g.fillStyle = sp.accent; g.fillRect(0, 0, W * 0.055, H);
        g.globalAlpha = 0.12; g.fillStyle = "#f0e4cf";
        for (var y = 0; y < H; y += 14) g.fillRect(W * 0.12, y, W * 0.76, 1);
        g.globalAlpha = 1;
      }

      var family = sp.serif ? "Georgia, 'Times New Roman', serif" : "'Trebuchet MS', Verdana, sans-serif";
      var titleSize = sp.id === "proof-b" ? W * 0.135 : W * 0.12;
      g.fillStyle = sp.fg; g.textAlign = "center"; g.textBaseline = "top";
      g.font = "700 " + titleSize + "px " + family;
      var words = sp.title.split(" "), lines = [], line = "";
      words.forEach(function (w) {
        var test = line ? line + " " + w : w;
        if (g.measureText(test).width > W * 0.78 && line) { lines.push(line); line = w; }
        else line = test;
      });
      if (line) lines.push(line);
      var startY = H * (sp.id === "proof-a" ? 0.34 : 0.4) - (lines.length - 1) * titleSize * 0.55;
      lines.forEach(function (l, i) { g.fillText(l, W / 2, startY + i * titleSize * 1.08); });

      g.font = "italic " + (W * 0.045) + "px " + family;
      g.fillStyle = sp.id === "proof-c" ? "rgba(240,228,207,.72)" : "rgba(43,33,24,.68)";
      g.fillText(sp.sub, W / 2, startY + lines.length * titleSize * 1.12 + 10);

      g.font = "600 " + (W * 0.052) + "px " + family;
      g.fillStyle = sp.accent;
      g.fillText(sp.author.toUpperCase(), W / 2, H * 0.86);
    });
  }

  function boot() {
    initProofs();
    initGenerator();
    initSpine();
    initPrinting();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.CoverFit = { dims: dims, spineWidth: spineWidth, TRIMS: TRIMS, fmt: fmt };
})();
