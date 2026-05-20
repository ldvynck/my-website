const canvas = document.getElementById("asteroidsCanvas");
const ctx = canvas.getContext("2d");

const TOP_BAR_HEIGHT = 56;

let ship, bullets, asteroids, keys, score, lives, paused, gameOver;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - TOP_BAR_HEIGHT;
    restartAsteroids();
}

function restartAsteroids() {
    ship = { x: canvas.width / 2, y: canvas.height / 2, a: -Math.PI / 2, vx: 0, vy: 0, r: 14, cooldown: 0 };
    bullets = [];
    asteroids = [];
    keys = {};
    score = 0;
    lives = 3;
    paused = false;
    gameOver = false;

    for (let i = 0; i < 7; i++) spawnAsteroid(3);
}

function togglePause() {
    paused = !paused;
    document.getElementById("pauseButton").textContent = paused ? "start" : "pause";
}

function spawnAsteroid(size, x, y) {
    asteroids.push({
        x: x ?? Math.random() * canvas.width,
        y: y ?? Math.random() * canvas.height,
        vx: Math.random() * 3 - 1.5,
        vy: Math.random() * 3 - 1.5,
        size,
        r: size * 18,
        sides: 9 + Math.floor(Math.random() * 5),
        spin: Math.random() * 0.04 - 0.02,
        a: Math.random() * Math.PI * 2
    });
}

function update() {
    if (paused || gameOver) return;

    if (keys["ArrowLeft"]) ship.a -= 0.07;
    if (keys["ArrowRight"]) ship.a += 0.07;

    if (keys["ArrowUp"]) {
        ship.vx += Math.cos(ship.a) * 0.18;
        ship.vy += Math.sin(ship.a) * 0.18;
    }

    if (keys[" "] && ship.cooldown <= 0) shoot();

    ship.x += ship.vx;
    ship.y += ship.vy;
    ship.vx *= 0.99;
    ship.vy *= 0.99;
    ship.cooldown--;

    wrap(ship);

    for (const bullet of bullets) {
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
        bullet.life--;
        wrap(bullet);
    }

    bullets = bullets.filter(b => b.life > 0);

    for (const asteroid of asteroids) {
        asteroid.x += asteroid.vx;
        asteroid.y += asteroid.vy;
        asteroid.a += asteroid.spin;
        wrap(asteroid);
    }

    checkCollisions();

    if (asteroids.length === 0) {
        for (let i = 0; i < 8; i++) spawnAsteroid(3);
    }
}

function shoot() {
    bullets.push({
        x: ship.x + Math.cos(ship.a) * ship.r,
        y: ship.y + Math.sin(ship.a) * ship.r,
        vx: Math.cos(ship.a) * 8 + ship.vx,
        vy: Math.sin(ship.a) * 8 + ship.vy,
        r: 4,
        life: 70
    });

    ship.cooldown = 12;
}

function checkCollisions() {
    for (let i = asteroids.length - 1; i >= 0; i--) {
        const asteroid = asteroids[i];

        for (let j = bullets.length - 1; j >= 0; j--) {
            const bullet = bullets[j];

            if (distance(asteroid, bullet) < asteroid.r + bullet.r) {
                bullets.splice(j, 1);
                splitAsteroid(i);
                score += 100;
                break;
            }
        }

        if (distance(asteroid, ship) < asteroid.r + ship.r) {
            lives--;

            ship.x = canvas.width / 2;
            ship.y = canvas.height / 2;
            ship.vx = 0;
            ship.vy = 0;

            if (lives <= 0) gameOver = true;
        }
    }
}

function splitAsteroid(index) {
    const asteroid = asteroids[index];
    asteroids.splice(index, 1);

    if (asteroid.size > 1) {
        spawnAsteroid(asteroid.size - 1, asteroid.x, asteroid.y);
        spawnAsteroid(asteroid.size - 1, asteroid.x, asteroid.y);
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawShip();
    bullets.forEach(drawBullet);
    asteroids.forEach(drawAsteroid);
    drawUi();
}

function drawShip() {
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.a);

    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-12, -11);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-12, 11);
    ctx.closePath();

    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    ctx.stroke();

    if (keys["ArrowUp"]) {
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(-24, -6);
        ctx.lineTo(-24, 6);
        ctx.closePath();
        ctx.fillStyle = "#ff9800";
        ctx.fill();
        ctx.stroke();
    }

    ctx.restore();
}

function drawBullet(b) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = "#4aa3ff";
    ctx.fill();
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.stroke();
}

function drawAsteroid(a) {
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.a);

    ctx.beginPath();

    for (let i = 0; i < a.sides; i++) {
        const ang = i / a.sides * Math.PI * 2;
        const rad = a.r * (0.75 + 0.25 * Math.sin(i * 2.3));

        const x = Math.cos(ang) * rad;
        const y = Math.sin(ang) * rad;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }

    ctx.closePath();
    ctx.fillStyle = "#eeeeee";
    ctx.fill();
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();
}

function drawUi() {
    ctx.font = "bold 20px Courier New";
    ctx.fillStyle = "#000000";
    ctx.textAlign = "left";
    ctx.fillText(`score: ${score}`, 22, 28);
    ctx.fillText(`lives: ${lives}`, 22, 56);

    if (gameOver) {
        ctx.font = "bold 54px Courier New";
        ctx.textAlign = "center";
        ctx.fillText("game over", canvas.width / 2, canvas.height / 2);
    }
}

function wrap(obj) {
    if (obj.x < -60) obj.x = canvas.width + 60;
    if (obj.x > canvas.width + 60) obj.x = -60;
    if (obj.y < -60) obj.y = canvas.height + 60;
    if (obj.y > canvas.height + 60) obj.y = -60;
}

function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

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
