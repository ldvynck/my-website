const canvas = document.getElementById("pathCanvas");
const ctx = canvas.getContext("2d");
const stats = document.getElementById("pathStats");

const TOP_BAR_HEIGHT = 56;
const CELL = 18;

let cols;
let rows;
let grid;

let start = { r: 5, c: 5 };
let end = { r: 20, c: 35 };

let running = false;
let search = null;
let mouseDown = false;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - TOP_BAR_HEIGHT;

    cols = Math.floor(canvas.width / CELL);
    rows = Math.floor(canvas.height / CELL);

    resetGrid();
}

function createGrid() {
    return Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => ({
            wall: false,
            weight: 1,
            visited: false,
            frontier: false,
            path: false,
            parent: null,
            g: Infinity,
            h: 0,
            f: Infinity
        }))
    );
}

function resetGrid() {
    grid = createGrid();

    start = {
        r: Math.floor(rows / 2),
        c: Math.floor(cols * 0.2)
    };

    end = {
        r: Math.floor(rows / 2),
        c: Math.floor(cols * 0.8)
    };

    running = false;
    search = null;
    drawGrid();
    stats.textContent = "ready";
}

function clearSearch() {
    running = false;
    search = null;

    forEachCell((cell) => {
        cell.visited = false;
        cell.frontier = false;
        cell.path = false;
        cell.parent = null;
        cell.g = Infinity;
        cell.h = 0;
        cell.f = Infinity;
    });

    drawGrid();
    stats.textContent = "path cleared";
}

function clearWalls() {
    clearSearch();

    forEachCell((cell) => {
        cell.wall = false;
        cell.weight = 1;
    });

    drawGrid();
}

function forEachCell(callback) {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            callback(grid[r][c], r, c);
        }
    }
}

function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            drawCell(r, c);
        }
    }
}

function drawCell(r, c) {
    const cell = grid[r][c];
    const x = c * CELL;
    const y = r * CELL;

    if (cell.wall) {
        ctx.fillStyle = "#000000";
    } else if (r === start.r && c === start.c) {
        ctx.fillStyle = "#ffffff";
    } else if (r === end.r && c === end.c) {
        ctx.fillStyle = "#000000";
    } else if (cell.path) {
        ctx.fillStyle = "#4caf50";
    } else if (cell.frontier) {
        ctx.fillStyle = "#d9d9d9";
    } else if (cell.visited) {
        ctx.fillStyle = "#eeeeee";
    } else if (cell.weight > 1) {
        ctx.fillStyle = "#bbbbbb";
    } else {
        ctx.fillStyle = "#ffffff";
    }

    ctx.fillRect(x, y, CELL, CELL);

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 0.35;
    ctx.strokeRect(x, y, CELL, CELL);

    if (r === start.r && c === start.c) {
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 3, y + 3, CELL - 6, CELL - 6);
    }

    if (r === end.r && c === end.c) {
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 12px Courier New";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("E", x + CELL / 2, y + CELL / 2);
    }

    if (cell.weight > 1 && !cell.wall && !(r === start.r && c === start.c) && !(r === end.r && c === end.c)) {
        ctx.fillStyle = "#000000";
        ctx.font = "bold 10px Courier New";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(cell.weight, x + CELL / 2, y + CELL / 2);
    }
}

function getCellFromMouse(event) {
    const rect = canvas.getBoundingClientRect();

    return {
        c: Math.floor((event.clientX - rect.left) / CELL),
        r: Math.floor((event.clientY - rect.top) / CELL)
    };
}

function inside(r, c) {
    return r >= 0 && r < rows && c >= 0 && c < cols;
}

function paintCell(r, c) {
    if (!inside(r, c)) return;

    const tool = document.getElementById("toolSelect").value;

    if (tool === "start") {
        if (grid[r][c].wall) return;
        start = { r, c };
    }

    if (tool === "end") {
        if (grid[r][c].wall) return;
        end = { r, c };
    }

    if (r === start.r && c === start.c) return;
    if (r === end.r && c === end.c) return;

    if (tool === "wall") {
        grid[r][c].wall = true;
        grid[r][c].weight = 1;
    }

    if (tool === "erase") {
        grid[r][c].wall = false;
        grid[r][c].weight = 1;
    }

    if (tool === "weight") {
        grid[r][c].wall = false;
        grid[r][c].weight = 5;
    }

    clearSearchOnly();
    drawGrid();
}

function clearSearchOnly() {
    running = false;
    search = null;

    forEachCell((cell) => {
        cell.visited = false;
        cell.frontier = false;
        cell.path = false;
        cell.parent = null;
        cell.g = Infinity;
        cell.h = 0;
        cell.f = Infinity;
    });
}

function initSearch() {
    clearSearchOnly();

    const algorithm = document.getElementById("algorithmSelect").value;
    const startCell = grid[start.r][start.c];

    startCell.g = 0;
    startCell.h = heuristic(start, end);
    startCell.f = startCell.h;
    startCell.frontier = true;

    search = {
        algorithm,
        open: [{ r: start.r, c: start.c }],
        done: false,
        found: false,
        steps: 0
    };
}

function runPathfinding() {
    initSearch();
    running = true;
    stats.textContent = "running";
}

function stepSearch() {
    if (!search) initSearch();

    if (!search.done) {
        searchStep();
        drawGrid();
    }
}

function searchStep() {
    if (!search || search.done) return;

    if (search.open.length === 0) {
        search.done = true;
        search.found = false;
        running = false;
        stats.textContent = `no path | visited: ${search.steps}`;
        return;
    }

    const current = popNextNode();

    const currentCell = grid[current.r][current.c];
    currentCell.frontier = false;
    currentCell.visited = true;
    search.steps++;

    if (current.r === end.r && current.c === end.c) {
        search.done = true;
        search.found = true;
        running = false;
        tracePath(current);
        stats.textContent = `path found | visited: ${search.steps}`;
        return;
    }

    for (const next of getNeighbors(current.r, current.c)) {
        const nextCell = grid[next.r][next.c];

        if (nextCell.wall) continue;
        if (nextCell.visited) continue;

        const cost = currentCell.g + nextCell.weight;

        if (cost < nextCell.g) {
            nextCell.parent = current;
            nextCell.g = cost;
            nextCell.h = heuristic(next, end);
            nextCell.f = scoreNode(nextCell, search.algorithm);
            nextCell.frontier = true;

            if (!search.open.some(node => node.r === next.r && node.c === next.c)) {
                search.open.push(next);
            }
        }
    }

    stats.textContent = `visited: ${search.steps} | frontier: ${search.open.length}`;
}

function popNextNode() {
    let bestIndex = 0;
    let bestScore = Infinity;

    for (let i = 0; i < search.open.length; i++) {
        const node = search.open[i];
        const cell = grid[node.r][node.c];
        const score = scoreNode(cell, search.algorithm);

        if (score < bestScore) {
            bestScore = score;
            bestIndex = i;
        }
    }

    return search.open.splice(bestIndex, 1)[0];
}

function scoreNode(cell, algorithm) {
    if (algorithm === "bfs") return cell.g;
    if (algorithm === "dijkstra") return cell.g;
    if (algorithm === "greedy") return cell.h;
    if (algorithm === "astar") return cell.g + cell.h;
    return cell.f;
}

function heuristic(a, b) {
    return Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
}

function getNeighbors(r, c) {
    return [
        { r: r - 1, c },
        { r: r + 1, c },
        { r, c: c - 1 },
        { r, c: c + 1 }
    ].filter(cell => inside(cell.r, cell.c));
}

function tracePath(node) {
    let current = node;

    while (current) {
        grid[current.r][current.c].path = true;
        current = grid[current.r][current.c].parent;
    }
}

function applyPreset() {
    const preset = document.getElementById("presetSelect").value;

    clearWalls();

    if (preset === "maze") makeMaze();
    if (preset === "corridor") makeCorridor();
    if (preset === "rooms") makeRooms();
    if (preset === "weighted") makeWeightedField();

    clearSearch();
    drawGrid();
}

function makeMaze() {
    for (let r = 2; r < rows - 2; r++) {
        for (let c = 2; c < cols - 2; c++) {
            if (r % 4 === 0 || c % 6 === 0) {
                if (Math.random() > 0.18) {
                    grid[r][c].wall = true;
                }
            }
        }
    }

    grid[start.r][start.c].wall = false;
    grid[end.r][end.c].wall = false;
}

function makeCorridor() {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            grid[r][c].wall = true;
        }
    }

    const middle = Math.floor(rows / 2);

    for (let c = 2; c < cols - 2; c++) {
        grid[middle][c].wall = false;

        if (c % 10 < 5) {
            for (let r = middle - 5; r <= middle; r++) {
                if (inside(r, c)) grid[r][c].wall = false;
            }
        } else {
            for (let r = middle; r <= middle + 5; r++) {
                if (inside(r, c)) grid[r][c].wall = false;
            }
        }
    }

    start = { r: middle, c: 3 };
    end = { r: middle, c: cols - 4 };
}

function makeRooms() {
    for (let r = 3; r < rows - 3; r++) {
        for (let c = 3; c < cols - 3; c++) {
            if (r % 10 === 0 || c % 14 === 0) {
                grid[r][c].wall = true;
            }
        }
    }

    for (let r = 5; r < rows - 5; r += 10) {
        for (let c = 7; c < cols - 7; c += 14) {
            grid[r][c].wall = false;
            grid[r + 1][c].wall = false;
            grid[r][c + 1].wall = false;
        }
    }
}

function makeWeightedField() {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const d = Math.hypot(r - rows / 2, c - cols / 2);

            if (d < Math.min(rows, cols) * 0.22) {
                grid[r][c].weight = 8;
            } else if (Math.random() < 0.08) {
                grid[r][c].weight = 5;
            }
        }
    }
}

canvas.addEventListener("mousedown", function(event) {
    mouseDown = true;
    const cell = getCellFromMouse(event);
    paintCell(cell.r, cell.c);
});

canvas.addEventListener("mousemove", function(event) {
    if (!mouseDown) return;

    const cell = getCellFromMouse(event);
    paintCell(cell.r, cell.c);
});

window.addEventListener("mouseup", function() {
    mouseDown = false;
});

canvas.addEventListener("contextmenu", function(event) {
    event.preventDefault();
});

function loop() {
    if (running && search && !search.done) {
        const speed = Number(document.getElementById("speedInput").value);

        for (let i = 0; i < speed; i++) {
            searchStep();
            if (search.done) break;
        }

        drawGrid();
    }

    requestAnimationFrame(loop);
}

window.addEventListener("resize", resizeCanvas);

resizeCanvas();
drawGrid();
loop();
