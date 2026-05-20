const canvas = document.getElementById("pongCanvas");
const ctx = canvas.getContext("2d");

const TOP_BAR_HEIGHT = 56;

let leftPaddle;
let rightPaddle;
let ball;
let leftScore = 0;
let rightScore = 0;
let paused = false;

let keys = {};

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - TOP_BAR_HEIGHT;
    restartPong();
}

function restartPong() {
    leftPaddle = {
        x: 50,
        y: canvas.height / 2 - 55,
        w: 16,
        h: 110,
        speed: 8
    };

    rightPaddle = {
        x: canvas.width - 66,
        y: canvas.height / 2 - 55,
        w: 16,
        h: 110,
        speed: 8
    };

    resetBall();
}

function resetBall() {
    const direction = Math.random() < 0.5 ? -1 : 1;

    ball = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        r: 11,
        vx: 7 * direction,
        vy: (Math.random() * 4 - 2)
    };
}

function togglePause() {
    paused = !paused;
    document.getElementById("pauseButton").textContent = paused ? "start" : "pause";
}

function update() {
    if (paused) return;

    const speedMult = Number(document.getElementById("speedSlider").value);

    movePaddles(speedMult);
    moveBall(speedMult);
}

function movePaddles(speedMult) {
    if (keys["w"]) leftPaddle.y -= leftPaddle.speed * speedMult;
    if (keys["s"]) leftPaddle.y += leftPaddle.speed * speedMult;

    const mode = document.getElementById("modeSelect").value;

    if (mode === "two") {
        if (keys["ArrowUp"]) rightPaddle.y -= rightPaddle.speed * speedMult;
        if (keys["ArrowDown"]) rightPaddle.y += rightPaddle.speed * speedMult;
    } else {
        const target = ball.y - rightPaddle.h / 2;
        rightPaddle.y += (target - rightPaddle.y) * 0.08 * speedMult;
    }

    leftPaddle.y = clamp(leftPaddle.y, 0, canvas.height - leftPaddle.h);
    rightPaddle.y = clamp(rightPaddle.y, 0, canvas.height - rightPaddle.h);
}

function moveBall(speedMult) {
    ball.x += ball.vx * speedMult;
    ball.y += ball.vy * speedMult;

    if (ball.y - ball.r < 0) {
        ball.y = ball.r;
        ball.vy *= -1;
    }

    if (ball.y + ball.r > canvas.height) {
        ball.y = canvas.height - ball.r;
        ball.vy *= -1;
    }

    checkPaddleCollision(leftPaddle, 1);
    checkPaddleCollision(rightPaddle, -1);

    if (ball.x + ball.r < 0) {
        rightScore++;
        resetBall();
    }

    if (ball.x - ball.r > canvas.width) {
        leftScore++;
        resetBall();
    }
}

function checkPaddleCollision(paddle, direction) {
    if (
        ball.x + ball.r > paddle.x &&
        ball.x - ball.r < paddle.x + paddle.w &&
        ball.y + ball.r > paddle.y &&
        ball.y - ball.r < paddle.y + paddle.h
    ) {
        const hit = (ball.y - (paddle.y + paddle.h / 2)) / (paddle.h / 2);

        ball.vx = Math.abs(ball.vx) * direction;
        ball.vy = hit * 7;
        ball.vx *= 1.04;

        if (direction === 1) ball.x = paddle.x + paddle.w + ball.r;
        else ball.x = paddle.x - ball.r;
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawCenterLine();
    drawPaddle(leftPaddle, "#000000");
    drawPaddle(rightPaddle, "#000000");
    drawBall();
    drawScore();
}

function drawCenterLine() {
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    ctx.setLineDash([16, 16]);

    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();

    ctx.setLineDash([]);
}

function drawPaddle(paddle, color) {
    ctx.fillStyle = color;
    ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
}

function drawBall() {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fillStyle = "#4aa3ff";
    ctx.fill();

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    ctx.stroke();
}

function drawScore() {
    ctx.font = "bold 64px Courier New";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#000000";

    ctx.fillText(leftScore, canvas.width / 2 - 100, 30);
    ctx.fillText(rightScore, canvas.width / 2 + 100, 30);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

document.addEventListener("keydown", function(event) {
    keys[event.key] = true;
});

document.addEventListener("keyup", function(event) {
    keys[event.key] = false;
});

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

window.addEventListener("resize", resizeCanvas);

resizeCanvas();
loop();
