const projects = [
    { title: "8 Ball Pool", url: "pool.html" },
    { title: "Wordle", url: "wordle.html" },
    { title: "Monte Carlo Pi", url: "pi.html" },
    { title: "Chess", url: "chess.html" },
    { title: "Conway's Game of Life", url: "life.html" },
    { title: "Tetris", url: "tetris.html" },
    { title: "Urban Growth Simulator", url: "urban.html" },
    { title: "Fluid Simulation", url: "fluid.html" },
    { title: "N-Body Simulation", url: "nbody.html" },
    { title: "Pathfinding Visualizer", url: "pathfinding.html" },
    { title: "Double Pendulum Chaos", url: "pendulum.html" },
    { title: "2048", url: "2048.html" },
    { title: "Minesweeper", url: "minesweeper.html" },
    { title: "Pong", url: "pong.html" },
    { title: "Asteroids", url: "asteroids.html" },
    { title: "Breakout", url: "breakout.html" }
];

const input = document.getElementById("projectSearch");
const results = document.getElementById("searchResults");

input.addEventListener("input", function () {
    const query = input.value.toLowerCase().trim();

    results.innerHTML = "";

    if (query.length === 0) {
        results.style.display = "none";
        return;
    }

    const matches = projects.filter(project =>
        project.title.toLowerCase().includes(query)
    );

    if (matches.length === 0) {
        results.innerHTML = `<div class="search-result">no results</div>`;
        results.style.display = "block";
        return;
    }

    for (const project of matches) {
        const link = document.createElement("a");
        link.className = "search-result";
        link.href = project.url;
        link.textContent = project.title;
        results.appendChild(link);
    }

    results.style.display = "block";
});

document.addEventListener("click", function (event) {
    if (!event.target.closest(".nav-search")) {
        results.style.display = "none";
    }
});
