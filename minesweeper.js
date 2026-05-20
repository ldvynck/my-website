const canvas = document.getElementById("minesCanvas");
const ctx = canvas.getContext("2d");
const statusText = document.getElementById("minesStatus");

const SIZE = 16;
const MINES = 40;
const CELL = canvas.width / SIZE;

let grid = [];
let gameOver = false;
let revealedCount = 0;

function restartMines() {
    grid = [];
    gameOver = false;
    revealedCount = 0;

    for (let r = 0; r < SIZE; r++) {
        grid[r] = [];
        for (let c = 0; c < SIZE; c++) {
            grid[r][c] = {
                mine: false,
                revealed: false,
                flagged: false,
                count: 0
            };
        }
    }

    placeMines();
    calculateCounts();

    statusText.textContent = "left click: reveal | right click: flag";
    draw();
}

function placeMines() {
    let placed = 0;

    while (placed < MINES) {
        const r = Math.floor(Math.random() * SIZE);
        const c = Math.floor(Math.random() * SIZE);

        if (!grid[r][c].mine) {
            grid[r][c].mine = true;
            placed++;
        }
    }
}

function calculateCounts() {
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (grid[r][c].mine) continue;

            let count = 0;

            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;

                    const rr = r + dr;
                    const cc = c + dc;

                    if (inside(rr, cc) && grid[rr][cc].mine) count++;
                }
            }

            grid[r][c].count = count;
        }
    }
}

function inside(r, c) {
    return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            drawCell(r, c);
        }
    }
}

function drawCell(r, c) {
    const cell = grid[r][c];
    const x = c * CELL;
    const y = r * CELL;

    if (cell.revealed) {
        ctx.fillStyle = "#ffffff";
    } else {
        ctx.fillStyle = "#eeeeee";
    }

    ctx.fillRect(x, y, CELL, CELL);

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, CELL, CELL);

    if (cell.flagged && !cell.revealed) {
        ctx.fillStyle = "#e53935";
        ctx.beginPath();
        ctx.moveTo(x + CELL * 0.3, y + CELL * 0.25);
        ctx.lineTo(x + CELL * 0.75, y + CELL * 0.4);
        ctx.lineTo(x + CELL * 0.3, y + CELL * 0.55);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + CELL * 0.3, y + CELL * 0.25);
        ctx.lineTo(x + CELL * 0.3, y + CELL * 0.8);
        ctx.stroke();
    }

    if (!cell.revealed) return;

    if (cell.mine) {
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(x + CELL / 2, y + CELL / 2, CELL * 0.22, 0, Math.PI * 2);
        ctx.fill();
        return;
    }

    if (cell.count > 0) {
        ctx.fillStyle = numberColor(cell.count);
        ctx.font = "bold 20px Courier New";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(cell.count, x + CELL / 2, y + CELL / 2);
    }
}

function numberColor(n) {
    const colors = {
        1: "#1565c0",
        2: "#2e7d32",
        3: "#c62828",
        4: "#6a1b9a",
        5: "#ef6c00",
        6: "#00838f",
        7: "#000000",
        8: "#777777"
    };

    return colors[n] || "#000000";
}

function reveal(r, c) {
    if (!inside(r, c)) return;
    const cell = grid[r][c];

    if (cell.revealed || cell.flagged) return;

    cell.revealed = true;
    revealedCount++;

    if (cell.mine) {
        endGame(false);
        return;
    }

    if (cell.count === 0) {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr !== 0 || dc !== 0) reveal(r + dr, c + dc);
            }
        }
    }

    if (revealedCount === SIZE * SIZE - MINES) {
        endGame(true);
    }
}

function toggleFlag(r, c) {
    if (!inside(r, c)) return;

    const cell = grid[r][c];

    if (cell.revealed) return;

    cell.flagged = !cell.flagged;
}

function endGame(won) {
    gameOver = true;

    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (grid[r][c].mine) grid[r][c].revealed = true;
        }
    }

    statusText.textContent = won ? "you won" : "boom. you lost";
}

canvas.addEventListener("mousedown", function(event) {
    if (gameOver) return;

    const rect = canvas.getBoundingClientRect();
    const c = Math.floor((event.clientX - rect.left) / CELL);
    const r = Math.floor((event.clientY - rect.top) / CELL);

    if (event.button === 0) reveal(r, c);
    if (event.button === 2) toggleFlag(r, c);

    draw();
});

canvas.addEventListener("contextmenu", function(event) {
    event.preventDefault();
});

restartMines();
