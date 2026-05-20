const canvas = document.getElementById("pendulumCanvas");
const ctx = canvas.getContext("2d");

const TOP_BAR_HEIGHT = 56;

let pendulums = [];
let running = true;

let originX = 0;
let originY = 0;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - TOP_BAR_HEIGHT;

    originX = canvas.width / 2;
    originY = canvas.height * 0.28;
}

function createPendulum(index) {
    const offset = index * 0.006;

    return {
        l1: 150,
        l2: 150,
        m1: 20,
        m2: 20,
        a1: degToRad(120 + offset),
        a2: degToRad(120),
        a1v: 0,
        a2v: 0,
        trail: []
    };
}

function resetPendulums() {
    const count = Number(document.getElementById("countSelect").value);

    pendulums = [];

    for (let i = 0; i < count; i++) {
        pendulums.push(createPendulum(i));
    }

    buildPendulumSelect();
    loadPendulumEditor();
}

function changePendulumCount() {
    resetPendulums();
}

function togglePendulum() {
    running = !running;
    document.getElementById("pendulumToggle").textContent = running ? "pause" : "start";
}

function clearPendulumTrails() {
    for (const p of pendulums) {
        p.trail = [];
    }
}

function slightlyOffsetPendulums() {
    for (let i = 0; i < pendulums.length; i++) {
        pendulums[i].a1 += i * 0.003;
        pendulums[i].a2 += i * 0.002;
    }

    clearPendulumTrails();
}

function buildPendulumSelect() {
    const select = document.getElementById("pendulumSelect");
    select.innerHTML = "";

    for (let i = 0; i < pendulums.length; i++) {
        const option = document.createElement("option");
        option.value = i;
        option.textContent = `pendulum ${i + 1}`;
        select.appendChild(option);
    }
}

function loadPendulumEditor() {
    const p = getSelectedPendulum();
    if (!p) return;

    document.getElementById("l1Input").value = Math.round(p.l1);
    document.getElementById("l2Input").value = Math.round(p.l2);
    document.getElementById("m1Input").value = Math.round(p.m1);
    document.getElementById("m2Input").value = Math.round(p.m2);
    document.getElementById("a1Input").value = Math.round(radToDeg(p.a1));
    document.getElementById("a2Input").value = Math.round(radToDeg(p.a2));

    updatePendulumInfo();
}

function applyPendulumEdit() {
    const p = getSelectedPendulum();
    if (!p) return;

    p.l1 = Number(document.getElementById("l1Input").value);
    p.l2 = Number(document.getElementById("l2Input").value);
    p.m1 = Number(document.getElementById("m1Input").value);
    p.m2 = Number(document.getElementById("m2Input").value);
    p.a1 = degToRad(Number(document.getElementById("a1Input").value));
    p.a2 = degToRad(Number(document.getElementById("a2Input").value));
    p.a1v = 0;
    p.a2v = 0;
    p.trail = [];

    updatePendulumInfo();
}

function getSelectedPendulum() {
    const index = Number(document.getElementById("pendulumSelect").value);
    return pendulums[index];
}

function updatePendulumInfo() {
    const p = getSelectedPendulum();
    if (!p) return;

    document.getElementById("pendulumInfo").innerHTML =
        `angle 1: ${radToDeg(p.a1).toFixed(1)}°<br>` +
        `angle 2: ${radToDeg(p.a2).toFixed(1)}°<br>` +
        `ω1: ${p.a1v.toFixed(3)}<br>` +
        `ω2: ${p.a2v.toFixed(3)}`;
}

function stepPendulum(p) {
    const g = Number(document.getElementById("gravityInput").value);
    const damping = Number(document.getElementById("dampingInput").value);
    const speed = Number(document.getElementById("speedInput").value);

    const dt = 0.045 * speed;

    const m1 = p.m1;
    const m2 = p.m2;
    const l1 = p.l1;
    const l2 = p.l2;

    const a1 = p.a1;
    const a2 = p.a2;
    const a1v = p.a1v;
    const a2v = p.a2v;

    const num1 = -g * (2 * m1 + m2) * Math.sin(a1);
    const num2 = -m2 * g * Math.sin(a1 - 2 * a2);
    const num3 = -2 * Math.sin(a1 - a2) * m2;
    const num4 = a2v * a2v * l2 + a1v * a1v * l1 * Math.cos(a1 - a2);
    const den = l1 * (2 * m1 + m2 - m2 * Math.cos(2 * a1 - 2 * a2));

    const a1a = (num1 + num2 + num3 * num4) / den;

    const num5 = 2 * Math.sin(a1 - a2);
    const num6 = a1v * a1v * l1 * (m1 + m2);
    const num7 = g * (m1 + m2) * Math.cos(a1);
    const num8 = a2v * a2v * l2 * m2 * Math.cos(a1 - a2);
    const den2 = l2 * (2 * m1 + m2 - m2 * Math.cos(2 * a1 - 2 * a2));

    const a2a = (num5 * (num6 + num7 + num8)) / den2;

    p.a1v += a1a * dt;
    p.a2v += a2a * dt;

    p.a1v *= damping;
    p.a2v *= damping;

    p.a1 += p.a1v * dt;
    p.a2 += p.a2v * dt;

    const pos = getPositions(p);

    p.trail.push({
        x: pos.x2,
        y: pos.y2
    });

    const maxTrail = Number(document.getElementById("trailInput").value);

    if (p.trail.length > maxTrail) {
        p.trail.shift();
    }
}

function getPositions(p) {
    const x1 = originX + p.l1 * Math.sin(p.a1);
    const y1 = originY + p.l1 * Math.cos(p.a1);

    const x2 = x1 + p.l2 * Math.sin(p.a2);
    const y2 = y1 + p.l2 * Math.cos(p.a2);

    return { x1, y1, x2, y2 };
}

function drawPendulums() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawOrigin();

    for (let i = 0; i < pendulums.length; i++) {
        drawTrail(pendulums[i], i);
    }

    for (let i = 0; i < pendulums.length; i++) {
        drawPendulum(pendulums[i], i);
    }

    updatePendulumInfo();
}

function drawOrigin() {
    ctx.beginPath();
    ctx.arc(originX, originY, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#000000";
    ctx.fill();
}

function drawTrail(p, index) {
    if (p.trail.length < 2) return;

    ctx.lineWidth = 1;
    ctx.strokeStyle = trailShade(index);

    ctx.beginPath();

    for (let i = 0; i < p.trail.length; i++) {
        const point = p.trail[i];

        if (i === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
    }

    ctx.stroke();
}

function drawPendulum(p, index) {
    const pos = getPositions(p);

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(pos.x1, pos.y1);
    ctx.lineTo(pos.x2, pos.y2);
    ctx.stroke();

    drawBall(pos.x1, pos.y1, p.m1, index);
    drawBall(pos.x2, pos.y2, p.m2, index);
}

function drawBall(x, y, mass, index) {
    const r = Math.max(6, Math.sqrt(mass) * 2.3);

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);

    ctx.fillStyle = index % 2 === 0 ? "#ffffff" : "#000000";
    ctx.fill();

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    ctx.stroke();
}

function trailShade(index) {
    const shades = ["#000000", "#444444", "#777777", "#999999", "#bbbbbb"];
    return shades[index % shades.length];
}

function loop() {
    if (running) {
        for (const p of pendulums) {
            stepPendulum(p);
        }
    }

    drawPendulums();
    requestAnimationFrame(loop);
}

function degToRad(deg) {
    return deg * Math.PI / 180;
}

function radToDeg(rad) {
    return rad * 180 / Math.PI;
}

window.addEventListener("resize", function() {
    resizeCanvas();
});

resizeCanvas();
resetPendulums();
loop();
