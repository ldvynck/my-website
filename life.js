const canvas = document.getElementById("lifeCanvas");
const ctx = canvas.getContext("2d");
const stats = document.getElementById("lifeStats");
const toggleButton = document.getElementById("lifeToggle");

const TOP_BAR_HEIGHT = 56;

const cellSize = 12;
const worldCols = 300;
const worldRows = 220;

let grid = createGrid();
let running = false;
let generation = 0;
let speedMs = 100;
let lastStepTime = 0;

let cameraX = 0;
let cameraY = 0;

let middleDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

let leftDragging = false;
let paintMode = 1;

let zoom = 1;

let rules = {
    birth: [3],
    survive: [2, 3],
    range: 1
};

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - TOP_BAR_HEIGHT;
}

function createGrid() {
    return Array.from({ length: worldRows }, () => Array(worldCols).fill(0));
}

function drawGrid() {
    const size = currentCellSize();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const startCol = Math.max(0, Math.floor(cameraX / size));
    const startRow = Math.max(0, Math.floor(cameraY / size));
    const endCol = Math.min(worldCols, startCol + Math.ceil(canvas.width / size) + 2);
    const endRow = Math.min(worldRows, startRow + Math.ceil(canvas.height / size) + 2);

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = size < 7 ? 0.2 : 0.4;

    for (let r = startRow; r < endRow; r++) {
        for (let c = startCol; c < endCol; c++) {
            const x = c * size - cameraX;
            const y = r * size - cameraY;

            if (grid[r][c] === 1) {
                ctx.fillStyle = "#000000";
                ctx.fillRect(x, y, size, size);
            }

            if (size >= 6) {
                ctx.strokeRect(x, y, size, size);
            }
        }
    }

    stats.textContent =
        `generation: ${generation} | speed: ${speedMs} ms | zoom: ${zoom.toFixed(2)}x | B${rules.birth.join("")}/S${rules.survive.join("")}/R${rules.range}`;
}

function currentCellSize() {
    return cellSize * zoom;
}

function countNeighbors(r, c) {
    let count = 0;
    const range = rules.range;

    for (let dr = -range; dr <= range; dr++) {
        for (let dc = -range; dc <= range; dc++) {
            if (dr === 0 && dc === 0) continue;

            const rr = r + dr;
            const cc = c + dc;

            if (rr >= 0 && rr < worldRows && cc >= 0 && cc < worldCols) {
                count += grid[rr][cc];
            }
        }
    }

    return count;
}

function stepLife() {
    const next = createGrid();

    for (let r = 0; r < worldRows; r++) {
        for (let c = 0; c < worldCols; c++) {
            const alive = grid[r][c] === 1;
            const neighbors = countNeighbors(r, c);

            if (!alive && rules.birth.includes(neighbors)) {
                next[r][c] = 1;
            }

            if (alive && rules.survive.includes(neighbors)) {
                next[r][c] = 1;
            }
        }
    }

    grid = next;
    generation++;
}

function screenToCell(x, y) {
    const size = currentCellSize();

    return {
        c: Math.floor((x + cameraX) / size),
        r: Math.floor((y + cameraY) / size)
    };
}

function parseRuleList(text) {
    return text
        .split(",")
        .map(value => Number(value.trim()))
        .filter(value => Number.isInteger(value) && value >= 0);
}

function updateRules() {
    const birthInput = document.getElementById("birthRule").value;
    const surviveInput = document.getElementById("surviveRule").value;
    const rangeInput = Number(document.getElementById("rangeRule").value);

    rules.birth = parseRuleList(birthInput);
    rules.survive = parseRuleList(surviveInput);
    rules.range = Math.max(1, Math.min(4, rangeInput));

    generation = 0;
    drawGrid();
}

function clampCamera() {
    const size = currentCellSize();

    cameraX = Math.max(0, Math.min(cameraX, worldCols * size - canvas.width));
    cameraY = Math.max(0, Math.min(cameraY, worldRows * size - canvas.height));
}

function paintCell(x, y) {
    const cell = screenToCell(x, y);

    if (cell.r < 0 || cell.r >= worldRows || cell.c < 0 || cell.c >= worldCols) return;

    grid[cell.r][cell.c] = paintMode;
}

function toggleLife() {
    running = !running;
    toggleButton.textContent = running ? "pause" : "start";
}

function speedUpLife() {
    speedMs = Math.max(10, speedMs - 20);
    drawGrid();
}

function slowDownLife() {
    speedMs = Math.min(1000, speedMs + 20);
    drawGrid();
}

function randomizeGrid() {
    grid = createGrid();

    for (let r = 0; r < worldRows; r++) {
        for (let c = 0; c < worldCols; c++) {
            grid[r][c] = Math.random() < 0.22 ? 1 : 0;
        }
    }

    generation = 0;
    drawGrid();
}

function clearGrid() {
    grid = createGrid();
    generation = 0;
    running = false;
    toggleButton.textContent = "start";
    drawGrid();
}

canvas.addEventListener("mousedown", function(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (event.button === 1) {
        middleDragging = true;
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
        event.preventDefault();
        return;
    }

    if (event.button === 0) {
        const cell = screenToCell(x, y);

        if (cell.r >= 0 && cell.r < worldRows && cell.c >= 0 && cell.c < worldCols) {
            paintMode = grid[cell.r][cell.c] === 1 ? 0 : 1;
            leftDragging = true;
            paintCell(x, y);
            drawGrid();
        }
    }
});

canvas.addEventListener("mousemove", function(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (middleDragging) {
        cameraX -= event.clientX - lastMouseX;
        cameraY -= event.clientY - lastMouseY;

	clampCamera();

        lastMouseX = event.clientX;
        lastMouseY = event.clientY;

        drawGrid();
        return;
    }

    if (leftDragging) {
        paintCell(x, y);
        drawGrid();
    }
});

canvas.addEventListener("wheel", function(event) {
    event.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const mouseCanvasX = event.clientX - rect.left;
    const mouseCanvasY = event.clientY - rect.top;

    const beforeZoomX = cameraX + mouseCanvasX;
    const beforeZoomY = cameraY + mouseCanvasY;

    const oldSize = currentCellSize();

    if (event.deltaY < 0) {
        zoom = Math.min(4, zoom * 1.1);
    } else {
        zoom = Math.max(0.35, zoom / 1.1);
    }

    const newSize = currentCellSize();
    const scale = newSize / oldSize;

    cameraX = beforeZoomX * scale - mouseCanvasX;
    cameraY = beforeZoomY * scale - mouseCanvasY;

    clampCamera();
    drawGrid();
});

window.addEventListener("mouseup", function() {
    middleDragging = false;
    leftDragging = false;
});

canvas.addEventListener("contextmenu", function(event) {
    event.preventDefault();
});

canvas.addEventListener("auxclick", function(event) {
    if (event.button === 1) {
        event.preventDefault();
    }
});

function loop(timestamp) {
    if (running && timestamp - lastStepTime >= speedMs) {
        stepLife();
        lastStepTime = timestamp;
    }

    drawGrid();
    requestAnimationFrame(loop);
}

window.addEventListener("resize", function() {
    resizeCanvas();
    drawGrid();
});

resizeCanvas();
drawGrid();
requestAnimationFrame(loop);
