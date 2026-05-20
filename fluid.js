const canvas = document.getElementById("fluidCanvas");
const ctx = canvas.getContext("2d");

const TOP_BAR_HEIGHT = 56;
const CELL = 6;

let cols;
let rows;
let grid;
let nextGrid;

let mouseDown = false;
let rightDown = false;
let obstacleMode = false;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - TOP_BAR_HEIGHT;

    cols = Math.floor(canvas.width / CELL);
    rows = Math.floor(canvas.height / CELL);

    grid = createGrid();
    nextGrid = createGrid();
}

function createGrid() {
    return Array.from({ length: rows }, () => Array(cols).fill(0));
}

function clearFluid() {
    grid = createGrid();
    nextGrid = createGrid();
}

function toggleObstacles() {
    obstacleMode = !obstacleMode;
    document.getElementById("obstacleButton").textContent =
        obstacleMode ? "obstacles: on" : "obstacles: off";
}

function inside(r, c) {
    return r >= 0 && r < rows && c >= 0 && c < cols;
}

function paint(x, y, value) {
    const brush = Number(document.getElementById("brushSlider").value);
    const c0 = Math.floor(x / CELL);
    const r0 = Math.floor(y / CELL);

    for (let r = r0 - brush; r <= r0 + brush; r++) {
        for (let c = c0 - brush; c <= c0 + brush; c++) {
            if (!inside(r, c)) continue;
            if (Math.hypot(c - c0, r - r0) > brush) continue;

            grid[r][c] = value;
        }
    }
}

function stepWater() {
    nextGrid = grid.map(row => [...row]);

    for (let r = rows - 2; r >= 0; r--) {
        for (let c = 1; c < cols - 1; c++) {
            if (grid[r][c] !== 1) continue;

            if (grid[r + 1][c] === 0) {
                nextGrid[r][c] = 0;
                nextGrid[r + 1][c] = 1;
            } else {
                const dirs = Math.random() < 0.5 ? [-1, 1] : [1, -1];

                for (const dir of dirs) {
                    if (grid[r + 1][c + dir] === 0) {
                        nextGrid[r][c] = 0;
                        nextGrid[r + 1][c + dir] = 1;
                        break;
                    }

                    if (grid[r][c + dir] === 0 && grid[r + 1][c] !== 0) {
                        nextGrid[r][c] = 0;
                        nextGrid[r][c + dir] = 1;
                        break;
                    }
                }
            }
        }
    }

    grid = nextGrid;
}

function drawWater() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] === 0) continue;

            const x = c * CELL;
            const y = r * CELL;

            if (grid[r][c] === 1) ctx.fillStyle = "#4aa3ff";
            if (grid[r][c] === 2) ctx.fillStyle = "#000000";

            ctx.fillRect(x, y, CELL, CELL);
        }
    }
}

canvas.addEventListener("mousedown", function(event) {
    mouseDown = event.button === 0;
    rightDown = event.button === 2;

    const value = obstacleMode ? 2 : 1;

    if (mouseDown) paint(event.offsetX, event.offsetY, value);
    if (rightDown) paint(event.offsetX, event.offsetY, 0);
});

canvas.addEventListener("mousemove", function(event) {
    const value = obstacleMode ? 2 : 1;

    if (mouseDown) paint(event.offsetX, event.offsetY, value);
    if (rightDown) paint(event.offsetX, event.offsetY, 0);
});

window.addEventListener("mouseup", function() {
    mouseDown = false;
    rightDown = false;
});

canvas.addEventListener("contextmenu", function(event) {
    event.preventDefault();
});

function loop() {
    const viscosity = Number(document.getElementById("viscositySlider").value);
    const steps = Math.round((1 - viscosity) * 140) + 1;

    for (let i = 0; i < steps; i++) stepWater();

    drawWater();
    requestAnimationFrame(loop);
}

window.addEventListener("resize", resizeCanvas);

resizeCanvas();
loop();
