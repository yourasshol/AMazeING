const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const resetBtn = document.getElementById("resetBtn");

const COLS = 20;
const ROWS = 20;
const CELL = canvas.width / COLS;

let maze, player, goal;

function init() {
  maze = generateMaze(COLS, ROWS);
  player = { x: 0, y: 0 };
  goal = { x: COLS - 1, y: ROWS - 1 };
  draw();
}

function generateMaze(cols, rows) {
  // Simple randomized DFS maze generator
  const grid = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ visited: false, walls: [true, true, true, true] }))
  );

  function carve(x, y) {
    grid[y][x].visited = true;
    const dirs = shuffle([0, 1, 2, 3]); // up, right, down, left
    for (let d of dirs) {
      const nx = x + [0, 1, 0, -1][d];
      const ny = y + [-1, 0, 1, 0][d];
      if (nx >= 0 && ny >= 0 && nx < cols && ny < rows && !grid[ny][nx].visited) {
        grid[y][x].walls[d] = false;
        grid[ny][nx].walls[(d + 2) % 4] = false;
        carve(nx, ny);
      }
    }
  }
  carve(0, 0);
  return grid;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw maze
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 2;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const cell = maze[y][x];
      const px = x * CELL;
      const py = y * CELL;
      if (cell.walls[0]) line(px, py, px + CELL, py); // top
      if (cell.walls[1]) line(px + CELL, py, px + CELL, py + CELL); // right
      if (cell.walls[2]) line(px, py + CELL, px + CELL, py + CELL); // bottom
      if (cell.walls[3]) line(px, py, px, py + CELL); // left
    }
  }

  // Draw player
  ctx.fillStyle = "#22d3ee";
  ctx.fillRect(player.x * CELL + 4, player.y * CELL + 4, CELL - 8, CELL - 8);

  // Draw goal
  ctx.fillStyle = "#10b981";
  ctx.fillRect(goal.x * CELL + 8, goal.y * CELL + 8, CELL - 16, CELL - 16);
}

function line(x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function move(dx, dy) {
  const cell = maze[player.y][player.x];
  const dir = dx === 0 && dy === -1 ? 0 :
              dx === 1 && dy === 0 ? 1 :
              dx === 0 && dy === 1 ? 2 : 3;
  if (!cell.walls[dir]) {
    player.x += dx;
    player.y += dy;
    draw();
    if (player.x === goal.x && player.y === goal.y) {
      setTimeout(() => alert("You escaped the maze! 🎉"), 100);
    }
  }
}

document.addEventListener("keydown", e => {
  const k = e.key.toLowerCase();
  if (k === "arrowup" || k === "w") move(0, -1);
  else if (k === "arrowdown" || k === "s") move(0, 1);
  else if (k === "arrowleft" || k === "a") move(-1, 0);
  else if (k === "arrowright" || k === "d") move(1, 0);
});

resetBtn.addEventListener("click", init);

init();
