const canvas = document.getElementById("nbodyCanvas");
const ctx = canvas.getContext("2d");

const TOP_BAR_HEIGHT = 56;

let bodies = [];
let running = true;
let selectedBody = null;

let cameraX = 0;
let cameraY = 0;
let zoom = 1;

let middleDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

let draggingBody = false;
let velocityMode = false;
let velocityStart = null;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - TOP_BAR_HEIGHT;
}

function screenToWorld(x, y) {
    return {
        x: (x - canvas.width / 2) / zoom + cameraX,
        y: (y - canvas.height / 2) / zoom + cameraY
    };
}

function worldToScreen(x, y) {
    return {
        x: (x - cameraX) * zoom + canvas.width / 2,
        y: (y - cameraY) * zoom + canvas.height / 2
    };
}

function createBody(name, x, y, vx, vy, mass, radius) {
    return {
        name,
        x,
        y,
        vx,
        vy,
        ax: 0,
        ay: 0,
        mass,
        radius,
        trail: []
    };
}

function resetSystem() {
    bodies = [
        createBody("sun", 0, 0, 0, 0, 12000, 16),
        createBody("planet 1", 190, 0, 0, 4.7, 60, 7),
        createBody("planet 2", -310, 0, 0, -3.2, 120, 9),
        createBody("moon", 220, 0, 0, 6.2, 8, 4)
    ];

    selectedBody = bodies[0];
    cameraX = 0;
    cameraY = 0;
    zoom = 1;

    updateEditor();
}

function toggleSimulation() {
    running = !running;
    document.getElementById("toggleButton").textContent = running ? "pause" : "start";
}

function addBodyAtCenter() {
    const body = createBody(
        `body ${bodies.length + 1}`,
        cameraX,
        cameraY,
        0,
        0,
        100,
        7
    );

    bodies.push(body);
    selectedBody = body;
    updateEditor();
}

function clearTrails() {
    for (const body of bodies) {
        body.trail = [];
    }
}

function deleteSelectedBody() {
    if (!selectedBody) return;

    bodies = bodies.filter(body => body !== selectedBody);
    selectedBody = bodies[0] || null;
    updateEditor();
}

function applyBodyEdit() {
    if (!selectedBody) return;

    selectedBody.name = document.getElementById("nameInput").value;
    selectedBody.mass = Number(document.getElementById("massInput").value);
    selectedBody.radius = Number(document.getElementById("radiusInput").value);
    selectedBody.vx = Number(document.getElementById("vxInput").value);
    selectedBody.vy = Number(document.getElementById("vyInput").value);
    selectedBody.trail = [];

    updateEditor();
}

function updateEditor() {
    const info = document.getElementById("bodyInfo");

    if (!selectedBody) {
        info.textContent = "select a body";
        return;
    }

    info.innerHTML =
        `x: ${selectedBody.x.toFixed(1)}<br>` +
        `y: ${selectedBody.y.toFixed(1)}<br>` +
        `speed: ${Math.hypot(selectedBody.vx, selectedBody.vy).toFixed(2)}`;

    document.getElementById("nameInput").value = selectedBody.name;
    document.getElementById("massInput").value = Math.round(selectedBody.mass);
    document.getElementById("radiusInput").value = selectedBody.radius;
    document.getElementById("vxInput").value = selectedBody.vx.toFixed(2);
    document.getElementById("vyInput").value = selectedBody.vy.toFixed(2);
}

function stepSimulation() {
    const G = Number(document.getElementById("gravityInput").value);
    const speed = Number(document.getElementById("speedInput").value);
    const dt = 0.35 * speed;

    for (const body of bodies) {
        body.ax = 0;
        body.ay = 0;
    }

    for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
            const a = bodies[i];
            const b = bodies[j];

            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const distSq = dx * dx + dy * dy + 80;
            const dist = Math.sqrt(distSq);

            const force = G / distSq;

            const ax = force * b.mass * dx / dist;
            const ay = force * b.mass * dy / dist;

            const bx = -force * a.mass * dx / dist;
            const by = -force * a.mass * dy / dist;

            a.ax += ax;
            a.ay += ay;
            b.ax += bx;
            b.ay += by;
        }
    }

    for (const body of bodies) {
        body.vx += body.ax * dt;
        body.vy += body.ay * dt;

        body.x += body.vx * dt;
        body.y += body.vy * dt;

        body.trail.push({ x: body.x, y: body.y });

        const maxTrail = Number(document.getElementById("trailInput").value);
        if (body.trail.length > maxTrail) {
            body.trail.shift();
        }
    }

    handleCollisions();
}

function handleCollisions() {
    for (let i = bodies.length - 1; i >= 0; i--) {
        for (let j = i - 1; j >= 0; j--) {
            const a = bodies[i];
            const b = bodies[j];

            const d = Math.hypot(a.x - b.x, a.y - b.y);

            if (d < a.radius + b.radius) {
                const bigger = a.mass >= b.mass ? a : b;
                const smaller = a.mass < b.mass ? a : b;

                const totalMass = bigger.mass + smaller.mass;

                bigger.vx = (bigger.vx * bigger.mass + smaller.vx * smaller.mass) / totalMass;
                bigger.vy = (bigger.vy * bigger.mass + smaller.vy * smaller.mass) / totalMass;
                bigger.mass = totalMass;
                bigger.radius = Math.sqrt(bigger.radius * bigger.radius + smaller.radius * smaller.radius);

                bodies = bodies.filter(body => body !== smaller);

                if (selectedBody === smaller) {
                    selectedBody = bigger;
                    updateEditor();
                }

                return;
            }
        }
    }
}

function drawSimulation() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawGrid();

    for (const body of bodies) {
        drawTrail(body);
    }

    for (const body of bodies) {
        drawBody(body);
    }

    drawVelocityPreview();

    drawStats();
}

function drawGrid() {
    const spacing = 80 * zoom;
    if (spacing < 18) return;

    ctx.strokeStyle = "#dddddd";
    ctx.lineWidth = 1;

    const offsetX = (-cameraX * zoom + canvas.width / 2) % spacing;
    const offsetY = (-cameraY * zoom + canvas.height / 2) % spacing;

    for (let x = offsetX; x < canvas.width; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    for (let y = offsetY; y < canvas.height; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

function drawTrail(body) {
    if (body.trail.length < 2) return;

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;

    ctx.beginPath();

    for (let i = 0; i < body.trail.length; i++) {
        const p = worldToScreen(body.trail[i].x, body.trail[i].y);

        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
    }

    ctx.stroke();
}

function drawBody(body) {
    const p = worldToScreen(body.x, body.y);
    const r = Math.max(3, body.radius * zoom);

    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = body === selectedBody ? "#000000" : "#ffffff";
    ctx.fill();

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.font = "bold 12px Courier New";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#000000";
    ctx.fillText(body.name, p.x, p.y + r + 6);
}

function drawStats() {
    ctx.font = "bold 13px Courier New";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#000000";

    ctx.fillText(
        `bodies: ${bodies.length} | zoom: ${zoom.toFixed(2)}x | gravity: ${document.getElementById("gravityInput").value}`,
        22,
        22
    );
}

function selectBody(x, y) {
    const world = screenToWorld(x, y);

    let best = null;
    let bestDist = Infinity;

    for (const body of bodies) {
        const d = Math.hypot(world.x - body.x, world.y - body.y);

        if (d < body.radius * 2 && d < bestDist) {
            best = body;
            bestDist = d;
        }
    }

    selectedBody = best;
    updateEditor();
}

function addBodyAtMouse(x, y) {
    const world = screenToWorld(x, y);

    const body = createBody(
        `body ${bodies.length + 1}`,
        world.x,
        world.y,
        0,
        0,
        100,
        7
    );

    bodies.push(body);
    selectedBody = body;
    updateEditor();
}

function drawVelocityPreview() {
    if (!selectedBody) return;

    const p = worldToScreen(selectedBody.x, selectedBody.y);

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(
        p.x + selectedBody.vx * 18 * zoom,
        p.y + selectedBody.vy * 18 * zoom
    );
    ctx.stroke();
}

canvas.addEventListener("mousedown", function(event) {
    if (event.button === 1) {
        middleDragging = true;
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
        event.preventDefault();
        return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (event.button === 0 && event.shiftKey) {
        addBodyAtMouse(x, y);
        return;
    }

    if (event.button === 0) {
        selectBody(x, y);

        if (selectedBody && !running) {
            draggingBody = true;
        }
    }

    if (event.button === 2 && selectedBody && !running) {
        velocityMode = true;
        velocityStart = screenToWorld(x, y);
    }
});

canvas.addEventListener("mousemove", function(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (middleDragging) {
        cameraX -= (event.clientX - lastMouseX) / zoom;
        cameraY -= (event.clientY - lastMouseY) / zoom;

        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
        return;
    }

    if (draggingBody && selectedBody && !running) {
        const world = screenToWorld(x, y);
        selectedBody.x = world.x;
        selectedBody.y = world.y;
        selectedBody.trail = [];
        updateEditor();
    }

    if (velocityMode && selectedBody && !running) {
        const world = screenToWorld(x, y);
        selectedBody.vx = (world.x - velocityStart.x) * 0.03;
        selectedBody.vy = (world.y - velocityStart.y) * 0.03;
        selectedBody.trail = [];
        updateEditor();
    }
});

window.addEventListener("mouseup", function() {
    middleDragging = false;
    draggingBody = false;
    velocityMode = false;
});

canvas.addEventListener("wheel", function(event) {
    event.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const before = screenToWorld(mouseX, mouseY);

    if (event.deltaY < 0) zoom = Math.min(6, zoom * 1.1);
    else zoom = Math.max(0.15, zoom / 1.1);

    const after = screenToWorld(mouseX, mouseY);

    cameraX += before.x - after.x;
    cameraY += before.y - after.y;
});

canvas.addEventListener("contextmenu", function(event) {
    event.preventDefault();
});

function loop() {
    if (running) {
        stepSimulation();
    }

    drawSimulation();

    if (selectedBody) {
        updateEditor();
    }

    requestAnimationFrame(loop);
}

window.addEventListener("resize", resizeCanvas);

resizeCanvas();
resetSystem();
loop();
