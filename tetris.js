const canvas = document.getElementById("tetrisCanvas");
const ctx = canvas.getContext("2d");

const scoreText = document.getElementById("tetrisScore");
const linesText = document.getElementById("tetrisLines");
const levelText = document.getElementById("tetrisLevel");
const messageText = document.getElementById("tetrisMessage");

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

let board;
let piece;
let nextPiece;
let score;
let lines;
let level;
let dropCounter;
let dropInterval;
let lastTime;
let gameOver;
let paused;

const SHAPES = {
    I: [[1, 1, 1, 1]],
    O: [
        [1, 1],
        [1, 1]
    ],
    T: [
        [0, 1, 0],
        [1, 1, 1]
    ],
    S: [
        [0, 1, 1],
        [1, 1, 0]
    ],
    Z: [
        [1, 1, 0],
        [0, 1, 1]
    ],
    J: [
        [1, 0, 0],
        [1, 1, 1]
    ],
    L: [
        [0, 0, 1],
        [1, 1, 1]
    ]
};

const TYPES = Object.keys(SHAPES);

function createBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function randomPiece() {
    const type = TYPES[Math.floor(Math.random() * TYPES.length)];

    return {
        type,
        shape: SHAPES[type].map(row => [...row]),
        x: Math.floor(COLS / 2) - 1,
        y: 0
    };
}

function restartTetris() {
    board = createBoard();
    piece = randomPiece();
    nextPiece = randomPiece();
    score = 0;
    lines = 0;
    level = 1;
    dropCounter = 0;
    dropInterval = 900;
    lastTime = 0;
    gameOver = false;
    paused = false;
    messageText.textContent = "playing";
    updateUi();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawBoardGrid();
    drawMatrix(board, 0, 0, false);

    if (!gameOver) {
        drawMatrix(piece.shape, piece.x, piece.y, true);
    }
}

function drawBoardGrid() {
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;

    for (let x = 0; x <= COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x * BLOCK, 0);
        ctx.lineTo(x * BLOCK, canvas.height);
        ctx.stroke();
    }

    for (let y = 0; y <= ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * BLOCK);
        ctx.lineTo(canvas.width, y * BLOCK);
        ctx.stroke();
    }
}

function drawMatrix(matrix, offsetX, offsetY, active) {
    for (let y = 0; y < matrix.length; y++) {
        for (let x = 0; x < matrix[y].length; x++) {
            if (!matrix[y][x]) continue;

            const px = (x + offsetX) * BLOCK;
            const py = (y + offsetY) * BLOCK;

            ctx.fillStyle = active ? "#000000" : "#ffffff";
            ctx.fillRect(px, py, BLOCK, BLOCK);

            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 3;
            ctx.strokeRect(px, py, BLOCK, BLOCK);

            if (active) {
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 2;
                ctx.strokeRect(px + 6, py + 6, BLOCK - 12, BLOCK - 12);
            }
        }
    }
}

function collide(testPiece = piece) {
    for (let y = 0; y < testPiece.shape.length; y++) {
        for (let x = 0; x < testPiece.shape[y].length; x++) {
            if (!testPiece.shape[y][x]) continue;

            const bx = testPiece.x + x;
            const by = testPiece.y + y;

            if (bx < 0 || bx >= COLS || by >= ROWS) return true;
            if (by >= 0 && board[by][bx]) return true;
        }
    }

    return false;
}

function mergePiece() {
    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (piece.shape[y][x]) {
                board[piece.y + y][piece.x + x] = 1;
            }
        }
    }
}

function clearLines() {
    let cleared = 0;

    outer:
    for (let y = ROWS - 1; y >= 0; y--) {
        for (let x = 0; x < COLS; x++) {
            if (!board[y][x]) continue outer;
        }

        board.splice(y, 1);
        board.unshift(Array(COLS).fill(0));
        cleared++;
        y++;
    }

    if (cleared > 0) {
        lines += cleared;
        score += [0, 100, 300, 500, 800][cleared] * level;
        level = Math.floor(lines / 10) + 1;
        dropInterval = Math.max(100, 900 - (level - 1) * 80);
        updateUi();
    }
}

function spawnPiece() {
    piece = nextPiece;
    nextPiece = randomPiece();

    piece.x = Math.floor(COLS / 2) - 1;
    piece.y = 0;

    if (collide()) {
        gameOver = true;
        messageText.textContent = "game over";
    }
}

function movePiece(dir) {
    if (gameOver || paused) return;

    piece.x += dir;

    if (collide()) {
        piece.x -= dir;
    }
}

function dropPiece() {
    if (gameOver || paused) return;

    piece.y++;

    if (collide()) {
        piece.y--;
        mergePiece();
        clearLines();
        spawnPiece();
    }

    dropCounter = 0;
}

function hardDrop() {
    if (gameOver || paused) return;

    while (!collide()) {
        piece.y++;
        score += 2;
    }

    piece.y--;
    mergePiece();
    clearLines();
    spawnPiece();
    updateUi();
}

function rotatePiece() {
    if (gameOver || paused) return;

    const oldShape = piece.shape;
    const rotated = rotateMatrix(piece.shape);
    piece.shape = rotated;

    if (collide()) {
        piece.x++;

        if (collide()) {
            piece.x -= 2;

            if (collide()) {
                piece.x++;
                piece.shape = oldShape;
            }
        }
    }
}

function rotateMatrix(matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const result = Array.from({ length: cols }, () => Array(rows).fill(0));

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            result[x][rows - 1 - y] = matrix[y][x];
        }
    }

    return result;
}

function update(time = 0) {
    const delta = time - lastTime;
    lastTime = time;

    if (!paused && !gameOver) {
        dropCounter += delta;

        if (dropCounter > dropInterval) {
            dropPiece();
        }
    }

    draw();
    requestAnimationFrame(update);
}

function updateUi() {
    scoreText.textContent = `score: ${score}`;
    linesText.textContent = `lines: ${lines}`;
    levelText.textContent = `level: ${level}`;
}

document.addEventListener("keydown", function(event) {
    if (event.key === "ArrowLeft") movePiece(-1);
    if (event.key === "ArrowRight") movePiece(1);
    if (event.key === "ArrowDown") {
        dropPiece();
        score += 1;
        updateUi();
    }
    if (event.key === "ArrowUp") rotatePiece();
    if (event.code === "Space") hardDrop();

    if (event.key.toLowerCase() === "p") {
        paused = !paused;
        messageText.textContent = paused ? "paused" : "playing";
    }
});

restartTetris();
update();