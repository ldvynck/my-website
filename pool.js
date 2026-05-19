const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const TOP_BAR_HEIGHT = 56;

const table = {
    margin: 70,
    lineWidth: 3,
    pocketSize: 58,
    pocketDepth: 24
};

const BALL_R = 16;
const FRICTION = 0.99;
const POWER_SCALE = 0.12;
const MAX_POWER = 22;

const ballColors = {
    1: "#f2c94c",
    2: "#2f80ed",
    3: "#eb5757",
    4: "#9b51e0",
    5: "#f2994a",
    6: "#27ae60",
    7: "#8b1e1e",
    8: "#000000",
    9: "#f2c94c",
    10: "#2f80ed",
    11: "#eb5757",
    12: "#9b51e0",
    13: "#f2994a",
    14: "#27ae60",
    15: "#8b1e1e"
};

let balls = [];
let mouseX = 0;
let mouseY = 0;
let aiming = false;

let game = {
    currentPlayer: 1,
    groups: { 1: null, 2: null },
    situation: "Player 1's turn",
    ballInHand: false,
    shotActive: false,
    firstHit: null,
    pocketedThisShot: [],
    railAfterContact: false,
    cueScratched: false,
    eightPocketed: false,
    winner: null
};

let spin = {
    x: 0,
    y: 0
};

let spinControl = {
    x: 0,
    y: 0,
    r: 18
};

let restartButton = {
    x: 0,
    y: 0,
    width: 90,
    height: 32
};

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - TOP_BAR_HEIGHT;

    if (balls.length === 0) setupBalls();
}

function tableBounds() {
    return {
        left: table.margin,
        top: table.margin,
        right: canvas.width - table.margin,
        bottom: canvas.height - table.margin
    };
}

function setupBalls() {
    balls = [];
    const b = tableBounds();

    balls.push({
        number: 0,
        x: b.left + (b.right - b.left) * 0.25,
        y: b.top + (b.bottom - b.top) * 0.5,
        vx: 0,
        vy: 0,
        active: true
    });

    const rackX = b.left + (b.right - b.left) * 0.68;
    const rackY = b.top + (b.bottom - b.top) * 0.5;
    const gap = BALL_R * 2 + 2;

    const rack = [
        [1],
        [9, 2],
        [10, 8, 3],
        [11, 4, 12, 5],
        [13, 6, 14, 7, 15]
    ];

    for (let row = 0; row < rack.length; row++) {
        for (let col = 0; col < rack[row].length; col++) {
            balls.push({
                number: rack[row][col],
                x: rackX + row * gap,
                y: rackY + (col - row / 2) * gap,
                vx: 0,
                vy: 0,
                active: true
            });
        }
    }
}

function cueBall() {
    return balls[0];
}

function ballGroup(number) {
    if (number >= 1 && number <= 7) return "solids";
    if (number >= 9 && number <= 15) return "stripes";
    if (number === 8) return "eight";
    return "cue";
}

function otherPlayer() {
    return game.currentPlayer === 1 ? 2 : 1;
}

function switchPlayer() {
    game.currentPlayer = otherPlayer();
}

function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawTable();
    drawAimPreview();

    for (const ball of balls) drawBall(ball);

    drawPlayerPanels();
    drawBottomUi();
}

function drawTable() {
    const b = tableBounds();

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawTableRails(b);
    drawPockets();
}

function drawTableRails(b) {
    const p = table.pocketSize;
    const midX = (b.left + b.right) / 2;
    const cornerGap = p / 2;
    const middleGap = p / 2;

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = table.lineWidth;
    ctx.lineCap = "butt";

    ctx.beginPath();

    ctx.moveTo(b.left + cornerGap, b.top);
    ctx.lineTo(midX - middleGap, b.top);
    ctx.moveTo(midX + middleGap, b.top);
    ctx.lineTo(b.right - cornerGap, b.top);

    ctx.moveTo(b.left + cornerGap, b.bottom);
    ctx.lineTo(midX - middleGap, b.bottom);
    ctx.moveTo(midX + middleGap, b.bottom);
    ctx.lineTo(b.right - cornerGap, b.bottom);

    ctx.moveTo(b.left, b.top + cornerGap);
    ctx.lineTo(b.left, b.bottom - cornerGap);

    ctx.moveTo(b.right, b.top + cornerGap);
    ctx.lineTo(b.right, b.bottom - cornerGap);

    ctx.stroke();
}

function getPockets() {
    const b = tableBounds();

    return [
        { x: b.left, y: b.top, direction: "corner" },
        { x: (b.left + b.right) / 2, y: b.top, direction: "down" },
        { x: b.right, y: b.top, direction: "corner" },

        { x: b.left, y: b.bottom, direction: "corner" },
        { x: (b.left + b.right) / 2, y: b.bottom, direction: "up" },
        { x: b.right, y: b.bottom, direction: "corner" }
    ];
}

function drawPockets() {
    for (const pocket of getPockets()) {
        drawPocket(pocket.x, pocket.y, pocket.direction);
    }
}

function drawPocket(x, y, direction) {
    const w = table.pocketSize;
    const d = table.pocketDepth;
    const r = w / 2;

    ctx.fillStyle = "#000000";
    ctx.beginPath();

    if (direction === "down") {
        ctx.rect(x - w / 2, y - d, w, d);
        ctx.arc(x, y - d, r, Math.PI, Math.PI * 2);
    } else if (direction === "up") {
        ctx.rect(x - w / 2, y, w, d);
        ctx.arc(x, y + d, r, 0, Math.PI);
    } else {
        ctx.arc(x, y, r, 0, Math.PI * 2);
    }

    ctx.fill();
}

function drawBall(ball) {
    if (!ball.active) return;

    if (ball.number === 0) {
        drawCueBall(ball);
        return;
    }

    if (ball.number >= 9 && ball.number <= 15) {
        drawStripeBall(ball);
    } else {
        drawSolidBall(ball);
    }

    drawBallNumber(ball);
}

function drawCueBall(ball) {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);

    const valid = !game.ballInHand || validCuePlacement(ball.x, ball.y);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    ctx.strokeStyle = valid ? "#000000" : "#eb5757";
    ctx.lineWidth = table.lineWidth;
    ctx.stroke();
}

function drawSolidBall(ball) {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fillStyle = ballColors[ball.number];
    ctx.fill();

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = table.lineWidth;
    ctx.stroke();
}

function drawStripeBall(ball) {
    const color = ballColors[ball.number];

    ctx.save();
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(ball.x - BALL_R, ball.y - BALL_R, BALL_R * 2, BALL_R * 2);

    ctx.fillStyle = color;
    ctx.fillRect(ball.x - BALL_R, ball.y - 7, BALL_R * 2, 14);

    ctx.restore();

    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = table.lineWidth;
    ctx.stroke();
}

function drawBallNumber(ball) {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = "bold 11px Courier New";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#000000";
    ctx.fillText(ball.number, ball.x, ball.y + 0.5);
}

function drawPlayerPanels() {
    const b = tableBounds();
    const midX = (b.left + b.right) / 2;

    const panelWidth = 270;
    const y = 18;

    const leftCenter = (b.left + midX) / 2;
    const rightCenter = (midX + b.right) / 2;

    drawPlayerPanel(1, leftCenter - panelWidth / 2, y);
    drawPlayerPanel(2, rightCenter - panelWidth / 2, y);
}

function drawPlayerPanel(player, x, y) {
    const width = 270;
    const height = 44;
    const active = game.currentPlayer === player;

    ctx.fillStyle = active ? "#000000" : "#ffffff";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = table.lineWidth;
    ctx.strokeRect(x, y, width, height);
    ctx.fillRect(x, y, width, height);

    ctx.font = "bold 14px Courier New";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = active ? "#ffffff" : "#000000";

    const group = game.groups[player] || "open";
    ctx.fillText(`Player ${player} | ${group}`, x + 12, y + 14);

    const remaining = ballsRemainingForPlayer(player);
    ctx.font = "bold 12px Courier New";
    ctx.fillText(`left: ${remaining.join(" ") || "8"}`, x + 12, y + 32);
}

function restartGame() {
    setupBalls();

    game = {
        currentPlayer: 1,
        groups: { 1: null, 2: null },
        situation: "Player 1's turn",
        ballInHand: false,
        shotActive: false,
        firstHit: null,
        pocketedThisShot: [],
        railAfterContact: false,
        cueScratched: false,
        eightPocketed: false,
        winner: null
    };

    spin.x = 0;
    spin.y = 0;
    aiming = false;
}

function drawRestartButton(x, y) {
    restartButton.x = x;
    restartButton.y = y;

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = table.lineWidth;
    ctx.strokeRect(x, y, restartButton.width, restartButton.height);

    ctx.font = "bold 13px Courier New";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#000000";
    ctx.fillText("restart", x + restartButton.width / 2, y + restartButton.height / 2);
}

function mouseInsideRestartButton() {
    return (
        mouseX >= restartButton.x &&
        mouseX <= restartButton.x + restartButton.width &&
        mouseY >= restartButton.y &&
        mouseY <= restartButton.y + restartButton.height
    );
}

function ballsRemainingForPlayer(player) {
    const group = game.groups[player];

    if (!group) return [];

    return balls
        .filter(ball => ball.active && ballGroup(ball.number) === group)
        .map(ball => ball.number);
}

function drawSituationAndRestartGroup(centerX, y) {
    ctx.font = "bold 13px Courier New";
    const paddingX = 14;
    const height = 32;
    const gap = 10;

    const textWidth = ctx.measureText(game.situation).width;
    const situationWidth = textWidth + paddingX * 2;
    const restartWidth = restartButton.width;

    const totalWidth = situationWidth + gap + restartWidth;
    const startX = centerX - totalWidth / 2;

    drawSituationBox(startX + situationWidth / 2, y);
    drawRestartButton(startX + situationWidth + gap, y);
}

function drawBottomUi() {
    const b = tableBounds();
    const midX = (b.left + b.right) / 2;

    const leftCenter = (b.left + midX) / 2;
    const rightCenter = (midX + b.right) / 2;

    drawPowerBar(leftCenter - 150, b.bottom + 28);
    drawSpinControl(leftCenter + 120, b.bottom + 16);

    drawSituationAndRestartGroup(rightCenter, b.bottom + 18);
}

function drawPowerBar(x, y) {
    const cue = cueBall();
    let power = 0;

    if (aiming && allBallsStopped() && cue.active) {
        const dx = cue.x - mouseX;
        const dy = cue.y - mouseY;
        power = Math.min(Math.hypot(dx, dy) * POWER_SCALE, MAX_POWER);
    }

    const width = 220;
    const height = 8;

    ctx.font = "bold 12px Courier New";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = "#000000";
    ctx.fillText("power", x, y - 6);

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = table.lineWidth;
    ctx.strokeRect(x, y, width, height);

    ctx.fillStyle = "#000000";
    ctx.fillRect(x, y, (power / MAX_POWER) * width, height);
}

function drawSpinControl(x, y) {
    const r = 18;

    spinControl.x = x + 54;
    spinControl.y = y + r;
    spinControl.r = r;

    ctx.font = "bold 12px Courier New";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#000000";
    ctx.fillText("spin", x, spinControl.y);

    ctx.beginPath();
    ctx.arc(spinControl.x, spinControl.y, r, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = table.lineWidth;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(spinControl.x - r, spinControl.y);
    ctx.lineTo(spinControl.x + r, spinControl.y);
    ctx.moveTo(spinControl.x, spinControl.y - r);
    ctx.lineTo(spinControl.x, spinControl.y + r);
    ctx.stroke();

    const dotX = spinControl.x + spin.x * r;
    const dotY = spinControl.y + spin.y * r;

    ctx.beginPath();
    ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#000000";
    ctx.fill();
}

function setSpinFromMouse() {
    const dx = mouseX - spinControl.x;
    const dy = mouseY - spinControl.y;
    const dist = Math.hypot(dx, dy);

    if (dist > spinControl.r) return false;

    spin.x = dx / spinControl.r;
    spin.y = dy / spinControl.r;

    return true;
}

function drawSituationBox(centerX, y) {
    ctx.font = "bold 13px Courier New";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    const paddingX = 14;
    const height = 32;
    const textWidth = ctx.measureText(game.situation).width;
    const width = textWidth + paddingX * 2;

    const x = centerX - width / 2;

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = table.lineWidth;
    ctx.strokeRect(x, y, width, height);

    ctx.fillStyle = "#000000";
    ctx.fillText(game.situation, x + paddingX, y + height / 2);
}

function drawAimPreview() {
    const cue = cueBall();

    if (!aiming || !allBallsStopped() || !cue.active || game.ballInHand) return;

    const dx = cue.x - mouseX;
    const dy = cue.y - mouseY;
    const len = Math.hypot(dx, dy);

    if (len === 0) return;

    const dirX = dx / len;
    const dirY = dy / len;

    let x = cue.x;
    let y = cue.y;
    let hitBall = null;

    const b = tableBounds();

    for (let i = 0; i < 1000; i++) {
        x += dirX * 4;
        y += dirY * 4;

        if (
            x - BALL_R <= b.left ||
            x + BALL_R >= b.right ||
            y - BALL_R <= b.top ||
            y + BALL_R >= b.bottom
        ) {
            break;
        }

        for (const other of balls) {
            if (other.number === 0 || !other.active) continue;

            const dist = Math.hypot(other.x - x, other.y - y);

            if (dist <= BALL_R * 2) {
                hitBall = other;
                break;
            }
        }

        if (hitBall) break;
    }

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(cue.x, cue.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, BALL_R, 0, Math.PI * 2);
    ctx.stroke();

    if (hitBall) {
        const normalX = hitBall.x - x;
        const normalY = hitBall.y - y;
        const normalLen = Math.hypot(normalX, normalY);

        if (normalLen > 0) {
            const nX = normalX / normalLen;
            const nY = normalY / normalLen;

            const anglePower = Math.max(0, dirX * nX + dirY * nY);
            const shotPower = Math.min(len * POWER_SCALE, MAX_POWER);
            const trajectoryLength = 40 + anglePower * shotPower * 7;

            ctx.beginPath();
            ctx.moveTo(hitBall.x, hitBall.y);
            ctx.lineTo(hitBall.x + nX * trajectoryLength, hitBall.y + nY * trajectoryLength);
            ctx.stroke();
        }
    }

    ctx.beginPath();
    ctx.moveTo(cue.x, cue.y);
    ctx.lineTo(mouseX, mouseY);
    ctx.stroke();
}

function updateBalls() {
    if (game.ballInHand) {
        moveCueBallWithMouse();
        return;
    }

    for (const ball of balls) {
        if (!ball.active) continue;

        ball.x += ball.vx;
        ball.y += ball.vy;

        ball.vx *= FRICTION;
        ball.vy *= FRICTION;

        if (Math.abs(ball.vx) < 0.04) ball.vx = 0;
        if (Math.abs(ball.vy) < 0.04) ball.vy = 0;

        checkBallPocket(ball);
        handleWallBounce(ball);
    }

    handleBallCollisions();

    if (game.shotActive && allBallsStopped()) {
        finishShot();
    }
}

function moveCueBallWithMouse() {
    const cue = cueBall();
    const b = tableBounds();

    cue.active = true;
    cue.vx = 0;
    cue.vy = 0;
    cue.x = Math.max(b.left + BALL_R, Math.min(mouseX, b.right - BALL_R));
    cue.y = Math.max(b.top + BALL_R, Math.min(mouseY, b.bottom - BALL_R));
}

function validCuePlacement(x, y) {
    const b = tableBounds();

    if (x - BALL_R < b.left || x + BALL_R > b.right) return false;
    if (y - BALL_R < b.top || y + BALL_R > b.bottom) return false;

    for (const ball of balls) {
        if (ball.number === 0 || !ball.active) continue;

        if (Math.hypot(ball.x - x, ball.y - y) < BALL_R * 2 + 2) {
            return false;
        }
    }

    return true;
}

function handleWallBounce(ball) {
    const b = tableBounds();
    const bounceLoss = 0.92;

    let bounced = false;

    if (ball.x - BALL_R < b.left) {
        ball.x = b.left + BALL_R + 0.5;
        ball.vx = Math.abs(ball.vx) * bounceLoss;
        bounced = true;
    }

    if (ball.x + BALL_R > b.right) {
        ball.x = b.right - BALL_R - 0.5;
        ball.vx = -Math.abs(ball.vx) * bounceLoss;
        bounced = true;
    }

    if (ball.y - BALL_R < b.top) {
        ball.y = b.top + BALL_R + 0.5;
        ball.vy = Math.abs(ball.vy) * bounceLoss;
        bounced = true;
    }

    if (ball.y + BALL_R > b.bottom) {
        ball.y = b.bottom - BALL_R - 0.5;
        ball.vy = -Math.abs(ball.vy) * bounceLoss;
        bounced = true;
    }

    if (bounced) {
        applySpinAfterRail(ball);
        limitBallSpeed(ball, MAX_POWER);
        markRailContact();
    }
}

function applySpinAfterRail(ball) {
    if (ball.number !== 0) return;

    const maxKick = 1.2;

    ball.vx += spin.x * maxKick;
    ball.vy += spin.y * maxKick;

    limitBallSpeed(ball, MAX_POWER);
}

function markRailContact() {
    if (game.shotActive && game.firstHit !== null) {
        game.railAfterContact = true;
    }
}

function handleBallCollisions() {
    for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
            resolveBallCollision(balls[i], balls[j]);
        }
    }
}

function resolveBallCollision(a, b) {
    if (!a.active || !b.active) return;

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);

    if (dist === 0 || dist > BALL_R * 2) return;

    if (game.shotActive && game.firstHit === null) {
        if (a.number === 0 && b.number !== 0) game.firstHit = b;
        if (b.number === 0 && a.number !== 0) game.firstHit = a;
    }

    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = BALL_R * 2 - dist;

    a.x -= nx * overlap / 2;
    a.y -= ny * overlap / 2;
    b.x += nx * overlap / 2;
    b.y += ny * overlap / 2;

    const dvx = b.vx - a.vx;
    const dvy = b.vy - a.vy;
    const impact = dvx * nx + dvy * ny;

    if (impact > 0) return;
    
    const collisionLoss = 0.97;
    
    a.vx += impact * nx * collisionLoss;
    a.vy += impact * ny * collisionLoss;
    b.vx -= impact * nx * collisionLoss;
    b.vy -= impact * ny * collisionLoss;

    applySpinAfterBallHit(a, b);
}

function checkBallPocket(ball) {
    for (const pocket of getPockets()) {
        const dist = Math.hypot(ball.x - pocket.x, ball.y - pocket.y);

        if (dist < table.pocketSize * 0.55) {
            if (ball.number === 0) {
                game.cueScratched = true;
                ball.active = false;
                ball.vx = 0;
                ball.vy = 0;
            } else {
                if (ball.number === 8) game.eightPocketed = true;

                ball.active = false;
                ball.vx = 0;
                ball.vy = 0;
                game.pocketedThisShot.push(ball);
            }

            return;
        }
    }
}

function applySpinAfterBallHit(a, b) {
    const cue = a.number === 0 ? a : b.number === 0 ? b : null;
    const object = a.number === 0 ? b : b.number === 0 ? a : null;

    if (!cue || !object) return;

    const dx = object.x - cue.x;
    const dy = object.y - cue.y;
    const dist = Math.hypot(dx, dy);

    if (dist === 0) return;

    const nX = dx / dist;
    const nY = dy / dist;

    const sideX = -nY;
    const sideY = nX;

    // left/right english affects side movement after contact
    cue.vx += sideX * spin.x * 1.3;
    cue.vy += sideY * spin.x * 1.3;

    // top spin follows through, backspin pulls back
    cue.vx += nX * (-spin.y) * 2.0;
    cue.vy += nY * (-spin.y) * 2.0;

    limitBallSpeed(cue, MAX_POWER);
}

function startShot() {
    game.shotActive = true;
    game.firstHit = null;
    game.pocketedThisShot = [];
    game.railAfterContact = false;
    game.cueScratched = false;
    game.eightPocketed = false;
    game.situation = `Player ${game.currentPlayer} shot`;
}

function finishShot() {
    game.shotActive = false;

    const foul = checkFoul();

    if (game.eightPocketed) {
        handleEightBallResult(foul);
        return;
    }

    if (foul) {
        switchPlayer();
        game.ballInHand = true;
        game.situation = `Foul: ${foul}. Player ${game.currentPlayer} ball in hand`;
        return;
    }

    assignGroupsIfNeeded();

    if (playerPottedOwnBall()) {
        game.situation = `Player ${game.currentPlayer}'s turn`;
    } else {
        switchPlayer();
        game.situation = `Player ${game.currentPlayer}'s turn`;
    }
}

function limitBallSpeed(ball, maxSpeed) {
    const speed = Math.hypot(ball.vx, ball.vy);

    if (speed <= maxSpeed) return;

    ball.vx = (ball.vx / speed) * maxSpeed;
    ball.vy = (ball.vy / speed) * maxSpeed;
}

function checkFoul() {
    if (game.cueScratched) return "cue ball pocketed";
    if (game.firstHit === null) return "no ball hit";

    const firstGroup = ballGroup(game.firstHit.number);
    const playerGroup = game.groups[game.currentPlayer];

    if (playerGroup === null) {
        if (firstGroup === "eight") return "8 ball hit first";
    } else {
        if (firstGroup !== playerGroup) return "wrong ball hit first";
    }

    if (game.pocketedThisShot.length === 0 && !game.railAfterContact) {
        return "no rail or pot after contact";
    }

    return null;
}

function assignGroupsIfNeeded() {
    if (game.groups[1] !== null) return;

    const pottedSolids = game.pocketedThisShot.some(ball => ballGroup(ball.number) === "solids");
    const pottedStripes = game.pocketedThisShot.some(ball => ballGroup(ball.number) === "stripes");

    if (pottedSolids && !pottedStripes) {
        game.groups[game.currentPlayer] = "solids";
        game.groups[otherPlayer()] = "stripes";
    }

    if (pottedStripes && !pottedSolids) {
        game.groups[game.currentPlayer] = "stripes";
        game.groups[otherPlayer()] = "solids";
    }
}

function playerPottedOwnBall() {
    const group = game.groups[game.currentPlayer];

    if (group === null) {
        return game.pocketedThisShot.some(ball => ball.number !== 8);
    }

    return game.pocketedThisShot.some(ball => ballGroup(ball.number) === group);
}

function handleEightBallResult(foul) {
    if (!foul && playerClearedGroup(game.currentPlayer)) {
        game.winner = game.currentPlayer;
        game.situation = `Player ${game.currentPlayer} wins`;
    } else {
        game.winner = otherPlayer();
        game.situation = `Player ${otherPlayer()} wins. Illegal 8 ball`;
    }
}

function playerClearedGroup(player) {
    const group = game.groups[player];
    if (!group) return false;

    return !balls.some(ball => ball.active && ballGroup(ball.number) === group);
}

function allBallsStopped() {
    return balls.every(ball => !ball.active || (ball.vx === 0 && ball.vy === 0));
}

function gameLoop() {
    updateBalls();
    drawGame();
    requestAnimationFrame(gameLoop);
}

canvas.addEventListener("mousemove", function(event) {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
});

canvas.addEventListener("mousedown", function(event) {
    if (setSpinFromMouse()) {
        return;
    }

    if (event.button !== 0 || game.winner !== null) return;

    if (game.ballInHand) {
        if (validCuePlacement(cueBall().x, cueBall().y)) {
            game.ballInHand = false;
            game.situation = `Player ${game.currentPlayer}'s turn`;
        }
        return;
    }

    if (mouseInsideRestartButton()) {
        restartGame();
    	return;
    }

    if (allBallsStopped()) aiming = true;
});

canvas.addEventListener("mouseup", function(event) {
    if (event.button !== 0 || !aiming || game.winner !== null) return;

    const cue = cueBall();
    const dx = cue.x - mouseX;
    const dy = cue.y - mouseY;
    const len = Math.hypot(dx, dy);

    if (len > 0) {
        const power = Math.min(len * POWER_SCALE, MAX_POWER);
        startShot();
        cue.vx = (dx / len) * power;
        cue.vy = (dy / len) * power;
    }

    aiming = false;
});

canvas.addEventListener("contextmenu", function(event) {
    event.preventDefault();
    aiming = false;
});

window.addEventListener("resize", resizeCanvas);

resizeCanvas();
gameLoop();