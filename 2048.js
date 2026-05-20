const canvas = document.getElementById("game2048");
const ctx = canvas.getContext("2d");
const scoreText = document.getElementById("score2048");

const SIZE = 4;
const TILE = canvas.width / SIZE;

let grid;
let score;

const colors = {
    0: "#ffffff",
    2: "#e3f2fd",
    4: "#bbdefb",
    8: "#90caf9",
    16: "#64b5f6",
    32: "#42a5f5",
    64: "#2196f3",
    128: "#b2dfdb",
    256: "#80cbc4",
    512: "#4db6ac",
    1024: "#26a69a",
    2048: "#000000"
};

function restart2048() {
    grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    score = 0;
    addTile();
    addTile();
    draw();
}

function addTile() {
    const empty = [];

    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (grid[r][c] === 0) empty.push({ r, c });
        }
    }

    if (empty.length === 0) return;

    const spot = empty[Math.floor(Math.random() * empty.length)];
    grid[spot.r][spot.c] = Math.random() < 0.9 ? 2 : 4;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            drawTile(r, c, grid[r][c]);
        }
    }

    scoreText.textContent = `score: ${score}`;
}

function drawTile(r, c, value) {
    const x = c * TILE;
    const y = r * TILE;

    ctx.fillStyle = colors[value] || "#111111";
    ctx.fillRect(x, y, TILE, TILE);

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, TILE, TILE);

    if (value !== 0) {
        ctx.fillStyle = value >= 2048 ? "#ffffff" : "#000000";
        ctx.font = "bold 34px Courier New";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(value, x + TILE / 2, y + TILE / 2);
    }
}

function slide(row) {
    row = row.filter(v => v !== 0);

    for (let i = 0; i < row.length - 1; i++) {
        if (row[i] === row[i + 1]) {
            row[i] *= 2;
            score += row[i];
            row.splice(i + 1, 1);
        }
    }

    while (row.length < SIZE) row.push(0);
    return row;
}

function moveLeft() {
    let moved = false;

    for (let r = 0; r < SIZE; r++) {
        const old = grid[r].join(",");
        grid[r] = slide(grid[r]);
        if (grid[r].join(",") !== old) moved = true;
    }

    return moved;
}

function moveRight() {
    let moved = false;

    for (let r = 0; r < SIZE; r++) {
        const old = grid[r].join(",");
        grid[r] = slide(grid[r].reverse()).reverse();
        if (grid[r].join(",") !== old) moved = true;
    }

    return moved;
}

function moveUp() {
    let moved = false;

    for (let c = 0; c < SIZE; c++) {
        const col = grid.map(row => row[c]);
        const old = col.join(",");
        const movedCol = slide(col);

        for (let r = 0; r < SIZE; r++) grid[r][c] = movedCol[r];
        if (movedCol.join(",") !== old) moved = true;
    }

    return moved;
}

function moveDown() {
    let moved = false;

    for (let c = 0; c < SIZE; c++) {
        const col = grid.map(row => row[c]);
        const old = col.join(",");
        const movedCol = slide(col.reverse()).reverse();

        for (let r = 0; r < SIZE; r++) grid[r][c] = movedCol[r];
        if (movedCol.join(",") !== old) moved = true;
    }

    return moved;
}

document.addEventListener("keydown", function(event) {
    let moved = false;

    if (event.key === "ArrowLeft") moved = moveLeft();
    if (event.key === "ArrowRight") moved = moveRight();
    if (event.key === "ArrowUp") moved = moveUp();
    if (event.key === "ArrowDown") moved = moveDown();

    if (moved) {
        addTile();
        draw();
    }
});

restart2048();
