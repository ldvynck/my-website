const canvas = document.getElementById("breakoutCanvas");
const ctx = canvas.getContext("2d");

const TOP_BAR_HEIGHT = 56;

let paddle;
let ball;
let bricks;
let keys = {};
let score = 0;
let lives = 3;
let paused = false;
let gameOver = false;
let won = false;

const rows = 6;
const cols = 12;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - TOP_BAR_HEIGHT;
    restartBreakout();
}

function restartBreakout() {
    paddle = {
        w: 130,
        h: 16,
        x: canvas.width / 2 - 65,
        y: canvas.height - 80,
        speed: 11
    };

    ball = {
        x: canvas.width / 2,
        y: canvas.height - 110,
        r: 10,
        vx: 5,
        vy: -6
    };

    score = 0;
    lives = 3;
    paused = false;
    gameOver = false;
    won = false;

    createBricks();
}

function createBricks() {
    bricks = [];

    const gap = 8;
    const top = 70;
    const side = 70;
    const brickW = (canvas.width - side * 2 - gap * (cols - 1)) / cols;
    const brickH = 28;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            bricks.push({
                x: side + c * (brickW + gap),
                y: top + r * (brickH + gap),
                w: brickW,
                h: brickH,
                alive: true,
                hp: r < 2 ? 2 : 1
            });
        }
    }
}

function togglePause() {
    paused = !paused;
    document.getElementById("pauseButton").textContent = paused ? "start" : "pause";
}

function update() {
    if (paused || gameOver || won) return;

    const speed = Number(document.getElementById("speedSlider").value);

    if (keys["ArrowLeft"]) paddle.x -= paddle.speed * speed;
    if (keys["ArrowRight"]) paddle.x += paddle.speed * speed;

    paddle.x = clamp(paddle.x, 0, canvas.width - paddle.w);

    ball.x += ball.vx * speed;
    ball.y += ball.vy * speed;

    if (ball.x - ball.r < 0) {
        ball.x = ball.r;
        ball.vx *= -1;
    }

    if (ball.x + ball.r > canvas.width) {
        ball.x = canvas.width - ball.r;
        ball.vx *= -1;
    }

    if (ball.y - ball.r < 0) {
        ball.y = ball.r;
        ball.vy *= -1;
    }

    if (ball.y - ball.r > canvas.height) {
        lives--;

        if (lives <= 0) {
            gameOver = true;
        } else {
            resetBall();
        }
    }

    collidePaddle();
    collideBricks();

    if (bricks.every(b => !b.alive)) {
        won = true;
    }
}

function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height - 110;
    ball.vx = Math.random() < 0.5 ? -5 : 5;
    ball.vy = -6;
    paddle.x = canvas.width / 2 - paddle.w / 2;
}

function collidePaddle() {
    if (
        ball.x + ball.r > paddle.x &&
        ball.x - ball.r < paddle.x + paddle.w &&
        ball.y + ball.r > paddle.y &&
        ball.y - ball.r < paddle.y + paddle.h
    ) {
        const hit = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);

        ball.y = paddle.y - ball.r;
        ball.vx = hit * 7;
        ball.vy = -Math.abs(ball.vy);
    }
}

function collideBricks() {
    for (const brick of bricks) {
        if (!brick.alive) continue;

        if (
            ball.x + ball.r > brick.x &&
            ball.x - ball.r < brick.x + brick.w &&
            ball.y + ball.r > brick.y &&
            ball.y - ball.r < brick.y + brick.h
        ) {
            brick.hp--;
            score += 10;

            if (brick.hp <= 0) {
                brick.alive = false;
                score += 20;
            }

            const overlapLeft = ball.x + ball.r - brick.x;
            const overlapRight = brick.x + brick.w - (ball.x - ball.r);
            const overlapTop = ball.y + ball.r - brick.y;
            const overlapBottom = brick.y + brick.h - (ball.y - ball.r);

            const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

            if (minOverlap === overlapLeft || minOverlap === overlapRight) {
                ball.vx *= -1;
            } else {
                ball.vy *= -1;
            }

            break;
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawBricks();
    drawPaddle();
    drawBall();
    drawUi();
}

function drawBricks() {
    for (const brick of bricks) {
        if (!brick.alive) continue;

        ctx.fillStyle = brick.hp === 2 ? "#4aa3ff" : "#ffffff";
        ctx.fillRect(brick.x, brick.y, brick.w, brick.h);

        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 3;
        ctx.strokeRect(brick.x, brick.y, brick.w, brick.h);
    }
}

function drawPaddle() {
    ctx.fillStyle = "#000000";
    ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
}

function drawBall() {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fillStyle = "#ff9800";
    ctx.fill();

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    ctx.stroke();
}

function drawUi() {
    ctx.font = "bold 20px Courier New";
    ctx.fillStyle = "#000000";
    ctx.textAlign = "left";
    ctx.fillText(`score: ${score}`, 22, 28);
    ctx.fillText(`lives: ${lives}`, 22, 56);

    if (gameOver || won) {
        ctx.font = "bold 54px Courier New";
        ctx.textAlign = "center";
        ctx.fillText(won ? "you won" : "game over", canvas.width / 2, canvas.height / 2);
    }
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

canvas.addEventListener("mousemove", function(event) {
    const rect = canvas.getBoundingClientRect();
    paddle.x = event.clientX - rect.left - paddle.w / 2;
    paddle.x = clamp(paddle.x, 0, canvas.width - paddle.w);
});

document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

window.addEventListener("resize", resizeCanvas);

resizeCanvas();
loop();
