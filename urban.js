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
let accessibilityDirty = true;

const landColors = {
    empty: "#ffffff",
    residential: "#b8d8ff",
    commercial: "#ffe08a",
    industrial: "#b8b8b8",
    mixed: "#d6b8ff",
    public: "#ffb8b8",
    green: "#b9e6b3",
    water: "#9fd8ff"
};

const roadWeight = {
    none: 0,
    local: 15,
    collector: 35,
    arterial: 60
};

let growthSettings = {
    neighbourWeight: 9,
    roadWeight: 0.55,
    landValueWeight: 0.18,
    randomWeight: 18,
    threshold: 78,
    densifyRate: 0.012
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
        roadDirection: "horizontal",
        zone: "any",
        protected: false,

        population: 0,
        households: 0,
        avgAge: 35,
        childrenShare: 20,
        workingShare: 60,
        elderlyShare: 20,
        income: 50,
        ses: "middle",
        carOwnership: 50,

        jobs: 0,
        jobType: "none",
        vacancyRate: 10,

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

    ctx.fillStyle = landColors[tile.landUse];
    ctx.fillRect(x, y, size, size);

    if (tile.zone !== "any" && size >= 7) {
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(x + 2, y + 2, size - 4, size - 4);
        ctx.setLineDash([]);
    }

    if (tile.protected) {
        ctx.fillStyle = "rgba(0,0,0,0.18)";
        ctx.fillRect(x, y, size, size);
    }

    if (tile.density > 0 && tile.landUse !== "empty") {
        ctx.fillStyle = "rgba(0,0,0," + Math.min(0.45, tile.density * 0.07) + ")";
        ctx.fillRect(x, y, size, size);
    }

    if (tile.road !== "none") {
        drawRoad(tile, x, y, size);
    }

    if (size >= 8) {
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

    if (tile.roadDirection === "horizontal" || tile.roadDirection === "intersection") {
        ctx.fillRect(x, y + size / 2 - w / 2, size, w);
    }

    if (tile.roadDirection === "vertical" || tile.roadDirection === "intersection") {
        ctx.fillRect(x + size / 2 - w / 2, y, w, size);
    }
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
        drawUrban();
        return;
    }

    if (tool === "land") {
        tile.landUse = document.getElementById("landUseSelect").value;
        tile.protected = false;

        if (tile.landUse === "water") {
            tile.road = "none";
        }

        initializeTileValues(tile);
    }

    if (tool === "road") {
        if (tile.landUse !== "water" && !tile.protected) {
            tile.road = document.getElementById("roadSelect").value;
            tile.roadDirection = document.getElementById("roadDirectionSelect").value;
            accessibilityDirty = true;
        }
    }

    if (tool === "zone") {
        tile.zone = document.getElementById("zoneSelect").value;
        if (tile.zone === "protected") tile.protected = true;
    }

    if (tool === "protect") {
        tile.protected = !tile.protected;
        if (tile.protected) {
            tile.road = "none";
            if (tile.landUse === "empty") tile.landUse = "green";
        }
        accessibilityDirty = true;
    }

    drawUrban();
}

function initializeTileValues(tile) {
    if (tile.landUse === "empty") {
        tile.density = 0;
        tile.population = 0;
        tile.households = 0;
        tile.jobs = 0;
        tile.jobType = "none";
        tile.pollution = 0;
        return;
    }

    if (tile.landUse === "residential") {
        tile.density = Math.max(tile.density, 2);
        tile.population = 38 * tile.density;
        tile.households = Math.round(tile.population / 2.2);
        tile.jobs = 4 * tile.density;
        tile.jobType = "local";
        tile.attractiveness += 4;
    }

    if (tile.landUse === "commercial") {
        tile.density = Math.max(tile.density, 2);
        tile.population = 4;
        tile.jobs = 75 * tile.density;
        tile.jobType = "retail/office";
        tile.landValue += 5;
    }

    if (tile.landUse === "industrial") {
        tile.density = Math.max(tile.density, 1);
        tile.population = 0;
        tile.jobs = 65 * tile.density;
        tile.pollution = Math.max(tile.pollution, 65);
        tile.jobType = "industrial";
        tile.attractiveness -= 10;
    }

    if (tile.landUse === "mixed") {
        tile.density = Math.max(tile.density, 3);
        tile.population = 32 * tile.density;
        tile.households = Math.round(tile.population / 2.1);
        tile.jobs = 35 * tile.density;
        tile.jobType = "mixed";
        tile.landValue += 8;
    }

    if (tile.landUse === "public") {
        tile.density = Math.max(tile.density, 1);
        tile.population = 0;
        tile.jobs = 30;
        tile.attractiveness = Math.min(100, tile.attractiveness + 15);
        tile.jobType = "public";
    }

    if (tile.landUse === "green") {
        tile.density = 0;
        tile.population = 0;
        tile.jobs = 2;
        tile.attractiveness = 85;
        tile.pollution = 0;
        tile.jobType = "recreation";
    }

    if (tile.landUse === "water") {
        tile.density = 0;
        tile.population = 0;
        tile.households = 0;
        tile.jobs = 0;
        tile.road = "none";
        tile.pollution = 0;
    }

    tile.income = clamp(tile.income, 0, 100);
    tile.landValue = clamp(tile.landValue, 0, 100);
    tile.attractiveness = clamp(tile.attractiveness, 0, 100);
    tile.ses = tile.income < 35 ? "low" : tile.income > 70 ? "high" : "middle";
}

function updateTileValues(tile) {
    if (tile.population > 0) {
        tile.avgAge = clamp(tile.avgAge + 0.03, 0, 100);
        tile.income = clamp(tile.income + (tile.landValue - 50) * 0.002 - tile.pollution * 0.001, 0, 100);
        tile.ses = tile.income < 35 ? "low" : tile.income > 70 ? "high" : "middle";
        tile.carOwnership = clamp(30 + tile.income * 0.6 - tile.accessibility * 0.15, 0, 100);
    }

    tile.landValue = clamp(
        tile.landValue + tile.accessibility * 0.015 + tile.attractiveness * 0.01 - tile.pollution * 0.02,
        0,
        100
    );
}

function selectTile(r, c) {
    selectedTile = { r, c };
    const tile = grid[r][c];

    document.getElementById("tileInfo").innerHTML =
        `row: ${r}, col: ${c}<br>` +
        `land: ${tile.landUse}<br>` +
        `road: ${tile.road} (${tile.roadDirection})<br>` +
        `zone: ${tile.zone}<br>` +
        `pop: ${tile.population}<br>` +
        `jobs: ${tile.jobs}<br>` +
        `SES: ${tile.ses}<br>` +
        `access: ${Math.round(tile.accessibility)}`;

    document.getElementById("editLandUse").value = tile.landUse;
    document.getElementById("editRoad").value = tile.road;
    document.getElementById("editRoadDirection").value = tile.roadDirection;
    document.getElementById("editZone").value = tile.zone;
    document.getElementById("densityInput").value = tile.density;
    document.getElementById("populationInput").value = tile.population;
    document.getElementById("jobsInput").value = tile.jobs;
    document.getElementById("incomeInput").value = tile.income;
    document.getElementById("ageInput").value = tile.avgAge;
    document.getElementById("valueInput").value = tile.landValue;
    document.getElementById("pollutionInput").value = tile.pollution;
    document.getElementById("attractivenessInput").value = tile.attractiveness;
    document.getElementById("protectedInput").checked = tile.protected;
}

function applyTileEdit() {
    if (!selectedTile) return;

    const tile = grid[selectedTile.r][selectedTile.c];

    tile.landUse = document.getElementById("editLandUse").value;
    tile.road = document.getElementById("editRoad").value;
    tile.roadDirection = document.getElementById("editRoadDirection").value;
    tile.zone = document.getElementById("editZone").value;
    tile.density = Number(document.getElementById("densityInput").value);
    tile.population = Number(document.getElementById("populationInput").value);
    tile.jobs = Number(document.getElementById("jobsInput").value);
    tile.income = Number(document.getElementById("incomeInput").value);
    tile.avgAge = Number(document.getElementById("ageInput").value);
    tile.landValue = Number(document.getElementById("valueInput").value);
    tile.pollution = Number(document.getElementById("pollutionInput").value);
    tile.attractiveness = Number(document.getElementById("attractivenessInput").value);
    tile.protected = document.getElementById("protectedInput").checked;

    if (tile.landUse === "water" || tile.protected) {
        tile.road = "none";
    }

    tile.ses = tile.income < 35 ? "low" : tile.income > 70 ? "high" : "middle";

    accessibilityDirty = true;
    selectTile(selectedTile.r, selectedTile.c);
    drawUrban();
}

function stepUrban() {
    if (accessibilityDirty) {
        computeAccessibility();
        accessibilityDirty = false;
    }

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
            neighbours.urban * growthSettings.neighbourWeight +
            tile.accessibility * growthSettings.roadWeight +
            tile.landValue * growthSettings.landValueWeight +
            neighbours.jobs * 0.08 +
            Math.random() * growthSettings.randomWeight;

        if (growthScore > growthSettings.threshold) {
            const newUse = chooseGrowthUse(neighbours, tile);
            if (allowedByZone(tile, newUse)) {
                tile.landUse = newUse;
                tile.density = 1;
                tile.developmentAge = 0;
                initializeTileValues(tile);
            }
        }
    } else {
        tile.developmentAge++;

        const densifyChance =
            neighbours.urban * growthSettings.densifyRate +
            tile.accessibility * 0.0015 +
            tile.landValue * 0.0008;

        if (Math.random() < densifyChance && tile.density < 5) {
            tile.density++;
            initializeTileValues(tile);
        }

        tile.pollution = clamp(tile.pollution + neighbours.industrial * 0.4 - neighbours.green * 0.25, 0, 100);
        updateTileValues(tile);
    }
}

function allowedByZone(tile, landUse) {
    if (tile.zone === "any") return true;
    if (tile.zone === "protected") return false;
    if (tile.zone === "mixed") return ["residential", "commercial", "mixed", "public"].includes(landUse);
    return tile.zone === landUse;
}

function chooseGrowthUse(neighbours, tile) {
    const roll = Math.random();

    if (tile.accessibility > 65 && roll < 0.25) return "commercial";
    if (neighbours.industrial > 1 && tile.accessibility > 45 && roll < 0.35) return "industrial";
    if (neighbours.commercial > 1 && roll < 0.5) return "mixed";
    if (roll < 0.78) return "residential";
    if (roll < 0.9) return "mixed";
    return "public";
}

function getNeighbourStats(r, c) {
    let urban = 0;
    let commercial = 0;
    let industrial = 0;
    let green = 0;
    let jobs = 0;

    for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
            if (dr === 0 && dc === 0) continue;

            const rr = r + dr;
            const cc = c + dc;

            if (!insideGrid(rr, cc)) continue;

            const tile = grid[rr][cc];
            const land = tile.landUse;
            const distance = Math.max(1, Math.abs(dr) + Math.abs(dc));

            if (!["empty", "green", "water"].includes(land)) urban += 1 / distance;
            if (land === "commercial") commercial += 1 / distance;
            if (land === "industrial") industrial += 1 / distance;
            if (land === "green") green += 1 / distance;

            jobs += tile.jobs / distance;
        }
    }

    return { urban, commercial, industrial, green, jobs };
}

function computeAccessibility() {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            let score = roadWeight[grid[r][c].road];

            for (let dr = -5; dr <= 5; dr++) {
                for (let dc = -5; dc <= 5; dc++) {
                    const rr = r + dr;
                    const cc = c + dc;

                    if (!insideGrid(rr, cc)) continue;

                    const distance = Math.abs(dr) + Math.abs(dc);
                    if (distance === 0) continue;

                    score += roadWeight[grid[rr][cc].road] / (distance * 2.2);
                }
            }

            grid[r][c].accessibility = Math.min(100, score);
        }
    }
}

function randomScenario() {
    const preset = document.getElementById("presetSelect").value;
    grid = createGrid();

    if (preset === "compact") makeCompactCity();
    if (preset === "sprawl") makeSprawlCity();
    if (preset === "industrial") makeIndustrialCorridor();
    if (preset === "river") makeRiverCity();
    if (preset === "greenbelt") makeGreenbeltCity();

    computeAccessibility();
    accessibilityDirty = false;
    generation = 0;
    drawUrban();
}

function applyPreset() {
    randomScenario();
}

function makeCompactCity() {
    const cx = Math.floor(cols / 2);
    const cy = Math.floor(rows / 2);

    forEachTile((tile, r, c) => {
        const d = Math.hypot(c - cx, r - cy);

        if (r === cy || c === cx) {
            tile.road = "arterial";
            tile.roadDirection = r === cy ? "horizontal" : "vertical";
        } else if (r % 12 === 0) {
            tile.road = "collector";
            tile.roadDirection = "horizontal";
        } else if (c % 12 === 0) {
            tile.road = "collector";
            tile.roadDirection = "vertical";
        }

        if (d < 10) tile.landUse = "commercial";
        else if (d < 20) tile.landUse = "mixed";
        else if (d < 35) tile.landUse = "residential";
        else if (Math.random() < 0.08) tile.landUse = "green";

        tile.density = d < 20 ? 4 : d < 35 ? 2 : 0;
        randomSocio(tile);
        initializeTileValues(tile);
    });
}

function makeSprawlCity() {
    forEachTile((tile, r, c) => {
        if (r % 18 === 0) {
            tile.road = "collector";
            tile.roadDirection = "horizontal";
        }
        if (c % 24 === 0) {
            tile.road = "collector";
            tile.roadDirection = tile.road === "collector" ? "intersection" : "vertical";
        }

        if (Math.random() < 0.18) tile.landUse = "residential";
        else if (Math.random() < 0.04) tile.landUse = "commercial";
        else if (Math.random() < 0.1) tile.landUse = "green";

        tile.density = tile.landUse === "residential" ? 1 : 0;
        randomSocio(tile);
        initializeTileValues(tile);
    });
}

function makeIndustrialCorridor() {
    const corridor = Math.floor(rows * 0.55);

    forEachTile((tile, r, c) => {
        if (r === corridor) {
            tile.road = "arterial";
            tile.roadDirection = "horizontal";
        }

        if (Math.abs(r - corridor) < 6 && Math.random() < 0.45) tile.landUse = "industrial";
        else if (Math.abs(r - corridor) < 12 && Math.random() < 0.22) tile.landUse = "commercial";
        else if (Math.random() < 0.12) tile.landUse = "residential";
        else if (Math.random() < 0.08) tile.landUse = "green";

        randomSocio(tile);
        initializeTileValues(tile);
    });
}

function makeRiverCity() {
    const riverX = Math.floor(cols * 0.45);

    forEachTile((tile, r, c) => {
        const riverOffset = Math.round(Math.sin(r * 0.08) * 8);
        const rx = riverX + riverOffset;

        if (Math.abs(c - rx) < 3) {
            tile.landUse = "water";
        } else if (Math.abs(c - rx) < 8) {
            tile.landUse = "green";
            tile.protected = Math.random() < 0.35;
        } else if (r % 16 === 0) {
            tile.road = "collector";
            tile.roadDirection = "horizontal";
        } else if (c % 20 === 0) {
            tile.road = "collector";
            tile.roadDirection = "vertical";
        }

        if (tile.landUse === "empty" && Math.random() < 0.16) tile.landUse = "residential";
        if (tile.landUse === "empty" && Math.random() < 0.04) tile.landUse = "commercial";

        randomSocio(tile);
        initializeTileValues(tile);
    });
}

function makeGreenbeltCity() {
    const cx = Math.floor(cols / 2);
    const cy = Math.floor(rows / 2);

    forEachTile((tile, r, c) => {
        const d = Math.hypot(c - cx, r - cy);

        if (d > 35 && d < 45) {
            tile.landUse = "green";
            tile.protected = true;
            tile.zone = "protected";
        } else if (d < 18) {
            tile.landUse = "mixed";
            tile.density = 3;
        } else if (d < 32) {
            tile.landUse = "residential";
            tile.density = 2;
        }

        if (r === cy || c === cx) {
            tile.road = "arterial";
            tile.roadDirection = r === cy && c === cx ? "intersection" : r === cy ? "horizontal" : "vertical";
        }

        randomSocio(tile);
        initializeTileValues(tile);
    });
}

function forEachTile(callback) {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            callback(grid[r][c], r, c);
        }
    }
}

function randomSocio(tile) {
    tile.income = Math.round(25 + Math.random() * 60);
    tile.avgAge = Math.round(22 + Math.random() * 45);
    tile.landValue = Math.round(20 + Math.random() * 70);
    tile.attractiveness = Math.round(30 + Math.random() * 60);
    tile.ses = tile.income < 35 ? "low" : tile.income > 70 ? "high" : "middle";
}

function clearUrban() {
    grid = createGrid();
    generation = 0;
    running = false;
    accessibilityDirty = true;
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
    let congestion = 0;

    forEachTile((tile) => {
        population += tile.population;
        jobs += tile.jobs;

        if (!["empty", "green", "water"].includes(tile.landUse)) urban++;
        if (tile.landUse === "green" || tile.protected) green++;

        pollutionExposure += tile.pollution * tile.population;

        if (tile.population > 0) {
            incomeTotal += tile.income;
            incomeCount++;
        }

        if (tile.road !== "none") {
            congestion += Math.max(0, tile.population + tile.jobs - roadWeight[tile.road] * 8);
        }
    });

    const urbanShare = ((urban / (rows * cols)) * 100).toFixed(1);
    const greenShare = ((green / (rows * cols)) * 100).toFixed(1);
    const avgIncome = incomeCount > 0 ? Math.round(incomeTotal / incomeCount) : 0;
    const exposure = population > 0 ? Math.round(pollutionExposure / population) : 0;

    stats.textContent =
        `year: ${generation} | pop: ${population} | jobs: ${jobs} | urban: ${urbanShare}% | green: ${greenShare}% | income: ${avgIncome} | pollution: ${exposure} | congestion: ${Math.round(congestion)}`;
}

function clampCamera() {
    const size = cellSize();

    cameraX = Math.max(0, Math.min(cameraX, Math.max(0, cols * size - canvas.width)));
    cameraY = Math.max(0, Math.min(cameraY, Math.max(0, rows * size - canvas.height)));
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
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
