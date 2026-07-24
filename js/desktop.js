// ===== Windows 98 Simulator =====
(function () {
    let zIndex = 100;
    let openWindows = {};
    let windowIdCounter = 0;

    const desktop = document.getElementById("desktop");
    const taskbarItems = document.getElementById("taskbar-items");
    const startMenu = document.getElementById("start-menu");
    const startBtn = document.getElementById("start-btn");

    // ===== Clock =====
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

    // ===== Desktop Icons =====
    const ICONS = [
        { id: "mycomputer", icon: "🖥️", label: "My Computer", action: () => openWindow("mycomputer", "My Computer", "🖥️", renderMyComputer) },
        { id: "notepad", icon: "📝", label: "Notepad", action: () => openWindow("notepad", "Untitled - Notepad", "📝", renderNotepad) },
        { id: "calculator", icon: "🔢", label: "Calculator", action: () => openWindow("calculator", "Calculator", "🔢", renderCalculator) },
        { id: "paint", icon: "🎨", label: "Paint", action: () => openWindow("paint", "untitled - Paint", "🎨", renderPaint) },
        { id: "minesweeper", icon: "💣", label: "Minesweeper", action: () => openWindow("minesweeper", "Minesweeper", "💣", renderMinesweeper) },
        { id: "browser", icon: "🌐", label: "Internet Explorer", action: () => openWindow("browser", "Internet Explorer", "🌐", renderBrowser) },
        { id: "recycle", icon: "🗑️", label: "Recycle Bin", action: () => openWindow("recycle", "Recycle Bin", "🗑️", renderRecycleBin) },
    ];

    // Render desktop icons
    ICONS.forEach((icon, i) => {
        const el = document.createElement("div");
        el.className = "desktop-icon";
        el.style.left = "20px";
        el.style.top = (20 + i * 80) + "px";
        el.innerHTML = `<div class="desktop-icon-icon">${icon.icon}</div><div class="desktop-icon-label">${icon.label}</div>`;
        el.addEventListener("click", (e) => {
            document.querySelectorAll(".desktop-icon").forEach(d => d.classList.remove("selected"));
            el.classList.add("selected");
        });
        el.addEventListener("dblclick", () => {
            el.classList.remove("selected");
            icon.action();
        });
        desktop.appendChild(el);
    });

    // Deselect icons on desktop click
    desktop.addEventListener("click", (e) => {
        if (e.target === desktop) {
            document.querySelectorAll(".desktop-icon").forEach(d => d.classList.remove("selected"));
            closeStartMenu();
        }
    });

    // ===== Window Manager =====
    function openWindow(id, title, icon, contentRenderer) {
        // If already open, focus it
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
        `;

        desktop.appendChild(win);
        openWindows[id] = { winId, el: win, title, icon, taskbarItem: null };

        // Render content
        const contentEl = win.querySelector(".window-content");
        contentRenderer(contentEl, winId);

        // Close button
        win.querySelector(".window-btn.close").addEventListener("click", () => closeWindow(id));

        // Minimize
        win.querySelectorAll(".window-btn")[0].addEventListener("click", () => minimizeWindow(id));

        // Maximize
        win.querySelectorAll(".window-btn")[1].addEventListener("click", () => toggleMaximize(id));

        // Focus on click
        win.addEventListener("mousedown", () => focusWindow(id));

        // Drag
        makeDraggable(win, win.querySelector(".window-titlebar"));

        // Add to taskbar
        addTaskbarItem(id, title, icon);

        focusWindow(id);
    }

    function closeWindow(id) {
        if (!openWindows[id]) return;
        const w = openWindows[id];
        w.el.remove();
        if (w.taskbarItem) w.taskbarItem.remove();
        delete openWindows[id];
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
        // Mark others inactive
        for (const otherId in openWindows) {
            if (otherId !== id) openWindows[otherId].el.classList.add("inactive");
        }
        // Update taskbar
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

    // ===== Dragging =====
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

    // ===== Start Menu =====
    startBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        startBtn.classList.toggle("active");
        startMenu.classList.toggle("show");
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

    // Start menu items
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
                        <input type="text" style="width:100%;padding:3px;margin-bottom:12px;font-family:inherit;font-size:12px;" placeholder="notepad, calc, paint, mines...">
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

    // ===== Apps =====

    // Notepad
    function renderNotepad(el) {
        el.innerHTML = '<textarea class="notepad-textarea" placeholder="Type here..."></textarea>';
        const ta = el.querySelector("textarea");
        ta.value = "Welcome to Notepad!\r\n\r\nThis is a Windows 98 style notepad.\r\nType anything you want.\r\n\r\nFeatures:\r\n- Auto-saves to memory\r\n- Monospace font\r\n- Classic Windows 98 look\r\n";
    }

    // Calculator
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
            btn.addEventListener("click", b.op);
            grid.appendChild(btn);
        });
        // Add empty cell for layout
        const empty = document.createElement("div");
        grid.appendChild(empty);
    }

    // Paint
    function renderPaint(el) {
        const colors = ["#000000","#ffffff","#ff0000","#00ff00","#0000ff","#ffff00","#ff00ff","#00ffff","#808080","#c0c0c0","#800000","#008000","#000080","#808000","#800080","#008080"];
        el.innerHTML = `
            <div class="paint-toolbar">
                ${colors.map((c,i) => `<div class="paint-color${i===0?' active':''}" data-color="${c}" style="background:${c}"></div>`).join("")}
                <span style="margin-left:8px;">Size:</span>
                <input type="range" min="1" max="20" value="3" style="width:60px;">
                <button class="btn-98" style="margin-left:4px;">Clear</button>
            </div>
            <canvas class="paint-canvas" width="380" height="220"></canvas>
        `;
        el.parentElement.style.width = "400px";
        el.parentElement.style.height = "280px";

        const canvas = el.querySelector("canvas");
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        let drawing = false, currentColor = "#000000", brushSize = 3;
        const sizeSlider = el.querySelector('input[type="range"]');
        sizeSlider.addEventListener("input", () => { brushSize = parseInt(sizeSlider.value); });

        el.querySelectorAll(".paint-color").forEach(c => {
            c.addEventListener("click", () => {
                el.querySelectorAll(".paint-color").forEach(x => x.classList.remove("active"));
                c.classList.add("active");
                currentColor = c.dataset.color;
            });
        });

        el.querySelector("button").addEventListener("click", () => {
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        });

        function getPos(e) {
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (canvas.width / rect.width);
            const y = (e.clientY - rect.top) * (canvas.height / rect.height);
            return { x, y };
        }

        canvas.addEventListener("mousedown", e => {
            drawing = true;
            const p = getPos(e);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
        });
        canvas.addEventListener("mousemove", e => {
            if (!drawing) return;
            const p = getPos(e);
            ctx.lineTo(p.x, p.y);
            ctx.strokeStyle = currentColor;
            ctx.lineWidth = brushSize;
            ctx.lineCap = "round";
            ctx.stroke();
        });
        canvas.addEventListener("mouseup", () => { drawing = false; });
        canvas.addEventListener("mouseleave", () => { drawing = false; });
    }

    // My Computer
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

    // Recycle Bin
    function renderRecycleBin(el) {
        el.innerHTML = `<div class="file-explorer">
            <div style="width:100%;text-align:center;padding:40px;color:#808080;">
                <div style="font-size:48px;margin-bottom:8px;">🗑️</div>
                <p>The Recycle Bin is empty.</p>
            </div>
        </div>`;
    }

    // Browser
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

    // Minesweeper
    function renderMinesweeper(el) {
        el.parentElement.style.width = "auto";
        el.parentElement.style.height = "auto";

        const SIZE = 9;
        const MINES = 10;
        let grid = [];
        let revealed = [];
        let flagged = [];
        let gameOver = false;
        let mineCount = MINES;
        let firstClick = true;

        function init() {
            grid = [];
            revealed = [];
            flagged = [];
            gameOver = false;
            mineCount = MINES;
            firstClick = true;
            for (let r = 0; r < SIZE; r++) {
                grid.push(new Array(SIZE).fill(0));
                revealed.push(new Array(SIZE).fill(false));
                flagged.push(new Array(SIZE).fill(false));
            }
        }

        function placeMines(excludeR, excludeC) {
            let placed = 0;
            while (placed < MINES) {
                const r = Math.floor(Math.random() * SIZE);
                const c = Math.floor(Math.random() * SIZE);
                if (grid[r][c] === -1) continue;
                if (Math.abs(r - excludeR) <= 1 && Math.abs(c - excludeC) <= 1) continue;
                grid[r][c] = -1;
                placed++;
            }
            // Calculate numbers
            for (let r = 0; r < SIZE; r++) {
                for (let c = 0; c < SIZE; c++) {
                    if (grid[r][c] === -1) continue;
                    let count = 0;
                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            const nr = r + dr, nc = c + dc;
                            if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && grid[nr][nc] === -1) count++;
                        }
                    }
                    grid[r][c] = count;
                }
            }
        }

        function reveal(r, c) {
            if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return;
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
            for (let r = 0; r < SIZE; r++) {
                for (let c = 0; c < SIZE; c++) {
                    if (grid[r][c] !== -1 && !revealed[r][c]) return false;
                }
            }
            return true;
        }

        function render() {
            el.innerHTML = `
                <div class="ms-info">
                    <div class="ms-display" id="ms-mines">${mineCount.toString().padStart(3, "0")}</div>
                    <button class="btn-98" style="font-size:16px;" id="ms-reset">🙂</button>
                    <div class="ms-display" id="ms-time">000</div>
                </div>
                <div class="ms-grid" style="grid-template-columns:repeat(${SIZE},18px);"></div>
            `;
            const gridEl = el.querySelector(".ms-grid");
            const resetBtn = el.querySelector("#ms-reset");
            const minesDisplay = el.querySelector("#ms-mines");
            const timeDisplay = el.querySelector("#ms-time");

            let startTime = null;
            let timerInterval = null;

            function updateTime() {
                if (!startTime) return;
                const elapsed = Math.min(999, Math.floor((Date.now() - startTime) / 1000));
                timeDisplay.textContent = elapsed.toString().padStart(3, "0");
            }

            for (let r = 0; r < SIZE; r++) {
                for (let c = 0; c < SIZE; c++) {
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
                            timerInterval = setInterval(updateTime, 100);
                        }

                        if (grid[r][c] === -1) {
                            gameOver = true;
                            clearInterval(timerInterval);
                            // Reveal all mines
                            for (let i = 0; i < SIZE; i++) {
                                for (let j = 0; j < SIZE; j++) {
                                    if (grid[i][j] === -1) revealed[i][j] = true;
                                }
                            }
                            resetBtn.textContent = "😵";
                            render();
                        } else {
                            reveal(r, c);
                            if (checkWin()) {
                                gameOver = true;
                                clearInterval(timerInterval);
                                resetBtn.textContent = "😎";
                                alert("You win! 🎉");
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
                if (timerInterval) clearInterval(timerInterval);
                init();
                render();
            });
        }

        init();
        render();
    }

    // Expose for double-click
    window.openWindow = openWindow;
})();
