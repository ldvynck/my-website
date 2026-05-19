const canvas = document.getElementById("urbanCanvas");
const ctx = canvas.getContext("2d");

const stats = document.getElementById("urbanStats");
const toggleButton = document.getElementById("urbanToggle");

const TOP_BAR_HEIGHT = 56;

const cols = 220;
const rows = 160;
const baseCellSize = 12;

let zoom = 1;
let cameraX = 0;
let cameraY = 0;

let running = false;
let generation = 0;
let lastStep = 0;

let middleDragging = false;
let leftDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

let selectedTile = null;

const landColors = {
    empty: "#ffffff",
    residential: "#b8d8ff",
    commercial: "#ffe08a",
    industrial: "#b8b8b8",
    mixed: "#d6b8ff",
    public: "#ffb8b8",
    green: "#b9e6b3",
    protected: "#7fc97f",
    water: "#9fd8ff"
};

const roadWeight = {
    none: 0,
    local: 15,
    collector: 30,
    arterial: 50
};

let grid = createGrid();

function createGrid() {
    return Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => createTile())
    );
}

function createTile() {
    return {
        landUse: "empty",
        density: 0,
        road: "none",
        protected: false,
        population: 0,
        households: 0,
        avgAge: 35,
        income: 50,
        ses: "middle",
        carOwnership: 50,
        jobs: 0,
        jobType: "none",
        landValue: 50,
        accessibility: 0,
        attractiveness: 50,
        pollution: 0,
        developmentAge: 0
    };
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - TOP_BAR_HEIGHT;
}

function cellSize() {
    return baseCellSize * zoom;
}

function drawUrban() {
    const size = cellSize();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const startCol = Math.max(0, Math.floor(cameraX / size));
    const startRow = Math.max(0, Math.floor(cameraY / size));
    const endCol = Math.min(cols, startCol + Math.ceil(canvas.width / size) + 2);
    const endRow = Math.min(rows, startRow + Math.ceil(canvas.height / size) + 2);

    for (let r = startRow; r < endRow; r++) {
        for (let c = startCol; c < endCol; c++) {
            drawTile(r, c, size);
        }
    }

    updateStats();
}

function drawTile(r, c, size) {
    const tile = grid[r][c];
    const x = c * size - cameraX;
    const y = r * size - cameraY;

    let fill = tile.protected ? landColors.protected : landColors[tile.landUse];

    ctx.fillStyle = fill;
    ctx.fillRect(x, y, size, size);

    if (tile.density > 0 && tile.landUse !== "empty") {
        ctx.fillStyle = "rgba(0,0,0," + Math.min(0.55, tile.density * 0.09) + ")";
        ctx.fillRect(x, y, size, size);
    }

    if (tile.road !== "none") {
        drawRoad(tile, x, y, size);
    }

    if (size >= 7) {
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 0.25;
        ctx.strokeRect(x, y, size, size);
    }

    if (selectedTile && selectedTile.r === r && selectedTile.c === c) {
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 2, y + 2, size - 4, size - 4);
    }
}

function drawRoad(tile, x, y, size) {
    ctx.fillStyle = "#000000";

    const w = tile.road === "arterial" ? size * 0.45 :
              tile.road === "collector" ? size * 0.32 :
              size * 0.22;

    ctx.fillRect(x, y + size / 2 - w / 2, size, w);
    ctx.fillRect(x + size / 2 - w / 2, y, w, size);
}

function screenToCell(x, y) {
    const size = cellSize();

    return {
        c: Math.floor((x + cameraX) / size),
        r: Math.floor((y + cameraY) / size)
    };
}

function insideGrid(r, c) {
    return r >= 0 && r < rows && c >= 0 && c < cols;
}

function paintTile(x, y) {
    const cell = screenToCell(x, y);
    if (!insideGrid(cell.r, cell.c)) return;

    const tile = grid[cell.r][cell.c];
    const tool = document.getElementById("toolSelect").value;

    if (tool === "inspect") {
        selectTile(cell.r, cell.c);
        return;
    }

    if (tool === "land") {
        tile.landUse = document.getElementById("landUseSelect").value;
        tile.protected = tile.landUse === "protected";
        applyDefaultValues(tile);
    }

    if (tool === "road") {
        tile.road = document.getElementById("roadSelect").value;
    }

    if (tool === "protected") {
        tile.protected = !tile.protected;
        if (tile.protected) tile.landUse = "green";
    }

    drawUrban();
}

function applyDefaultValues(tile) {
    if (tile.landUse === "residential") {
        tile.density = Math.max(tile.density, 2);
        tile.population = 40 * tile.density;
        tile.households = Math.round(tile.population / 2.2);
        tile.jobs = 5;
    }

    if (tile.landUse === "commercial") {
        tile.density = Math.max(tile.density, 2);
        tile.population = 5;
        tile.jobs = 80 * tile.density;
        tile.jobType = "retail/office";
    }

    if (tile.landUse === "industrial") {
        tile.density = Math.max(tile.density, 1);
        tile.population = 0;
        tile.jobs = 60 * tile.density;
        tile.pollution = 70;
        tile.jobType = "industrial";
    }

    if (tile.landUse === "mixed") {
        tile.density = Math.max(tile.density, 3);
        tile.population = 35 * tile.density;
        tile.jobs = 35 * tile.density;
        tile.jobType = "mixed";
    }

    if (tile.landUse === "public") {
        tile.jobs = 30;
        tile.attractiveness = 70;
        tile.jobType = "public";
    }

    if (tile.landUse === "green") {
        tile.population = 0;
        tile.jobs = 2;
        tile.attractiveness = 80;
        tile.pollution = 0;
    }

    if (tile.landUse === "water") {
        tile.population = 0;
        tile.jobs = 0;
        tile.density = 0;
    }
}

function selectTile(r, c) {
    selectedTile = { r, c };
    const tile = grid[r][c];

    document.getElementById("tileInfo").innerHTML =
        `land: ${tile.landUse}<br>` +
        `road: ${tile.road}<br>` +
        `pop: ${tile.population}<br>` +
        `jobs: ${tile.jobs}<br>` +
        `SES: ${tile.ses}<br>` +
        `access: ${Math.round(tile.accessibility)}`;

    document.getElementById("densityInput").value = tile.density;
    document.getElementById("incomeInput").value = tile.income;
    document.getElementById("ageInput").value = tile.avgAge;
    document.getElementById("valueInput").value = tile.landValue;
}

function applyTileEdit() {
    if (!selectedTile) return;

    const tile = grid[selectedTile.r][selectedTile.c];

    tile.density = Number(document.getElementById("densityInput").value);
    tile.income = Number(document.getElementById("incomeInput").value);
    tile.avgAge = Number(document.getElementById("ageInput").value);
    tile.landValue = Number(document.getElementById("valueInput").value);

    tile.ses = tile.income < 35 ? "low" : tile.income > 70 ? "high" : "middle";

    applyDefaultValues(tile);
    selectTile(selectedTile.r, selectedTile.c);
    drawUrban();
}

function stepUrban() {
    computeAccessibility();

    const next = cloneGrid();

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            updateTile(r, c, next[r][c]);
        }
    }

    grid = next;
    generation++;
    drawUrban();
}

function cloneGrid() {
    return grid.map(row => row.map(tile => ({ ...tile })));
}

function updateTile(r, c, tile) {
    if (tile.protected || tile.landUse === "water") return;

    const neighbours = getNeighbourStats(r, c);

    if (tile.landUse === "empty") {
        const growthScore =
            neighbours.urban * 8 +
            tile.accessibility * 0.5 +
            neighbours.commercial * 5 +
            Math.random() * 35;

        if (growthScore > 70) {
            tile.landUse = chooseGrowthUse(neighbours);
            tile.density = 1;
            tile.developmentAge = 0;
            applyDefaultValues(tile);
        }
    } else {
        tile.developmentAge++;

        const densifyChance =
            neighbours.urban * 0.01 +
            tile.accessibility * 0.002 +
            tile.landValue * 0.001;

        if (Math.random() < densifyChance && tile.density < 5) {
            tile.density++;
            applyDefaultValues(tile);
        }

        tile.pollution = Math.min(100, tile.pollution + neighbours.industrial * 2);
        tile.landValue = Math.max(0, Math.min(100, tile.landValue + tile.accessibility * 0.02 - tile.pollution * 0.01));
    }
}

function chooseGrowthUse(neighbours) {
    const roll = Math.random();

    if (neighbours.industrial > 1 && roll < 0.25) return "industrial";
    if (neighbours.commercial > 1 && roll < 0.45) return "commercial";
    if (roll < 0.70) return "residential";
    if (roll < 0.88) return "mixed";
    return "public";
}

function getNeighbourStats(r, c) {
    let urban = 0;
    let commercial = 0;
    let industrial = 0;
    let green = 0;

    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;

            const rr = r + dr;
            const cc = c + dc;

            if (!insideGrid(rr, cc)) continue;

            const land = grid[rr][cc].landUse;

            if (!["empty", "green", "water"].includes(land)) urban++;
            if (land === "commercial") commercial++;
            if (land === "industrial") industrial++;
            if (land === "green") green++;
        }
    }

    return { urban, commercial, industrial, green };
}

function computeAccessibility() {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            let score = roadWeight[grid[r][c].road];

            for (let dr = -3; dr <= 3; dr++) {
                for (let dc = -3; dc <= 3; dc++) {
                    const rr = r + dr;
                    const cc = c + dc;

                    if (!insideGrid(rr, cc)) continue;

                    const distance = Math.abs(dr) + Math.abs(dc);
                    if (distance === 0) continue;

                    score += roadWeight[grid[rr][cc].road] / (distance * 2);
                }
            }

            grid[r][c].accessibility = Math.min(100, score);
        }
    }
}

function randomScenario() {
    grid = createGrid();

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const tile = grid[r][c];

            const roll = Math.random();

            if (roll < 0.08) tile.landUse = "water";
            else if (roll < 0.18) tile.landUse = "green";
            else if (roll < 0.24) tile.landUse = "residential";
            else if (roll < 0.28) tile.landUse = "commercial";
            else if (roll < 0.31) tile.landUse = "industrial";
            else tile.landUse = "empty";

            if (Math.random() < 0.04) tile.protected = true;

            if (r % 22 === 0 || c % 28 === 0) tile.road = "arterial";
            else if (r % 11 === 0 || c % 14 === 0) tile.road = Math.random() < 0.5 ? "collector" : "none";
            else if (Math.random() < 0.03) tile.road = "local";

            tile.income = Math.round(25 + Math.random() * 60);
            tile.avgAge = Math.round(20 + Math.random() * 45);
            tile.landValue = Math.round(20 + Math.random() * 70);
            tile.ses = tile.income < 35 ? "low" : tile.income > 70 ? "high" : "middle";

            applyDefaultValues(tile);
        }
    }

    generation = 0;
    drawUrban();
}

function clearUrban() {
    grid = createGrid();
    generation = 0;
    running = false;
    toggleButton.textContent = "start";
    drawUrban();
}

function toggleUrban() {
    running = !running;
    toggleButton.textContent = running ? "pause" : "start";
}

function updateStats() {
    let population = 0;
    let jobs = 0;
    let urban = 0;
    let green = 0;
    let pollutionExposure = 0;
    let incomeTotal = 0;
    let incomeCount = 0;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const tile = grid[r][c];

            population += tile.population;
            jobs += tile.jobs;

            if (!["empty", "green", "water"].includes(tile.landUse)) urban++;
            if (tile.landUse === "green" || tile.protected) green++;

            pollutionExposure += tile.pollution * tile.population;

            if (tile.population > 0) {
                incomeTotal += tile.income;
                incomeCount++;
            }
        }
    }

    const urbanShare = ((urban / (rows * cols)) * 100).toFixed(1);
    const greenShare = ((green / (rows * cols)) * 100).toFixed(1);
    const avgIncome = incomeCount > 0 ? Math.round(incomeTotal / incomeCount) : 0;
    const exposure = population > 0 ? Math.round(pollutionExposure / population) : 0;

    stats.textContent =
        `year: ${generation} | population: ${population} | jobs: ${jobs} | urban: ${urbanShare}% | green: ${greenShare}% | avg income: ${avgIncome} | pollution exposure: ${exposure}`;
}

function clampCamera() {
    const size = cellSize();

    cameraX = Math.max(0, Math.min(cameraX, cols * size - canvas.width));
    cameraY = Math.max(0, Math.min(cameraY, rows * size - canvas.height));
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
        leftDragging = true;
        paintTile(x, y);
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

        drawUrban();
        return;
    }

    if (leftDragging) {
        paintTile(x, y);
    }
});

window.addEventListener("mouseup", function() {
    middleDragging = false;
    leftDragging = false;
});

canvas.addEventListener("wheel", function(event) {
    event.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const beforeX = cameraX + x;
    const beforeY = cameraY + y;

    const oldSize = cellSize();

    if (event.deltaY < 0) zoom = Math.min(4, zoom * 1.1);
    else zoom = Math.max(0.4, zoom / 1.1);

    const scale = cellSize() / oldSize;

    cameraX = beforeX * scale - x;
    cameraY = beforeY * scale - y;

    clampCamera();
    drawUrban();
});

canvas.addEventListener("contextmenu", function(event) {
    event.preventDefault();
});

function loop(timestamp) {
    const speed = Number(document.getElementById("speedInput").value);

    if (running && timestamp - lastStep > speed) {
        stepUrban();
        lastStep = timestamp;
    }

    requestAnimationFrame(loop);
}

window.addEventListener("resize", function() {
    resizeCanvas();
    clampCamera();
    drawUrban();
});

resizeCanvas();
randomScenario();
requestAnimationFrame(loop);
