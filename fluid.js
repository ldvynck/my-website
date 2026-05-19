const canvas = document.getElementById("fluidCanvas");
const ctx = canvas.getContext("2d");

const TOP_BAR_HEIGHT = 56;
const CELL = 8;

let cols;
let rows;
let density;
let nextDensity;
let vx;
let vy;
let nextVx;
let nextVy;
let obstacles;

let mouseX = 0;
let mouseY = 0;
let lastMouseX = 0;
let lastMouseY = 0;
let mouseDown = false;
let rightDown = false;
let obstacleMode = false;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - TOP_BAR_HEIGHT;

    cols = Math.floor(canvas.width / CELL);
    rows = Math.floor(canvas.height / CELL);

    density = createField();
    nextDensity = createField();
    vx = createField();
    vy = createField();
    nextVx = createField();
    nextVy = createField();
    obstacles = createField();
}

function createField() {
    return Array.from({ length: rows }, () => Array(cols).fill(0));
}

function clearFluid() {
    density = createField();
    nextDensity = createField();
    vx = createField();
    vy = createField();
    nextVx = createField();
    nextVy = createField();
}

function toggleObstacles() {
    obstacleMode = !obstacleMode;
    document.getElementById("obstacleButton").textContent =
        obstacleMode ? "obstacles: on" : "obstacles: off";
}

function addFluid(x, y) {
    const brush = Number(document.getElementById("brushSlider").value);
    const c0 = Math.floor(x / CELL);
    const r0 = Math.floor(y / CELL);

    for (let r = r0 - brush; r <= r0 + brush; r++) {
        for (let c = c0 - brush; c <= c0 + brush; c++) {
            if (!inside(r, c)) continue;

            const d = Math.hypot(c - c0, r - r0);
            if (d > brush) continue;

            if (obstacleMode) {
                obstacles[r][c] = 1;
                density[r][c] = 0;
                vx[r][c] = 0;
                vy[r][c] = 0;
            } else {
                density[r][c] = Math.min(1, density[r][c] + 0.35);
            }
        }
    }
}

function pushFluid(x, y, dx, dy) {
    const brush = Number(document.getElementById("brushSlider").value);
    const c0 = Math.floor(x / CELL);
    const r0 = Math.floor(y / CELL);

    for (let r = r0 - brush; r <= r0 + brush; r++) {
        for (let c = c0 - brush; c <= c0 + brush; c++) {
            if (!inside(r, c) || obstacles[r][c]) continue;

            const d = Math.hypot(c - c0, r - r0);
            if (d > brush) continue;

            const strength = (1 - d / brush) * 0.35;
            vx[r][c] += dx * strength;
            vy[r][c] += dy * strength;
        }
    }
}

function inside(r, c) {
    return r >= 0 && r < rows && c >= 0 && c < cols;
}

function stepFluid() {
    const viscosity = Number(document.getElementById("viscositySlider").value);

    clearField(nextDensity);
    clearField(nextVx);
    clearField(nextVy);

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (obstacles[r][c]) continue;

            const backX = c - vx[r][c];
            const backY = r - vy[r][c];

            const sampledDensity = sample(density, backY, backX);
            const sampledVx = sample(vx, backY, backX);
            const sampledVy = sample(vy, backY, backX);

            nextDensity[r][c] = sampledDensity * 0.995;
            nextVx[r][c] = sampledVx * viscosity;
            nextVy[r][c] = sampledVy * viscosity;
        }
    }

    [density, nextDensity] = [nextDensity, density];
    [vx, nextVx] = [nextVx, vx];
    [vy, nextVy] = [nextVy, vy];

    diffuseDensity();
}

function clearField(field) {
    for (let r = 0; r < rows; r++) {
        field[r].fill(0);
    }
}

function sample(field, y, x) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = x0 + 1;
    const y1 = y0 + 1;

    if (!inside(y0, x0)) return 0;

    const sx = x - x0;
    const sy = y - y0;

    const a = inside(y0, x0) ? field[y0][x0] : 0;
    const b = inside(y0, x1) ? field[y0][x1] : 0;
    const c = inside(y1, x0) ? field[y1][x0] : 0;
    const d = inside(y1, x1) ? field[y1][x1] : 0;

    return (
        a * (1 - sx) * (1 - sy) +
        b * sx * (1 - sy) +
        c * (1 - sx) * sy +
        d * sx * sy
    );
}

function diffuseDensity() {
    for (let r = 1; r < rows - 1; r++) {
        for (let c = 1; c < cols - 1; c++) {
            if (obstacles[r][c]) continue;

            density[r][c] =
                density[r][c] * 0.88 +
                (
                    density[r - 1][c] +
                    density[r + 1][c] +
                    density[r][c - 1] +
                    density[r][c + 1]
                ) * 0.03;
        }
    }
}

function drawFluid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const x = c * CELL;
            const y = r * CELL;

            if (obstacles[r][c]) {
                ctx.fillStyle = "#000000";
                ctx.fillRect(x, y, CELL, CELL);
                continue;
            }

            const d = density[r][c];

            if (d > 0.01) {
                const shade = Math.max(0, 255 - d * 255);
                ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
                ctx.fillRect(x, y, CELL, CELL);
            }
        }
    }
}

canvas.addEventListener("mousedown", function(event) {
    mouseDown = event.button === 0;
    rightDown = event.button === 2;

    lastMouseX = event.offsetX;
    lastMouseY = event.offsetY;
});

canvas.addEventListener("mousemove", function(event) {
    mouseX = event.offsetX;
    mouseY = event.offsetY;

    const dx = (mouseX - lastMouseX) / CELL;
    const dy = (mouseY - lastMouseY) / CELL;

    if (mouseDown) addFluid(mouseX, mouseY);
    if (rightDown) pushFluid(mouseX, mouseY, dx, dy);

    lastMouseX = mouseX;
    lastMouseY = mouseY;
});

window.addEventListener("mouseup", function() {
    mouseDown = false;
    rightDown = false;
});

canvas.addEventListener("contextmenu", function(event) {
    event.preventDefault();
});

function loop() {
    stepFluid();
    drawFluid();
    requestAnimationFrame(loop);
}

window.addEventListener("resize", resizeCanvas);

resizeCanvas();
loop();
