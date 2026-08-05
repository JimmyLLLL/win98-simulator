(function () {
let zIndex = 100;
let openWindows = {};
let windowIdCounter = 0;
const desktop = document.getElementById("desktop");
const taskbarItems = document.getElementById("taskbar-items");
const startMenu = document.getElementById("start-menu");
const startBtn = document.getElementById("start-btn");
function updateClock() {
const d = new Date();
const h = d.getHours();
const m = d.getMinutes().toString().padStart(2, "0");
const ampm = h >= 12 ? "PM" : "AM";
const h12 = h % 12 || 12;
document.getElementById("clock").textContent = `${h12}:${m} ${ampm}`;
}
updateClock();
setInterval(updateClock, 1000);

// Double-click clock -> Date/Time Properties
(function () {
    const clk = document.getElementById("clock");
    if (!clk) return;
    clk.style.cursor = "pointer";
    clk.title = "Double-click for date/time properties";
    clk.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        openDateTimeProperties();
    });
})();
function openDateTimeProperties() {
    openWindow("datetime", "Date/Time Properties", "🕐", (el) => {
        const now = new Date();
        const curYear = now.getFullYear();
        const curMonth = now.getMonth();
        el.innerHTML = `
        <div style="padding:8px;display:flex;gap:10px;">
            <div>
                <div class="dtp-cal" id="dtp-cal"></div>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;min-width:120px;">
                <div style="font-weight:bold;margin-bottom:2px;">Date:</div>
                <div style="display:flex;gap:4px;align-items:center;">
                    <select class="dtp-month" style="font-family:inherit;font-size:11px;"></select>
                    <input type="number" class="dtp-year" style="width:56px;font-family:inherit;font-size:11px;" min="1980" max="2099">
                </div>
                <div style="font-weight:bold;margin-top:6px;">Time:</div>
                <input type="text" class="dtp-time" style="width:110px;font-family:'Courier New',monospace;font-size:13px;text-align:center;" readonly>
                <div style="flex:1;"></div>
                <div style="text-align:right;">
                    <button class="btn-98" style="margin-right:4px;" id="dtp-ok">OK</button>
                    <button class="btn-98" onclick="this.closest('.window').querySelector('.window-btn.close').click()">Cancel</button>
                </div>
            </div>
        </div>`;
        el.parentElement.style.width = "340px";
        el.parentElement.style.height = "240px";
        const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
        const monthSel = el.querySelector(".dtp-month");
        monthNames.forEach((n, i) => {
            const o = document.createElement("option");
            o.value = i; o.textContent = n;
            if (i === curMonth) o.selected = true;
            monthSel.appendChild(o);
        });
        const yearInp = el.querySelector(".dtp-year");
        yearInp.value = curYear;
        const cal = el.querySelector("#dtp-cal");
        const timeInp = el.querySelector(".dtp-time");
        function renderCal() {
            const m = parseInt(monthSel.value);
            const y = parseInt(yearInp.value);
            const first = new Date(y, m, 1).getDay();
            const days = new Date(y, m + 1, 0).getDate();
            const today = new Date();
            const isCurMonth = today.getMonth() === m && today.getFullYear() === y;
            let html = '<div class="dtp-dow">S M T W T F S</div><div class="dtp-grid">';
            for (let i = 0; i < first; i++) html += '<span></span>';
            for (let d = 1; d <= days; d++) {
                const cls = (isCurMonth && d === today.getDate()) ? " today" : "";
                html += `<span class="dtp-day${cls}">${d}</span>`;
            }
            html += "</div>";
            cal.innerHTML = html;
        }
        renderCal();
        monthSel.addEventListener("change", renderCal);
        yearInp.addEventListener("change", renderCal);
        function tickTime() {
            const d = new Date();
            const h = d.getHours(), mi = d.getMinutes().toString().padStart(2, "0");
            const s = d.getSeconds().toString().padStart(2, "0");
            const ap = h >= 12 ? "PM" : "AM";
            const h12 = h % 12 || 12;
            timeInp.value = `${h12}:${mi}:${s} ${ap}`;
        }
        tickTime();
        const ti = setInterval(tickTime, 1000);
        el.querySelector("#dtp-ok").addEventListener("click", () => {
            clearInterval(ti);
            el.querySelector(".window-btn.close").click();
        });
        const origClose = el.closest(".window").querySelector(".window-btn.close");
        origClose.addEventListener("click", () => clearInterval(ti), { once: true });
    });
}

// ---------- Sound module (Web Audio synthesis, no external files) ----------
const SFX = (function () {
    let ctx = null;
    let muted = localStorage.getItem("win98_muted") === "1";
    function ensure() {
        if (!ctx) {
            try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
        }
        if (ctx && ctx.state === "suspended") ctx.resume();
        return ctx;
    }
    function tone(freq, start, dur, type, peak) {
        const c = ensure(); if (!c || muted) return;
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = type || "sine";
        o.frequency.value = freq;
        const t0 = c.currentTime + start;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(peak || 0.12, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g).connect(c.destination);
        o.start(t0);
        o.stop(t0 + dur + 0.05);
    }
    return {
        ensure,
        playClick: () => tone(1200, 0, 0.04, "square", 0.04),
        playOpen: () => { tone(660, 0, 0.09, "sine", 0.12); tone(990, 0.03, 0.1, "sine", 0.07); },
        playClose: () => tone(440, 0, 0.09, "sine", 0.1),
        playError: () => { tone(220, 0, 0.18, "square", 0.1); tone(180, 0.12, 0.22, "square", 0.08); },
        playNotify: () => { tone(1320, 0, 0.09, "sine", 0.1); tone(1760, 0.09, 0.13, "sine", 0.07); },
        playStartup: () => {
            // ascending chord resolve, Eno-inspired
            const notes = [261.63, 329.63, 392.0, 523.25, 659.25];
            notes.forEach((f, i) => {
                tone(f, i * 0.16, 1.5, "sine", 0.09);
                tone(f * 2, i * 0.16 + 0.05, 1.3, "triangle", 0.03);
            });
        },
        setMuted: (m) => { muted = m; localStorage.setItem("win98_muted", m ? "1" : "0"); },
        isMuted: () => muted
    };
})();
window.SFX = SFX;

// ---------- Boot screen ----------
(function () {
    const boot = document.getElementById("boot-screen");
    if (!boot) return;
    let dismissed = false;
    function dismiss() {
        if (dismissed) return; dismissed = true;
        boot.classList.add("fade");
        setTimeout(() => boot.remove(), 700);
    }
    boot.addEventListener("mousedown", dismiss);
    setTimeout(dismiss, 2200);
})();

// Play startup chime on first user gesture (browsers require a gesture for audio)
let _startupPlayed = false;
document.addEventListener("mousedown", function () {
    if (_startupPlayed) return;
    _startupPlayed = true;
    SFX.ensure();
    if (!SFX.isMuted()) SFX.playStartup();
}, { once: true });

// Mute toggle in system tray
(function () {
    const tray = document.getElementById("system-tray");
    if (!tray) return;
    const vol = document.createElement("span");
    vol.id = "tray-volume";
    vol.style.cssText = "cursor:pointer;font-size:12px;";
    vol.title = "Toggle sound";
    function render() { vol.textContent = SFX.isMuted() ? "🔇" : "🔊"; }
    render();
    vol.addEventListener("click", () => { SFX.setMuted(!SFX.isMuted()); render(); });
    const ref = document.getElementById("clock");
    if (ref) tray.insertBefore(vol, ref); else tray.appendChild(vol);
})();

// ---------- Screensaver (starfield, idle-triggered) ----------
let screensaver = null;
let idleTimer = null;
const IDLE_MS = 90000;
function resetIdle() {
    if (idleTimer) clearTimeout(idleTimer);
    if (screensaver) return;
    idleTimer = setTimeout(startScreensaver, IDLE_MS);
}
function startScreensaver() {
    if (screensaver) return;
    if (document.getElementById("boot-screen")) return;
    const overlay = document.createElement("div");
    overlay.id = "screensaver";
    overlay.innerHTML = '<canvas id="ss-canvas"></canvas><div class="ss-hint">Move mouse or press any key to return</div>';
    document.body.appendChild(overlay);
    screensaver = overlay;
    const canvas = overlay.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    let w, h, stars;
    function resize() {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);
    function makeStars() {
        stars = [];
        for (let i = 0; i < 260; i++) {
            stars.push({
                x: (Math.random() - 0.5) * w,
                y: (Math.random() - 0.5) * h,
                z: Math.random() * w,
                sz: Math.random() * 1.6 + 0.4
            });
        }
    }
    makeStars();
    let raf;
    const cx = w / 2, cy = h / 2;
    function frame() {
        ctx.fillStyle = "rgba(0,0,8,0.35)";
        ctx.fillRect(0, 0, w, h);
        const cx2 = w / 2, cy2 = h / 2;
        for (const s of stars) {
            s.z -= 6;
            if (s.z <= 0) { s.z = w; s.x = (Math.random() - 0.5) * w; s.y = (Math.random() - 0.5) * h; }
            const k = 160 / s.z;
            const px = s.x * k + cx2;
            const py = s.y * k + cy2;
            if (px < 0 || px >= w || py < 0 || py >= h) continue;
            const sz = s.sz * (1 - s.z / w) * 2.2;
            ctx.fillStyle = "rgba(200,220,255," + Math.min(1, (1 - s.z / w) * 1.4) + ")";
            ctx.fillRect(px, py, sz, sz);
        }
        raf = requestAnimationFrame(frame);
    }
    frame();
    screensaver._stop = function () {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        overlay.remove();
        screensaver = null;
        resetIdle();
    };
}
function stopScreensaver() {
    if (screensaver) { screensaver._stop(); SFX.playClick(); }
}
["mousemove", "mousedown", "keydown", "touchstart", "wheel"].forEach(ev => {
    document.addEventListener(ev, () => { if (screensaver) stopScreensaver(); resetIdle(); }, { passive: true });
});
resetIdle();

// ---------- BSOD easter egg (Ctrl+Alt+Del) ----------
function showBSOD() {
    if (document.getElementById("bsod")) return;
    const b = document.createElement("div");
    b.id = "bsod";
    b.innerHTML = `
    <div class="bsod-body">
        <p class="bsod-title">Windows</p>
        <p>A fatal exception 0E has occurred at 0028:C0011E36 in VXD VMM(01) +<br>00010E36. The current application will be terminated.</p>
        <p>* Press any key to terminate the current application.<br>* Press CTRL+ALT+DEL again to restart your computer. You will<br>&nbsp;&nbsp;lose any unsaved information in all applications.</p>
        <p class="bsod-continue">Press any key to continue _</p>
    </div>`;
    document.body.appendChild(b);
    SFX.setMuted(true);
    setTimeout(() => SFX.setMuted(false), 100);
    SFX.playError();
    function dismiss(e) {
        b.remove();
        document.removeEventListener("keydown", dismiss);
        document.removeEventListener("mousedown", dismiss);
    }
    setTimeout(() => {
        document.addEventListener("keydown", dismiss);
        document.addEventListener("mousedown", dismiss);
    }, 400);
}
document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.altKey && (e.key === "Delete" || e.key === "Del")) {
        e.preventDefault();
        showBSOD();
    }
});

const ICONS = [
{ id: "mycomputer", icon: "🖥️", label: "My Computer", action: () => openWindow("mycomputer", "My Computer", "🖥️", renderMyComputer) },
{ id: "notepad", icon: "📝", label: "Notepad", action: () => openWindow("notepad", "Untitled - Notepad", "📝", renderNotepad) },
{ id: "calculator", icon: "🔢", label: "Calculator", action: () => openWindow("calculator", "Calculator", "🔢", renderCalculator) },
{ id: "paint", icon: "🎨", label: "Paint", action: () => openWindow("paint", "untitled - Paint", "🎨", renderPaint) },
{ id: "minesweeper", icon: "💣", label: "Minesweeper", action: () => openWindow("minesweeper", "Minesweeper", "💣", renderMinesweeper) },
{ id: "solitaire", icon: "🃏", label: "Solitaire", action: () => openWindow("solitaire", "Solitaire", "🃏", renderSolitaire) },
{ id: "browser", icon: "🌐", label: "Internet Explorer", action: () => openWindow("browser", "Internet Explorer", "🌐", renderBrowser) },
{ id: "msdos", icon: "⬛", label: "MS-DOS Prompt", action: () => openWindow("msdos", "MS-DOS Prompt", "⬛", renderDosPrompt) },
{ id: "recycle", icon: "🗑️", label: "Recycle Bin", action: () => openWindow("recycle", "Recycle Bin", "🗑️", renderRecycleBin) },
];
ICONS.forEach((icon, i) => {
const el = document.createElement("div");
el.className = "desktop-icon";
el.dataset.id = icon.id;
el.style.left = "20px";
el.style.top = (20 + i * 72) + "px";
el.innerHTML = `<div class="desktop-icon-icon">${icon.icon}</div><div class="desktop-icon-label">${icon.label}</div>`;
el.addEventListener("click", (e) => {
document.querySelectorAll(".desktop-icon").forEach(d => d.classList.remove("selected"));
el.classList.add("selected");
});
el.addEventListener("dblclick", () => {
    el.classList.remove("selected");
    icon.action();
});
// Touch: open on double-tap (dblclick is unreliable on touch)
let lastTap = 0;
el.addEventListener("touchend", (e) => {
    const now = Date.now();
    if (now - lastTap < 350) {
        e.preventDefault();
        el.classList.remove("selected");
        icon.action();
        lastTap = 0;
    } else {
        lastTap = now;
        document.querySelectorAll(".desktop-icon").forEach(d => d.classList.remove("selected"));
        el.classList.add("selected");
    }
});
desktop.appendChild(el);
});
desktop.addEventListener("click", (e) => {
    if (e.target === desktop) {
        document.querySelectorAll(".desktop-icon").forEach(d => d.classList.remove("selected"));
        closeStartMenu();
    }
});

// ---------- Reusable context menu ----------
function closeContextMenu() {
    document.querySelectorAll(".context-menu").forEach(m => m.remove());
    document.querySelectorAll(".menu-dropdown").forEach(m => m.remove());
    document.querySelectorAll(".menubar-item.open").forEach(m => m.classList.remove("open"));
}
document.addEventListener("click", closeContextMenu);
document.addEventListener("contextmenu", (e) => {
    if (!e.target.closest(".context-menu")) closeContextMenu();
});
function showContextMenu(x, y, items) {
    closeContextMenu();
    const menu = document.createElement("div");
    menu.className = "context-menu";
    menu.style.left = Math.min(x, window.innerWidth - 180) + "px";
    menu.style.top = Math.min(y, window.innerHeight - (items.length * 22 + 12)) + "px";
    items.forEach(it => {
        if (it.separator) {
            const sep = document.createElement("div");
            sep.className = "context-menu-separator";
            menu.appendChild(sep);
            return;
        }
        const row = document.createElement("div");
        row.className = "context-menu-item" + (it.disabled ? " disabled" : "");
        row.innerHTML = `<span class="cm-icon">${it.icon || ""}</span><span class="cm-label">${it.label}</span>${it.submenu ? '<span class="cm-arrow">▶</span>' : ""}`;
        if (!it.disabled && it.action) {
            row.addEventListener("click", () => { closeContextMenu(); it.action(); });
        }
        menu.appendChild(row);
    });
    document.body.appendChild(menu);
}

// ---------- Desktop right-click context menu ----------
let desktopBgColor = localStorage.getItem("win98_bg") || "#008080";
desktop.style.background = desktopBgColor;
function arrangeIcons() {
    document.querySelectorAll(".desktop-icon").forEach((el, i) => {
        el.style.left = "20px";
        el.style.top = (20 + i * 72) + "px";
    });
}
desktop.addEventListener("contextmenu", (e) => {
    if (e.target !== desktop && !e.target.closest(".desktop-icon")) return;
    e.preventDefault();
    e.stopPropagation();
    showContextMenu(e.clientX, e.clientY, [
        { label: "Arrange Icons", icon: " arranged", action: arrangeIcons },
        { label: "Line Up Icons", action: arrangeIcons },
        { label: "Refresh", icon: "🔄", action: () => { SFX.playClick(); } },
        { separator: true },
        { label: "Paste", disabled: true },
        { separator: true },
        { label: "Properties", icon: "🖥️", action: openDisplayProperties }
    ]);
});

function openDisplayProperties() {
    openWindow("display", "Display Properties", "🖥️", (el) => {
        const swatches = ["#008080", "#000080", "#800000", "#008000", "#400040", "#2a2a2a", "#c0c0c0", "#000000"];
        el.innerHTML = `
        <div style="padding:8px;">
            <div style="display:flex;gap:8px;">
                <div style="width:120px;height:90px;border:2px inset #fff;background:${desktopBgColor};display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px;">
                    <span style="font-size:9px;color:#fff;text-shadow:1px 1px 1px #000;">Monitor</span>
                </div>
                <div style="flex:1;">
                    <div style="font-weight:bold;margin-bottom:6px;">Background:</div>
                    <div style="display:flex;flex-wrap:wrap;gap:4px;">
                        ${swatches.map(c => `<div class="dprop-swatch" data-color="${c}" style="width:20px;height:20px;background:${c};border:1px solid #404040;cursor:pointer;"></div>`).join("")}
                    </div>
                </div>
            </div>
            <div style="text-align:right;margin-top:12px;">
                <button class="btn-98" style="margin-right:4px;" id="dprop-ok">OK</button>
                <button class="btn-98" onclick="this.closest('.window').querySelector('.window-btn.close').click()">Cancel</button>
            </div>
        </div>`;
        el.parentElement.style.width = "340px";
        el.parentElement.style.height = "200px";
        const preview = el.querySelector("div > div");
        el.querySelectorAll(".dprop-swatch").forEach(s => {
            s.addEventListener("click", () => {
                desktopBgColor = s.dataset.color;
                el.querySelector('[style*="height:90px"]').style.background = desktopBgColor;
            });
        });
        el.querySelector("#dprop-ok").addEventListener("click", () => {
            desktop.style.background = desktopBgColor;
            localStorage.setItem("win98_bg", desktopBgColor);
            el.querySelector(".window-btn.close").click();
        });
    });
}

// ---------- Window management helpers (taskbar right-click) ----------
function visibleWindows() {
    return Object.entries(openWindows).filter(([id, w]) => !w.minimized).map(([id, w]) => ({ id, w }));
}
function cascadeWindows() {
    const wins = visibleWindows();
    if (!wins.length) return;
    wins.forEach((entry, i) => {
        const w = entry.w.el;
        w.style.width = "420px";
        w.style.height = "280px";
        w.style.left = (20 + i * 28) + "px";
        w.style.top = (10 + i * 24) + "px";
        clampWindowToViewport(w);
        focusWindow(entry.id);
    });
}
function tileWindows(axis) {
    const wins = visibleWindows();
    if (!wins.length) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight - 28;
    if (axis === "h") {
        const each = Math.floor(vh / wins.length);
        wins.forEach((entry, i) => {
            const w = entry.w.el;
            w.style.left = "0px";
            w.style.top = (i * each) + "px";
            w.style.width = vw + "px";
            w.style.height = each + "px";
            focusWindow(entry.id);
        });
    } else {
        const each = Math.floor(vw / wins.length);
        wins.forEach((entry, i) => {
            const w = entry.w.el;
            w.style.left = (i * each) + "px";
            w.style.top = "0px";
            w.style.width = each + "px";
            w.style.height = vh + "px";
            focusWindow(entry.id);
        });
    }
}
function minimizeAllWindows() {
    for (const id in openWindows) minimizeWindow(id);
}
(function () {
    const tb = document.getElementById("taskbar");
    if (!tb) return;
    tb.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const hasOpen = visibleWindows().length > 0;
        showContextMenu(e.clientX, e.clientY, [
            { label: "Cascade Windows", disabled: !hasOpen, action: cascadeWindows },
            { label: "Tile Horizontally", disabled: !hasOpen, action: () => tileWindows("h") },
            { label: "Tile Vertically", disabled: !hasOpen, action: () => tileWindows("v") },
            { separator: true },
            { label: "Minimize All Windows", disabled: !hasOpen, action: minimizeAllWindows },
            { separator: true },
            { label: "Properties", action: openDisplayProperties }
        ]);
    });
})();

function openWindow(id, title, icon, contentRenderer) {
if (openWindows[id]) {
focusWindow(id);
return;
}
const winId = "win-" + (++windowIdCounter);
const win = document.createElement("div");
win.className = "window";
win.id = winId;
win.style.zIndex = ++zIndex;
win.style.width = "400px";
win.style.height = "300px";
win.style.left = (60 + Math.random() * 100) + "px";
win.style.top = (30 + Math.random() * 50) + "px";
    win.innerHTML = `
    <div class="window-titlebar">
        <span style="margin-right:4px;font-size:14px;">${icon}</span>
        <span class="window-title">${title}</span>
        <div class="window-controls">
            <button class="window-btn" title="Minimize" onclick="event.stopPropagation()">_</button>
            <button class="window-btn" title="Maximize" onclick="event.stopPropagation()">□</button>
            <button class="window-btn close" title="Close">×</button>
        </div>
    </div>
    <div class="window-content"></div>
    <div class="window-resizer" title="Resize"></div>
    `;
    desktop.appendChild(win);
    openWindows[id] = { winId, el: win, title, icon, taskbarItem: null };
    const contentEl = win.querySelector(".window-content");
    contentRenderer(contentEl, winId);
    clampWindowToViewport(win);
    win.querySelector(".window-btn.close").addEventListener("click", () => closeWindow(id));
    win.querySelectorAll(".window-btn")[0].addEventListener("click", () => minimizeWindow(id));
    win.querySelectorAll(".window-btn")[1].addEventListener("click", () => toggleMaximize(id));
    win.addEventListener("mousedown", () => focusWindow(id));
    makeDraggable(win, win.querySelector(".window-titlebar"));
    makeResizable(win);
    addTaskbarItem(id, title, icon);
    focusWindow(id);
    SFX.playOpen();
}
function clampWindowToViewport(win) {
    const vw = window.innerWidth;
    const vh = window.innerHeight - 28; // minus taskbar
    const w = parseInt(win.style.width) || win.offsetWidth;
    const h = parseInt(win.style.height) || win.offsetHeight;
    if (w > vw) win.style.width = vw + "px";
    if (h > vh) win.style.height = vh + "px";
    const cw = parseInt(win.style.width) || win.offsetWidth;
    const ch = parseInt(win.style.height) || win.offsetHeight;
    let l = parseInt(win.style.left) || 0;
    let t = parseInt(win.style.top) || 0;
    if (l < 0) l = 0;
    if (t < 0) t = 0;
    if (l + cw > vw) l = Math.max(0, vw - cw);
    if (t + ch > vh) t = Math.max(0, vh - ch);
    win.style.left = l + "px";
    win.style.top = t + "px";
}
window.addEventListener("resize", () => {
    for (const id in openWindows) {
        const w = openWindows[id].el;
        if (openWindows[id].maximized) {
            w.style.width = "100%";
            w.style.height = (window.innerHeight - 28) + "px";
        } else {
            clampWindowToViewport(w);
        }
    }
});
function makeResizable(win) {
    const handle = win.querySelector(".window-resizer");
    if (!handle) return;
    handle.addEventListener("mousedown", (e) => {
        const w = openWindows[Object.keys(openWindows).find(k => openWindows[k].winId === win.id)];
        if (w && w.maximized) return;
        e.preventDefault(); e.stopPropagation();
        let isResizing = true;
        const startX = e.clientX, startY = e.clientY;
        const startW = win.offsetWidth, startH = win.offsetHeight;
        function onMove(ev) {
            if (!isResizing) return;
            win.style.width = Math.max(200, startW + ev.clientX - startX) + "px";
            win.style.height = Math.max(120, startH + ev.clientY - startY) + "px";
        }
        function onUp() { isResizing = false; document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); }
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
    });
}
function closeWindow(id) {
    if (!openWindows[id]) return;
    const w = openWindows[id];
    w.el.remove();
    if (w.taskbarItem) w.taskbarItem.remove();
    delete openWindows[id];
    SFX.playClose();
}
function minimizeWindow(id) {
if (!openWindows[id]) return;
openWindows[id].el.style.display = "none";
openWindows[id].minimized = true;
if (openWindows[id].taskbarItem) {
openWindows[id].taskbarItem.classList.remove("active");
}
}
function toggleMaximize(id) {
if (!openWindows[id]) return;
const w = openWindows[id];
if (w.maximized) {
w.el.style.left = w.prevLeft;
w.el.style.top = w.prevTop;
w.el.style.width = w.prevWidth;
w.el.style.height = w.prevHeight;
w.el.classList.remove("maximized");
w.maximized = false;
} else {
w.prevLeft = w.el.style.left;
w.prevTop = w.el.style.top;
w.prevWidth = w.el.style.width;
w.prevHeight = w.el.style.height;
w.el.style.left = "0";
w.el.style.top = "0";
w.el.style.width = "100%";
w.el.style.height = (window.innerHeight - 28) + "px";
w.el.classList.add("maximized");
w.maximized = true;
}
}
function focusWindow(id) {
if (!openWindows[id]) return;
const w = openWindows[id];
w.el.style.display = "flex";
w.minimized = false;
w.el.style.zIndex = ++zIndex;
w.el.classList.remove("inactive");
for (const otherId in openWindows) {
if (otherId !== id) openWindows[otherId].el.classList.add("inactive");
}
document.querySelectorAll(".taskbar-item").forEach(t => t.classList.remove("active"));
if (w.taskbarItem) w.taskbarItem.classList.add("active");
}
function addTaskbarItem(id, title, icon) {
const item = document.createElement("div");
item.className = "taskbar-item active";
item.innerHTML = `<span class="taskbar-item-icon">${icon}</span><span>${title}</span>`;
item.addEventListener("click", () => {
const w = openWindows[id];
if (!w) return;
if (w.minimized) focusWindow(id);
else if (w.el.style.zIndex == zIndex) minimizeWindow(id);
else focusWindow(id);
});
taskbarItems.appendChild(item);
openWindows[id].taskbarItem = item;
}
function makeDraggable(win, handle) {
let isDragging = false, startX, startY, winX, winY;
handle.addEventListener("mousedown", (e) => {
if (e.target.classList.contains("window-btn")) return;
const w = openWindows[Object.keys(openWindows).find(k => openWindows[k].winId === win.id)];
if (w && w.maximized) return;
isDragging = true;
startX = e.clientX;
startY = e.clientY;
winX = parseInt(win.style.left);
winY = parseInt(win.style.top);
e.preventDefault();
});
document.addEventListener("mousemove", (e) => {
if (!isDragging) return;
win.style.left = (winX + e.clientX - startX) + "px";
win.style.top = Math.max(0, winY + e.clientY - startY) + "px";
});
document.addEventListener("mouseup", () => { isDragging = false; });
}
startBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    startBtn.classList.toggle("active");
    startMenu.classList.toggle("show");
    SFX.playClick();
});
function closeStartMenu() {
startBtn.classList.remove("active");
startMenu.classList.remove("show");
}
document.addEventListener("click", (e) => {
if (!startMenu.contains(e.target) && e.target !== startBtn && !startBtn.contains(e.target)) {
closeStartMenu();
}
});
document.querySelectorAll(".start-menu-item").forEach(item => {
item.addEventListener("click", () => {
closeStartMenu();
const action = item.dataset.action;
if (action === "shutdown") {
openWindow("shutdown", "Shut Down Windows", "⚡", (el) => {
el.innerHTML = `<div style="padding:20px;text-align:center;background:var(--win-bg);height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;">
<p style="font-size:14px;margin-bottom:16px;">It is now safe to turn off your computer.</p>
<button class="btn-98" onclick="location.reload()">Restart</button>
</div>`;
el.parentElement.style.width = "320px";
el.parentElement.style.height = "180px";
});
} else if (action === "run") {
openWindow("run", "Run", "▶️", (el) => {
el.innerHTML = `<div style="padding:12px;">
<p style="margin-bottom:8px;">Type the name of a program:</p>
<input type="text" style="width:100%;padding:3px;margin-bottom:12px;font-family:inherit;font-size:12px;" placeholder="notepad, calc, paint, mines, sol, cmd...">
<div style="text-align:right;">
<button class="btn-98" style="margin-right:4px;">OK</button>
<button class="btn-98" onclick="this.closest('.window').querySelector('.window-btn.close').click()">Cancel</button>
</div>
</div>`;
el.parentElement.style.width = "300px";
el.parentElement.style.height = "140px";
const input = el.querySelector("input");
const okBtn = el.querySelector("button");
input.focus();
const runCmd = () => {
const cmd = input.value.trim().toLowerCase();
if (cmd === "notepad" || cmd === "notepad.exe") openWindow("notepad", "Untitled - Notepad", "📝", renderNotepad);
else if (cmd === "calc" || cmd === "calculator") openWindow("calculator", "Calculator", "🔢", renderCalculator);
else if (cmd === "paint" || cmd === "mspaint") openWindow("paint", "untitled - Paint", "🎨", renderPaint);
else if (cmd === "mines" || cmd === "winmine") openWindow("minesweeper", "Minesweeper", "💣", renderMinesweeper);
else if (cmd === "sol" || cmd === "solitaire") openWindow("solitaire", "Solitaire", "🃏", renderSolitaire);
else if (cmd === "cmd" || cmd === "command" || cmd === "dos") openWindow("msdos", "MS-DOS Prompt", "⬛", renderDosPrompt);
else if (cmd === "iexplore" || cmd === "ie") openWindow("browser", "Internet Explorer", "🌐", renderBrowser);
else { alert("Cannot find the file. Make sure you typed the name correctly."); return; }
el.querySelector(".window-btn.close").click();
};
okBtn.addEventListener("click", runCmd);
input.addEventListener("keydown", e => { if (e.key === "Enter") runCmd(); });
});
}
});
});
// ---------- Reusable menu bar for app windows ----------
function createMenuBar(items) {
    const bar = document.createElement("div");
    bar.className = "menubar";
    function closeAll() {
        bar.querySelectorAll(".menu-dropdown").forEach(d => d.remove());
        bar.querySelectorAll(".menubar-item").forEach(m => m.classList.remove("open"));
    }
    function openItem(mi, m) {
        closeAll();
        const dd = document.createElement("div");
        dd.className = "menu-dropdown";
        m.menu.forEach(it => {
            if (it.separator) {
                const sep = document.createElement("div");
                sep.className = "context-menu-separator";
                dd.appendChild(sep);
                return;
            }
            const row = document.createElement("div");
            const checked = typeof it.checked === "function" ? it.checked() : it.checked;
            row.className = "menu-dropdown-item" + (it.disabled ? " disabled" : "") + (checked ? " checked" : "");
            row.innerHTML = `<span class="menu-check">${checked ? "✓" : ""}</span><span>${it.label}</span><span class="menu-shortcut">${it.shortcut || ""}</span>`;
            if (!it.disabled && it.action) {
                row.addEventListener("click", (ev) => { ev.stopPropagation(); closeAll(); it.action(); });
            }
            dd.appendChild(row);
        });
        mi.appendChild(dd);
        mi.classList.add("open");
    }
    items.forEach(m => {
        const mi = document.createElement("div");
        mi.className = "menubar-item";
        mi.innerHTML = `<u>${m.label[0]}</u>${m.label.slice(1)}`;
        mi.addEventListener("click", (e) => {
            e.stopPropagation();
            if (mi.classList.contains("open")) closeAll();
            else openItem(mi, m);
        });
        mi.addEventListener("mouseenter", () => { if (bar.querySelector(".menu-dropdown")) openItem(mi, m); });
        bar.appendChild(mi);
    });
    return bar;
}

function renderNotepad(el) {
    let wordWrap = localStorage.getItem("win98_notepad_wrap") !== "0";
    const savedText = localStorage.getItem("win98_notepad_text");
    const defaultText = savedText != null ? savedText : "Welcome to Notepad!\r\n\r\nThis is a Windows 98 style notepad.\r\nType anything you want — it auto-saves.\r\n\r\nTry the menus above:\r\n- File > Open to load a .txt file\r\n- File > Save to download your text\r\n- Edit > Time/Date (or press F5)\r\n- Format > Word Wrap\r\n";
    const bar = createMenuBar([
        { label: "File", menu: [
            { label: "New", shortcut: "Ctrl+N", action: () => { if (confirm("Start a new document? Unsaved changes will be lost.")) { ta.value = ""; updateStatus(); save(); } } },
            { label: "Open...", shortcut: "Ctrl+O", action: openFile },
            { label: "Save", shortcut: "Ctrl+S", action: saveFile },
            { separator: true },
            { label: "Exit", action: () => el.closest(".window").querySelector(".window-btn.close").click() }
        ]},
        { label: "Edit", menu: [
            { label: "Undo", shortcut: "Ctrl+Z", action: () => { ta.focus(); document.execCommand("undo"); } },
            { separator: true },
            { label: "Cut", shortcut: "Ctrl+X", action: () => { ta.focus(); document.execCommand("cut"); } },
            { label: "Copy", shortcut: "Ctrl+C", action: () => { ta.focus(); document.execCommand("copy"); } },
            { label: "Paste", shortcut: "Ctrl+V", action: () => { ta.focus(); document.execCommand("paste"); } },
            { separator: true },
            { label: "Select All", shortcut: "Ctrl+A", action: () => ta.select() },
            { label: "Time/Date", shortcut: "F5", action: insertTimeDate }
        ]},
        { label: "Format", menu: [
            { label: "Word Wrap", checked: () => wordWrap, action: () => { wordWrap = !wordWrap; ta.style.whiteSpace = wordWrap ? "pre-wrap" : "pre"; ta.style.overflowWrap = wordWrap ? "break-word" : "normal"; localStorage.setItem("win98_notepad_wrap", wordWrap ? "1" : "0"); } }
        ]},
        { label: "Help", menu: [
            { label: "About Notepad", action: () => alert("Windows 98 Notepad\r\n\r\nA tribute text editor.\r\nAuto-saves to your browser.\r\n\r\n© 1998 Microsoft Corporation") }
        ]}
    ]);
    el.innerHTML = "";
    el.style.display = "flex";
    el.style.flexDirection = "column";
    el.appendChild(bar);
    const taWrap = document.createElement("div");
    taWrap.style.flex = "1";
    taWrap.style.display = "flex";
    taWrap.style.overflow = "hidden";
    const ta = document.createElement("textarea");
    ta.className = "notepad-textarea";
    ta.placeholder = "Type here...";
    ta.style.whiteSpace = wordWrap ? "pre-wrap" : "pre";
    ta.style.overflowWrap = wordWrap ? "break-word" : "normal";
    ta.value = defaultText;
    taWrap.appendChild(ta);
    el.appendChild(taWrap);
    const status = document.createElement("div");
    status.className = "notepad-status";
    el.appendChild(status);
    el.parentElement.style.width = "440px";
    el.parentElement.style.height = "320px";

    function save() { localStorage.setItem("win98_notepad_text", ta.value); }
    function updateStatus() {
        const pos = ta.selectionStart;
        const before = ta.value.substring(0, pos);
        const lines = before.split("\n");
        const ln = lines.length;
        const col = lines[lines.length - 1].length + 1;
        status.innerHTML = `<span>Ln ${ln}, Col ${col}</span><span>${ta.value.length} chars</span>`;
    }
    function insertTimeDate() {
        const d = new Date();
        const h = d.getHours(), m = d.getMinutes().toString().padStart(2, "0");
        const ampm = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 || 12;
        const date = d.toLocaleDateString("en-CA");
        const stamp = `${h12}:${m} ${ampm} ${date}`;
        const s = ta.selectionStart, e = ta.selectionEnd;
        ta.value = ta.value.substring(0, s) + stamp + ta.value.substring(e);
        ta.selectionStart = ta.selectionEnd = s + stamp.length;
        ta.focus(); save(); updateStatus();
    }
    function openFile() {
        const inp = document.createElement("input");
        inp.type = "file";
        inp.accept = ".txt,text/plain,*";
        inp.onchange = () => {
            const f = inp.files[0]; if (!f) return;
            const r = new FileReader();
            r.onload = () => { ta.value = r.result; save(); updateStatus(); };
            r.readAsText(f);
        };
        inp.click();
    }
    function saveFile() {
        const blob = new Blob([ta.value], { type: "text/plain" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "Untitled.txt";
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
    ta.addEventListener("input", () => { save(); updateStatus(); });
    ta.addEventListener("keyup", updateStatus);
    ta.addEventListener("click", updateStatus);
    ta.addEventListener("keydown", (e) => {
        if (e.key === "F5") { e.preventDefault(); insertTimeDate(); }
        if (e.ctrlKey && (e.key === "s" || e.key === "S")) { e.preventDefault(); saveFile(); }
        if (e.ctrlKey && (e.key === "o" || e.key === "O")) { e.preventDefault(); openFile(); }
    });
    updateStatus();
}
function renderCalculator(el) {
el.innerHTML = `
<div style="padding:4px;">
<div class="calc-display" id="calc-display-0">0</div>
<div class="calc-grid" id="calc-grid"></div>
</div>
`;
el.parentElement.style.width = "220px";
el.parentElement.style.height = "260px";
const display = el.querySelector(".calc-display");
const grid = el.querySelector(".calc-grid");
let current = "0", previous = null, operator = null, justCalculated = false;
function updateDisplay() { display.textContent = current; }
function inputDigit(d) {
if (justCalculated) { current = d; justCalculated = false; }
else if (current === "0") current = d;
else current += d;
updateDisplay();
}
function inputOp(op) {
if (previous !== null && operator && !justCalculated) {
calculate();
}
previous = parseFloat(current);
operator = op;
justCalculated = true;
}
function calculate() {
if (operator === null || previous === null) return;
const curr = parseFloat(current);
let result;
switch (operator) {
case "+": result = previous + curr; break;
case "-": result = previous - curr; break;
case "×": result = previous * curr; break;
case "÷": result = curr === 0 ? "Error" : previous / curr; break;
}
current = String(result);
operator = null;
previous = null;
justCalculated = true;
updateDisplay();
}
const buttons = [
{ t: "C", op: () => { current = "0"; previous = null; operator = null; updateDisplay(); } },
{ t: "±", op: () => { current = String(-parseFloat(current)); updateDisplay(); } },
{ t: "√", op: () => { current = String(Math.sqrt(parseFloat(current))); updateDisplay(); } },
{ t: "÷", cls: "op", op: () => inputOp("÷") },
{ t: "7", op: () => inputDigit("7") },
{ t: "8", op: () => inputDigit("8") },
{ t: "9", op: () => inputDigit("9") },
{ t: "×", cls: "op", op: () => inputOp("×") },
{ t: "4", op: () => inputDigit("4") },
{ t: "5", op: () => inputDigit("5") },
{ t: "6", op: () => inputDigit("6") },
{ t: "-", cls: "op", op: () => inputOp("-") },
{ t: "1", op: () => inputDigit("1") },
{ t: "2", op: () => inputDigit("2") },
{ t: "3", op: () => inputDigit("3") },
{ t: "+", cls: "op", op: () => inputOp("+") },
{ t: "0", op: () => inputDigit("0") },
{ t: ".", op: () => { if (!current.includes(".")) { current += "."; updateDisplay(); } } },
{ t: "=", cls: "eq", op: calculate },
];
buttons.forEach(b => {
const btn = document.createElement("button");
btn.className = "calc-btn" + (b.cls ? " " + b.cls : "");
btn.textContent = b.t;
btn.addEventListener("click", () => { b.op(); flash(btn); });
grid.appendChild(btn);
});
const empty = document.createElement("div");
grid.appendChild(empty);
// Keyboard support
const winEl = el.closest(".window");
winEl.tabIndex = -1;
setTimeout(() => winEl.focus(), 0);
function flash(b) { b.style.background = "var(--dark)"; setTimeout(() => b.style.background = "", 80); }
function findBtn(t) { return grid.querySelector(".calc-btn") ? Array.from(grid.querySelectorAll(".calc-btn")).find(b => b.textContent === t) : null; }
winEl.addEventListener("keydown", (e) => {
if (parseInt(winEl.style.zIndex) !== zIndex) return;
const k = e.key; let hit = null;
if (k >= "0" && k <= "9") { inputDigit(k); hit = findBtn(k); }
else if (k === ".") { if (!current.includes(".")) { current += "."; updateDisplay(); } hit = findBtn("."); }
else if (k === "+") { inputOp("+"); hit = findBtn("+"); }
else if (k === "-") { inputOp("-"); hit = findBtn("-"); }
else if (k === "*") { inputOp("×"); hit = findBtn("×"); }
else if (k === "/") { e.preventDefault(); inputOp("÷"); hit = findBtn("÷"); }
else if (k === "Enter" || k === "=") { e.preventDefault(); calculate(); hit = findBtn("="); }
else if (k === "Escape" || k === "c" || k === "C") { current = "0"; previous = null; operator = null; updateDisplay(); hit = findBtn("C"); }
else if (k === "Backspace") { current = current.length > 1 ? current.slice(0, -1) : "0"; updateDisplay(); }
else if (k === "%") { current = String(parseFloat(current) / 100); updateDisplay(); }
else return;
if (hit) flash(hit);
});
}
function renderPaint(el) {
const colors = ["#000000","#ffffff","#ff0000","#00ff00","#0000ff","#ffff00","#ff00ff","#00ffff","#808080","#c0c0c0","#800000","#008000","#000080","#808000","#800080","#008080"];
let tool = "pencil";
let currentColor = "#000000";
let brushSize = 3;
el.innerHTML = `
<div class="paint-toolbar">
<div class="paint-tools">
<button class="paint-tool active" data-tool="pencil" title="Pencil">✏️</button>
<button class="paint-tool" data-tool="eraser" title="Eraser">🧽</button>
<button class="paint-tool" data-tool="fill" title="Fill Color">🪣</button>
<button class="paint-tool" data-tool="line" title="Line">／</button>
<button class="paint-tool" data-tool="rect" title="Rectangle">▭</button>
<button class="paint-tool" data-tool="ellipse" title="Ellipse">◯</button>
</div>
<div class="paint-colors">
${colors.map((c,i) => `<div class="paint-color${i===0?' active':''}" data-color="${c}" style="background:${c}"></div>`).join("")}
</div>
<span style="margin-left:6px;">Size:</span>
<input type="range" min="1" max="30" value="3" class="paint-size" style="width:50px;vertical-align:middle;">
<button class="btn-98 paint-clear" style="margin-left:4px;">Clear</button>
<button class="btn-98 paint-save" style="margin-left:2px;">Save</button>
</div>
<canvas class="paint-canvas" width="380" height="220"></canvas>
`;
el.parentElement.style.width = "460px";
el.parentElement.style.height = "300px";
const canvas = el.querySelector("canvas");
const ctx = canvas.getContext("2d");
ctx.fillStyle = "white";
ctx.fillRect(0, 0, canvas.width, canvas.height);
let drawing = false, startX = 0, startY = 0, snapshot = null;
el.querySelectorAll(".paint-tool").forEach(b => {
b.addEventListener("click", () => {
el.querySelectorAll(".paint-tool").forEach(x => x.classList.remove("active"));
b.classList.add("active");
tool = b.dataset.tool;
canvas.style.cursor = tool === "fill" ? "cell" : "crosshair";
});
});
const sizeSlider = el.querySelector(".paint-size");
sizeSlider.addEventListener("input", () => { brushSize = parseInt(sizeSlider.value); });
el.querySelectorAll(".paint-color").forEach(c => {
c.addEventListener("click", () => {
el.querySelectorAll(".paint-color").forEach(x => x.classList.remove("active"));
c.classList.add("active");
currentColor = c.dataset.color;
});
});
el.querySelector(".paint-clear").addEventListener("click", () => {
ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, canvas.height);
});
el.querySelector(".paint-save").addEventListener("click", () => {
const a = document.createElement("a");
a.href = canvas.toDataURL("image/png");
a.download = "untitled.png";
a.click();
});
function getPos(e) {
const rect = canvas.getBoundingClientRect();
return {
x: Math.floor((e.clientX - rect.left) * (canvas.width / rect.width)),
y: Math.floor((e.clientY - rect.top) * (canvas.height / rect.height))
};
}
function hexToRgb(h) {
const m = h.match(/^#?([0-9a-f]{6})$/i);
return m ? [parseInt(m[1].substring(0,2),16), parseInt(m[1].substring(2,4),16), parseInt(m[1].substring(4,6),16)] : null;
}
function floodFill(sx, sy, fillColor) {
const fc = hexToRgb(fillColor); if (!fc) return;
const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
const data = img.data;
const w = canvas.width, h = canvas.height;
const idx = (sy * w + sx) * 4;
const t = [data[idx], data[idx+1], data[idx+2], data[idx+3]];
if (t[0]===fc[0] && t[1]===fc[1] && t[2]===fc[2] && t[3]===255) return;
const match = (i) => Math.abs(data[i]-t[0])<32 && Math.abs(data[i+1]-t[1])<32 && Math.abs(data[i+2]-t[2])<32 && Math.abs(data[i+3]-t[3])<32;
const stack = [[sx, sy]];
while (stack.length) {
const pt = stack.pop();
const x = pt[0], y = pt[1];
if (x<0 || y<0 || x>=w || y>=h) continue;
const i = (y * w + x) * 4;
if (!match(i)) continue;
data[i]=fc[0]; data[i+1]=fc[1]; data[i+2]=fc[2]; data[i+3]=255;
stack.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
}
ctx.putImageData(img, 0, 0);
}
canvas.addEventListener("mousedown", e => {
const p = getPos(e);
if (tool === "fill") { floodFill(p.x, p.y, currentColor); return; }
drawing = true;
startX = p.x; startY = p.y;
if (tool === "pencil" || tool === "eraser") {
ctx.beginPath(); ctx.moveTo(p.x, p.y);
ctx.strokeStyle = tool === "eraser" ? "white" : currentColor;
ctx.lineWidth = brushSize; ctx.lineCap = "round"; ctx.lineJoin = "round";
ctx.lineTo(p.x + 0.01, p.y); ctx.stroke();
} else {
snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
}
});
canvas.addEventListener("mousemove", e => {
if (!drawing) return;
const p = getPos(e);
if (tool === "pencil" || tool === "eraser") {
ctx.lineTo(p.x, p.y);
ctx.strokeStyle = tool === "eraser" ? "white" : currentColor;
ctx.lineWidth = brushSize; ctx.lineCap = "round"; ctx.lineJoin = "round";
ctx.stroke();
} else if (snapshot) {
ctx.putImageData(snapshot, 0, 0);
ctx.strokeStyle = currentColor; ctx.lineWidth = brushSize; ctx.lineCap = "round";
ctx.beginPath();
if (tool === "line") { ctx.moveTo(startX, startY); ctx.lineTo(p.x, p.y); ctx.stroke(); }
else if (tool === "rect") { ctx.strokeRect(Math.min(startX,p.x), Math.min(startY,p.y), Math.abs(p.x-startX), Math.abs(p.y-startY)); }
else if (tool === "ellipse") { ctx.ellipse((startX+p.x)/2, (startY+p.y)/2, Math.abs(p.x-startX)/2, Math.abs(p.y-startY)/2, 0, 0, Math.PI*2); ctx.stroke(); }
}
});
canvas.addEventListener("mouseup", () => { drawing = false; snapshot = null; });
canvas.addEventListener("mouseleave", () => { drawing = false; snapshot = null; });
}
function renderMyComputer(el) {
el.innerHTML = `
<div class="file-explorer">
<div class="file-item" ondblclick="alert('Drive C: is full of nostalgic memories!')">
<div class="file-item-icon">💾</div><div class="file-item-name">3½ Floppy (A:)</div>
</div>
<div class="file-item" ondblclick="alert('Drive C: - 4.0 GB - 2.1 GB free')">
<div class="file-item-icon">💿</div><div class="file-item-name">Local Disk (C:)</div>
</div>
<div class="file-item" ondblclick="alert('CD-ROM drive is empty.')">
<div class="file-item-icon">📀</div><div class="file-item-name">CD-ROM (D:)</div>
</div>
<div class="file-item" ondblclick="alert('Control Panel - Everything is set to 1998 defaults!')">
<div class="file-item-icon">⚙️</div><div class="file-item-name">Control Panel</div>
</div>
<div class="file-item" ondblclick="alert('Printers - HP DeskJet 670C is ready.')">
<div class="file-item-icon">🖨️</div><div class="file-item-name">Printers</div>
</div>
</div>
`;
}
function renderRecycleBin(el) {
el.innerHTML = `<div class="file-explorer">
<div style="width:100%;text-align:center;padding:40px;color:#808080;">
<div style="font-size:48px;margin-bottom:8px;">🗑️</div>
<p>The Recycle Bin is empty.</p>
</div>
</div>`;
}
function renderBrowser(el) {
el.innerHTML = `
<div class="browser-toolbar">
<button class="btn-98" style="font-size:10px;">◀ Back</button>
<button class="btn-98" style="font-size:10px;">Forward ▶</button>
<span style="font-size:11px;margin:0 4px;">Address:</span>
<input type="text" class="browser-url" value="http://www.windows98.com">
<button class="btn-98">Go</button>
</div>
<div class="browser-content">
<h1 style="font-family:'Times New Roman',serif;color:#000080;font-size:24px;">Welcome to the Web!</h1>
<hr style="margin:8px 0;">
<p style="font-family:'Times New Roman',serif;font-size:14px;">You are browsing the internet using Internet Explorer 4.0.</p>
<p style="font-family:'Times New Roman',serif;font-size:14px;margin-top:8px;">This is a simulated browser. The real internet has moved on, but the 90s spirit lives here.</p>
<h2 style="font-family:'Times New Roman',serif;color:#000080;margin-top:16px;">Quick Links</h2>
<ul style="font-family:'Times New Roman',serif;font-size:14px;margin-top:4px;">
<li><a href="#" onclick="alert('404 - Page not found in 1998!');return false;" style="color:blue;">Best Geocities Pages</a></li>
<li><a href="#" onclick="alert('Loading... just kidding!');return false;" style="color:blue;">Download WinAMP</a></li>
<li><a href="#" onclick="alert('You\'ve got mail!');return false;" style="color:blue;">Check Your Email</a></li>
<li><a href="#" onclick="alert('Best viewed in 800×600 resolution');return false;" style="color:blue;">Web Design Tips</a></li>
</ul>
<p style="font-family:'Times New Roman',serif;font-size:12px;color:gray;margin-top:20px;">© 1998 Microsoft Corporation. All rights reserved.</p>
<div style="margin-top:16px;text-align:center;">
<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgNDAiPjxyZWN0IHg9IjAiIHk9IjAiIHdpZHRoPSIyMDAiIGhlaWdodD0iNDAiIGZpbGw9IiMwMDAwODAiLz48dGV4dCB4PSIxMDAiIHk9IjI1IiBmb250LXNpemU9IjE0IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk1pY3Jvc29mdDwvdGV4dD48L3N2Zz4=" alt="Microsoft" style="border:none;">
</div>
</div>
`;
}
function renderMinesweeper(el) {
let ROWS = 9, COLS = 9, MINES = 10, CELL = 18;
let difficulty = localStorage.getItem("win98_ms_diff") || "beginner";
const LEVELS = {
    beginner: { rows: 9, cols: 9, mines: 10, cell: 18 },
    intermediate: { rows: 16, cols: 16, mines: 40, cell: 18 },
    expert: { rows: 16, cols: 30, mines: 99, cell: 16 }
};
function applyDifficulty() {
    const L = LEVELS[difficulty] || LEVELS.beginner;
    ROWS = L.rows; COLS = L.cols; MINES = L.mines; CELL = L.cell;
    const gridW = COLS * CELL + 8;
    el.parentElement.style.width = Math.min(gridW, window.innerWidth) + "px";
    el.parentElement.style.height = "auto";
}
let grid = [];
let revealed = [];
let flagged = [];
let gameOver = false;
let mineCount = MINES;
let firstClick = true;
let activeTimer = null;
applyDifficulty();
function init() {
    grid = [];
    revealed = [];
    flagged = [];
    gameOver = false;
    mineCount = MINES;
    firstClick = true;
    for (let r = 0; r < ROWS; r++) {
        grid.push(new Array(COLS).fill(0));
        revealed.push(new Array(COLS).fill(false));
        flagged.push(new Array(COLS).fill(false));
    }
}
function placeMines(excludeR, excludeC) {
    let placed = 0;
    while (placed < MINES) {
        const r = Math.floor(Math.random() * ROWS);
        const c = Math.floor(Math.random() * COLS);
        if (grid[r][c] === -1) continue;
        if (Math.abs(r - excludeR) <= 1 && Math.abs(c - excludeC) <= 1) continue;
        grid[r][c] = -1;
        placed++;
    }
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (grid[r][c] === -1) continue;
            let count = 0;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr][nc] === -1) count++;
                }
            }
            grid[r][c] = count;
        }
    }
}
function reveal(r, c) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
    if (revealed[r][c] || flagged[r][c]) return;
    revealed[r][c] = true;
    if (grid[r][c] === 0) {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                reveal(r + dr, c + dc);
            }
        }
    }
}
function checkWin() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (grid[r][c] !== -1 && !revealed[r][c]) return false;
        }
    }
    return true;
}
const menuBar = createMenuBar([
    { label: "Game", menu: [
        { label: "New", shortcut: "F2", action: () => { if (activeTimer) clearInterval(activeTimer); init(); render(); } },
        { separator: true },
        { label: "Beginner", checked: () => difficulty === "beginner", action: () => setDifficulty("beginner") },
        { label: "Intermediate", checked: () => difficulty === "intermediate", action: () => setDifficulty("intermediate") },
        { label: "Expert", checked: () => difficulty === "expert", action: () => setDifficulty("expert") },
        { separator: true },
        { label: "Exit", action: () => el.closest(".window").querySelector(".window-btn.close").click() }
    ]},
    { label: "Help", menu: [
        { label: "How to Play", action: () => alert("Minesweeper\r\n\r\nLeft-click to reveal a square.\r\nRight-click to place a flag.\r\nNumbers show how many mines touch that square.\r\nReveal all safe squares to win.") }
    ]}
]);
function setDifficulty(d) {
    difficulty = d;
    localStorage.setItem("win98_ms_diff", d);
    applyDifficulty();
    init();
    render();
}
function render() {
    el.innerHTML = "";
    el.style.display = "flex";
    el.style.flexDirection = "column";
    el.appendChild(menuBar);
    const board = document.createElement("div");
    board.className = "ms-board";
    board.innerHTML = `
    <div class="ms-info">
    <div class="ms-display">${mineCount.toString().padStart(3, "0")}</div>
    <button class="btn-98" style="font-size:16px;" id="ms-reset">🙂</button>
    <div class="ms-display">000</div>
    </div>
    <div class="ms-grid" style="grid-template-columns:repeat(${COLS},${CELL}px);"></div>
    `;
    const gridEl = board.querySelector(".ms-grid");
    const resetBtn = board.querySelector("#ms-reset");
    const timeDisplay = board.querySelectorAll(".ms-display")[1];
    let startTime = null;
    if (activeTimer) clearInterval(activeTimer);
    function updateTime() {
        if (!startTime) return;
        const elapsed = Math.min(999, Math.floor((Date.now() - startTime) / 1000));
        timeDisplay.textContent = elapsed.toString().padStart(3, "0");
    }
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cell = document.createElement("div");
            cell.className = "ms-cell";
            cell.dataset.r = r;
            cell.dataset.c = c;
            if (revealed[r][c]) {
                cell.classList.add("revealed");
                if (grid[r][c] === -1) {
                    cell.classList.add("mine");
                    cell.textContent = "💣";
                } else if (grid[r][c] > 0) {
                    cell.textContent = grid[r][c];
                    const colors = ["", "#0000ff", "#008000", "#ff0000", "#000080", "#800000", "#008080", "#000000", "#808080"];
                    cell.style.color = colors[grid[r][c]];
                }
            } else if (flagged[r][c]) {
                cell.textContent = "🚩";
            }
            cell.addEventListener("click", () => {
                if (gameOver) return;
                if (flagged[r][c]) return;
                if (revealed[r][c]) return;
                if (firstClick) {
                    placeMines(r, c);
                    firstClick = false;
                    startTime = Date.now();
                    activeTimer = setInterval(updateTime, 100);
                }
                if (grid[r][c] === -1) {
                    gameOver = true;
                    clearInterval(activeTimer);
                    for (let i = 0; i < ROWS; i++) {
                        for (let j = 0; j < COLS; j++) {
                            if (grid[i][j] === -1) revealed[i][j] = true;
                        }
                    }
                    resetBtn.textContent = "😵";
                    render();
                } else {
                    reveal(r, c);
                    if (checkWin()) {
                        gameOver = true;
                        clearInterval(activeTimer);
                        resetBtn.textContent = "😎";
                        SFX.playNotify();
                        setTimeout(() => alert("You win! 🎉"), 50);
                    }
                    render();
                }
            });
            cell.addEventListener("contextmenu", (e) => {
                e.preventDefault();
                if (gameOver || revealed[r][c]) return;
                flagged[r][c] = !flagged[r][c];
                mineCount += flagged[r][c] ? -1 : 1;
                render();
            });
            gridEl.appendChild(cell);
        }
    }
    resetBtn.addEventListener("click", () => {
        if (activeTimer) clearInterval(activeTimer);
        init();
        render();
    });
    el.appendChild(board);
}
init();
render();
}
function renderDosPrompt(el) {
el.style.cssText = "background:#000;color:#c0c0c0;font-family:'Courier New',monospace;font-size:13px;display:flex;flex-direction:column;";
el.parentElement.style.width = "560px";
el.parentElement.style.height = "340px";
let cwd = "C:\\";
const hist = document.createElement("div");
hist.style.cssText = "flex:1;overflow:auto;padding:4px 6px;white-space:pre-wrap;line-height:1.35;";
const inputLine = document.createElement("div");
inputLine.style.cssText = "display:flex;padding:0 6px 4px;";
const promptEl = document.createElement("span");
const inp = document.createElement("input");
inp.style.cssText = "flex:1;background:transparent;border:none;color:#c0c0c0;font-family:inherit;font-size:inherit;outline:none;caret-color:#c0c0c0;";
inp.autocomplete = "off";
inp.spellcheck = false;
inputLine.appendChild(promptEl);
inputLine.appendChild(inp);
el.innerHTML = "";
el.appendChild(hist);
el.appendChild(inputLine);
const cmdHist = [];
let histIdx = -1;
function promptText() { return cwd + ">"; }
function refreshPrompt() { promptEl.textContent = promptText() + " "; }
function print(text) { hist.appendChild(document.createTextNode(text + "\n")); hist.scrollTop = hist.scrollHeight; }
function runCmd(raw) {
hist.appendChild(document.createTextNode(promptText() + " " + raw + "\n"));
const parts = raw.trim().split(/\s+/);
const cmd = (parts[0] || "").toUpperCase();
const arg = parts.slice(1).join(" ");
switch (cmd) {
case "": break;
case "HELP": print("For more information on a specific command, type HELP command-name."); print(""); print("CD       Changes directory."); print("CLS      Clears the screen."); print("DATE     Displays the date."); print("DIR      Lists directory contents."); print("ECHO     Displays messages."); print("EXIT     Quits the command prompt."); print("MEM      Displays memory."); print("TIME     Displays the time."); print("TREE     Graphically displays directory structure."); print("TYPE     Displays a text file."); print("VER      Displays the Windows version."); print("VOL      Displays disk volume label."); break;
case "VER": print("\nWindows 98 [Version 4.10.2222]"); break;
case "VOL": print(" Volume in drive C is WIN98"); print(" Volume Serial Number is 1A2B-3C4D"); break;
case "CLS": hist.textContent = ""; break;
case "ECHO": print(arg || "ECHO is on."); break;
case "DATE": print("Current date: " + new Date().toLocaleDateString()); break;
case "TIME": print("Current time: " + new Date().toLocaleTimeString()); break;
case "MEM": print("\n  655,360 bytes total conventional memory"); print("  655,360 bytes available to MS-DOS"); print("  633,440 bytes largest executable program size"); break;
case "DIR": print(" Volume in drive C is WIN98"); print(" Directory of " + cwd); print(""); print("AUTOEXEC BAT          128  05-11-98   9:30a"); print("CONFIG   SYS           54  05-11-98   9:30a"); print("WINDOWS      <DIR>        05-11-98   9:30a"); print("MYDOC~1      <DIR>        05-11-98   9:30a"); print("        3 file(s)            182 bytes"); print("        2 dir(s)   2,147,450,880 bytes free"); break;
case "CD": if (!arg) print(cwd); else print("The system cannot find the path specified."); break;
case "TYPE":
const a = arg.toUpperCase();
if (a === "AUTOEXEC.BAT") print("@ECHO OFF\nPATH=C:\\WINDOWS;C:\\DOS\nSET TEMP=C:\\WINDOWS\\TEMP");
else if (a === "CONFIG.SYS") print("FILES=40\nBUFFERS=20\nDOS=HIGH,UMB");
else print("File not found - " + arg); break;
case "TREE": print("C:."); print("+---WINDOWS"); print("|   +---SYSTEM"); print("|   \\---COMMAND"); print("+---MY DOCUMENTS"); break;
case "WIN": openWindow("solitaire", "Solitaire", "🃏", renderSolitaire); print("Starting Solitaire..."); break;
case "SOL": openWindow("solitaire", "Solitaire", "🃏", renderSolitaire); print("Starting Solitaire..."); break;
case "NOTEPAD": openWindow("notepad", "Untitled - Notepad", "📝", renderNotepad); break;
case "CALC": openWindow("calculator", "Calculator", "🔢", renderCalculator); break;
case "EXIT": el.closest(".window").querySelector(".window-btn.close").click(); return;
default: print("Bad command or file name");
}
hist.scrollTop = hist.scrollHeight;
}
refreshPrompt();
print("Microsoft(R) Windows 98");
print("   (C)Copyright Microsoft Corp 1981-1998.");
print("");
inp.addEventListener("keydown", (e) => {
if (e.key === "Enter") {
const v = inp.value;
if (v.trim()) { cmdHist.push(v); histIdx = cmdHist.length; }
runCmd(v); inp.value = ""; refreshPrompt();
} else if (e.key === "ArrowUp") {
if (cmdHist.length) { histIdx = Math.max(0, histIdx - 1); inp.value = cmdHist[histIdx] || ""; e.preventDefault(); }
} else if (e.key === "ArrowDown") {
if (cmdHist.length) { histIdx = Math.min(cmdHist.length, histIdx + 1); inp.value = (histIdx === cmdHist.length) ? "" : cmdHist[histIdx]; e.preventDefault(); }
}
});
el.closest(".window").addEventListener("mousedown", () => setTimeout(() => inp.focus(), 0));
setTimeout(() => inp.focus(), 0);
}

function renderSolitaire(el) {
el.style.background = "#008000";
el.style.overflow = "auto";
el.parentElement.style.width = "640px";
el.parentElement.style.height = "460px";
const SUITS = ["\u2660","\u2665","\u2666","\u2663"];
const RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
function color(s) { return (s === "\u2665" || s === "\u2666") ? "red" : "black"; }
let tableau, foundations, stock, waste;
let selection = null;
let moves = 0;
function deal() {
const deck = [];
for (const s of SUITS) for (let r = 0; r < 13; r++) deck.push({ suit: s, rank: r + 1, faceUp: false });
for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
tableau = [[],[],[],[],[],[],[]];
for (let c = 0; c < 7; c++) for (let r = 0; r <= c; r++) tableau[c].push(deck.pop());
tableau.forEach(col => { if (col.length) col[col.length - 1].faceUp = true; });
foundations = [[],[],[],[]];
stock = deck; waste = [];
selection = null; moves = 0;
}
function canStackTab(card, dest) {
if (dest.length === 0) return card.rank === 13;
const top = dest[dest.length - 1];
return top.faceUp && color(top.suit) !== color(card.suit) && top.rank === card.rank + 1;
}
function canStackFound(card, f) {
if (foundations[f].length === 0) return card.rank === 1;
const top = foundations[f][foundations[f].length - 1];
return top.suit === card.suit && top.rank === card.rank - 1;
}
function selCard() {
if (!selection) return null;
if (selection.from === "waste") return waste[waste.length - 1];
return tableau[selection.idx][selection.pos];
}
function selIsSingle() {
if (!selection) return false;
if (selection.from === "waste") return true;
return selection.pos === tableau[selection.idx].length - 1;
}
function autoFound(from, idx, pos) {
let card;
if (from === "tab") { const col = tableau[idx]; if (pos !== col.length - 1) return false; card = col[pos]; }
else { if (!waste.length) return false; card = waste[waste.length - 1]; }
for (let f = 0; f < 4; f++) {
if (canStackFound(card, f)) {
foundations[f].push(card);
if (from === "tab") { tableau[idx].pop(); if (tableau[idx].length) tableau[idx][tableau[idx].length - 1].faceUp = true; }
else waste.pop();
return true;
}
}
return false;
}
function drawStock() {
if (stock.length === 0) { while (waste.length) { const c = waste.pop(); c.faceUp = false; stock.push(c); } }
else { const c = stock.pop(); c.faceUp = true; waste.push(c); }
}
function checkWin() { return foundations.every(f => f.length === 13); }
function cardHtml(card) {
if (!card.faceUp) return '<div class="card-face back"></div>';
return '<div class="card-face front ' + color(card.suit) + '"><span class="card-r">' + RANKS[card.rank - 1] + '</span><span class="card-s">' + card.suit + '</span></div>';
}
function render() {
let html = '<div class="sol-top">';
html += '<div class="sol-pile" data-zone="stock">' + (stock.length ? cardHtml({faceUp:false}) : '<div class="sol-empty">↻</div>') + '</div>';
html += '<div class="sol-pile" data-zone="waste">' + (waste.length ? cardHtml(waste[waste.length - 1]) : '<div class="sol-empty"></div>') + '</div>';
html += '<div class="sol-gap"></div>';
for (let f = 0; f < 4; f++) {
const top = foundations[f].length ? foundations[f][foundations[f].length - 1] : null;
html += '<div class="sol-pile" data-zone="found" data-fi="' + f + '">' + (top ? cardHtml(top) : '<div class="sol-empty"></div>') + '</div>';
}
html += '</div><div class="sol-tableau">';
for (let c = 0; c < 7; c++) {
html += '<div class="sol-col" data-zone="tab" data-ci="' + c + '">';
if (tableau[c].length === 0) html += '<div class="sol-empty"></div>';
else tableau[c].forEach((card, p) => {
const sel = selection && selection.from === "tab" && selection.idx === c && p >= selection.pos;
html += '<div class="sol-card' + (sel ? " selected" : "") + '" data-zone="tab" data-ci="' + c + '" data-pi="' + p + '" style="top:' + (p * 15) + 'px;">' + cardHtml(card) + '</div>';
});
html += '</div>';
}
html += '</div>';
html += '<div class="sol-status"><span>Moves: ' + moves + '</span><button class="btn-98 sol-new" data-zone="newgame">New Game</button></div>';
el.innerHTML = html;
}
el.addEventListener("click", (e) => {
const t = e.target.closest("[data-zone]");
if (!t) { selection = null; render(); return; }
const zone = t.dataset.zone;
if (zone === "newgame") { deal(); render(); SFX.playClick(); return; }
if (zone === "stock") { drawStock(); selection = null; moves++; render(); return; }
if (zone === "waste") {
if (selection) selection = null;
else if (waste.length) selection = { from: "waste", idx: 0, pos: waste.length - 1 };
render(); return;
}
if (zone === "found") {
const fi = +t.dataset.fi;
if (selection) {
const card = selCard();
if (card && selIsSingle() && canStackFound(card, fi)) {
let c2 = (selection.from === "waste") ? waste.pop() : (() => { const col = tableau[selection.idx]; const cc = col.pop(); if (col.length) col[col.length - 1].faceUp = true; return cc; })();
foundations[fi].push(c2);
moves++; selection = null; render();
if (checkWin()) { SFX.playNotify(); setTimeout(() => alert("You win! 🎉"), 80); }
return;
}
selection = null; render(); return;
}
render(); return;
}
if (zone === "tab") {
const ci = +t.dataset.ci;
const pi = t.dataset.pi !== undefined ? +t.dataset.pi : -1;
if (selection) {
const card = selCard();
if (card && canStackTab(card, tableau[ci])) {
let moving;
if (selection.from === "waste") moving = [waste.pop()];
else { const col = tableau[selection.idx]; moving = col.splice(selection.pos); if (col.length) col[col.length - 1].faceUp = true; }
tableau[ci] = tableau[ci].concat(moving);
moves++; selection = null; render();
if (checkWin()) { SFX.playNotify(); setTimeout(() => alert("You win! 🎉"), 80); }
return;
}
selection = null;
}
if (pi >= 0 && tableau[ci][pi] && tableau[ci][pi].faceUp) selection = { from: "tab", idx: ci, pos: pi };
render(); return;
}
});
el.addEventListener("dblclick", (e) => {
const t = e.target.closest("[data-zone='tab'],[data-zone='waste']");
if (!t) return;
let moved = false;
if (t.dataset.zone === "tab") {
const ci = +t.dataset.ci, pi = t.dataset.pi !== undefined ? +t.dataset.pi : -1;
if (pi >= 0 && pi === tableau[ci].length - 1) moved = autoFound("tab", ci, pi);
} else {
moved = autoFound("waste", 0, 0);
}
if (moved) { moves++; render(); if (checkWin()) { SFX.playNotify(); setTimeout(() => alert("You win! 🎉"), 80); } }
});
deal();
render();
}
window.openWindow = openWindow;
})();