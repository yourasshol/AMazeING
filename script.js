const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const resetBtn = document.getElementById("resetBtn");
const pathBtn = document.getElementById("pathBtn");
const sizeSelect = document.getElementById("sizeSelect");

let COLS = 20;// DOM
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const resetBtn = document.getElementById("resetBtn");
const pathBtn = document.getElementById("pathBtn");
const sizeSelect = document.getElementById("sizeSelect");

// Maze params
let COLS = parseInt(sizeSelect.value, 10);
let ROWS = COLS;
let CELL = canvas.width / COLS;

// Game state
let maze;           // grid of cells { visited, walls:[top,right,bottom,left] }
let player;         // { x,y, renderX, renderY, animating }
let goal;           // { x,y }
let enemy;          // { x,y, renderX, renderY, animating }
let showPath = false;
let shortestPath = []; // array of {x,y}
let enemyTimer = null;
let gameOver = false;

// Init
init();

// Events
resetBtn.addEventListener("click", init);
pathBtn.addEventListener("click", () => {
  showPath = !showPath;
  pathBtn.textContent = showPath ? "Hide Path" : "Show Path";
  if (showPath) shortestPath = solveShortestPath({ x: 0, y: 0 }, goal);
  draw();
});
sizeSelect.addEventListener("change", () => {
  COLS = parseInt(sizeSelect.value, 10);
  ROWS = COLS;
  CELL = canvas.width / COLS;
  init();
});

document.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (player.animating) return; // ignore inputs while animating
  if (k === "arrowup" || k === "w") tryMovePlayer(0, -1);
  else if (k === "arrowdown" || k === "s") tryMovePlayer(0, 1);
  else if (k === "arrowleft" || k === "a") tryMovePlayer(-1, 0);
  else if (k === "arrowright" || k === "d") tryMovePlayer(1, 0);
});

// Core
function init() {
  maze = generateMaze(COLS, ROWS);
  player = { x: 0, y: 0, renderX: 0, renderY: 0, animating: false };
  goal = { x: COLS - 1, y: ROWS - 1 };
  // Place enemy away from player; top-right corner works well
  enemy = { x: COLS - 1, y: 0, renderX: COLS - 1, renderY: 0, animating: false };
  showPath = false;
  shortestPath = [];
  pathBtn.textContent = "Show Path";
  gameOver = false;
  clearInterval(enemyTimer);
  enemyTimer = setInterval(stepEnemy, 450); // chase speed
  draw();
}

function generateMaze(cols, rows) {
  const grid = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ visited: false, walls: [true, true, true, true] }))
  );

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function carve(x, y) {
    grid[y][x].visited = true;
    const dirs = shuffle([0, 1, 2, 3]); // 0:top,1:right,2:bottom,3:left
    for (const d of dirs) {
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

  // Clean visited flags for clarity
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) grid[y][x].visited = false;
  return grid;
}

// Drawing
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Maze walls
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 2;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const cell = maze[y][x];
      const px = x * CELL;
      const py = y * CELL;
      if (cell.walls[0]) line(px, py, px + CELL, py);             // top
      if (cell.walls[1]) line(px + CELL, py, px + CELL, py + CELL); // right
      if (cell.walls[2]) line(px, py + CELL, px + CELL, py + CELL); // bottom
      if (cell.walls[3]) line(px, py, px, py + CELL);               // left
    }
  }

  // Path overlay (shortest path)
  if (showPath && shortestPath.length > 0) {
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = Math.max(3, CELL * 0.1);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    const cx = (p) => p.x * CELL + CELL / 2;
    const cy = (p) => p.y * CELL + CELL / 2;
    ctx.moveTo(cx(shortestPath[0]), cy(shortestPath[0]));
    for (let i = 1; i < shortestPath.length; i++) {
      ctx.lineTo(cx(shortestPath[i]), cy(shortestPath[i]));
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Goal
  fillRect(goal.x, goal.y, CELL - 16, CELL - 16, "#10b981", 8);

  // Enemy (red)
  fillRect(enemy.renderX, enemy.renderY, CELL - 12, CELL - 12, "#ef4444", 6);

  // Player with glow
  ctx.shadowColor = "#22d3ee";
  ctx.shadowBlur = 18;
  fillRect(player.renderX, player.renderY, CELL - 8, CELL - 8, "#22d3ee", 4);
  ctx.shadowBlur = 0;
}

function line(x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function fillRect(gridX, gridY, size, color, pad = 0) {
  const x = gridX * CELL + pad;
  const y = gridY * CELL + pad;
  const w = size;
  const h = size;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

// Movement + animation
function tryMovePlayer(dx, dy) {
  const dirIdx = dirIndex(dx, dy);
  const cell = maze[player.y][player.x];
  if (cell.walls[dirIdx]) return; // wall blocks movement
  const nx = player.x + dx;
  const ny = player.y + dy;
  animateTo(player, nx, ny, 120, () => {
    // Check goal
    if (player.x === goal.x && player.y === goal.y) {
      alert("You escaped the maze! 🎉");
      init(); // auto-reset maze
    }
    // Recompute path overlay from new position
    if (showPath) {
      shortestPath = solveShortestPath({ x: player.x, y: player.y }, goal);
    }
  });
}

function stepEnemy() {
  if (gameOver || enemy.animating) return;

  // Chase respecting walls: take first step of shortest path from enemy to player
  const path = solveShortestPath({ x: enemy.x, y: enemy.y }, { x: player.x, y: player.y });
  if (path.length >= 2) {
    const next = path[1];
    animateTo(enemy, next.x, next.y, 140, () => {
      // Collision check
      if (enemy.x === player.x && enemy.y === player.y) {
        alert("Caught by the red cube! 💀");
        init();
      }
    });
  }
}

function animateTo(obj, targetX, targetY, durationMs = 120, onDone) {
  obj.animating = true;
  const startX = obj.renderX;
  const startY = obj.renderY;
  const dx = targetX - startX;
  const dy = targetY - startY;
  const start = performance.now();

  function easeOutQuad(t) { return 1 - (1 - t) * (1 - t); }

  function frame(now) {
    const t = Math.min(1, (now - start) / durationMs);
    const e = easeOutQuad(t);
    obj.renderX = startX + dx * e;
    obj.renderY = startY + dy * e;
    draw();
    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      obj.x = targetX;
      obj.y = targetY;
      obj.renderX = obj.x;
      obj.renderY = obj.y;
      obj.animating = false;
      if (onDone) onDone();
    }
  }
  requestAnimationFrame(frame);
}

function dirIndex(dx, dy) {
  // Map movement to wall index: 0:top,1:right,2:bottom,3:left
  if (dx === 0 && dy === -1) return 0;
  if (dx === 1 && dy === 0) return 1;
  if (dx === 0 && dy === 1) return 2;
  return 3; // dx === -1 && dy === 0
}

// Pathfinding (BFS shortest path)
function neighbors(x, y) {
  const cell = maze[y][x];
  const list = [];
  // top
  if (!cell.walls[0] && y - 1 >= 0) list.push({ x, y: y - 1 });
  // right
  if (!cell.walls[1] && x + 1 < COLS) list.push({ x: x + 1, y });
  // bottom
  if (!cell.walls[2] && y + 1 < ROWS) list.push({ x, y: y + 1 });
  // left
  if (!cell.walls[3] && x - 1 >= 0) list.push({ x: x - 1, y });
  return list;
}

function solveShortestPath(start, end) {
  const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  const prev = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  const q = [];
  q.push(start);
  visited[start.y][start.x] = true;

  while (q.length) {
    const cur = q.shift();
    if (cur.x === end.x && cur.y === end.y) break;
    for (const n of neighbors(cur.x, cur.y)) {
      if (!visited[n.y][n.x]) {
        visited[n.y][n.x] = true;
        prev[n.y][n.x] = cur;
        q.push(n);
      }
    }
  }

  // Reconstruct path
  const path = [];
  let cur = { x: end.x, y: end.y };
  if (!visited[end.y][end.x]) return path; // no path found
  while (cur) {
    path.push(cur);
    cur = prev[cur.y][cur.x];
  }
  path.reverse();
  return path;
}

let ROWS = 20;
let CELL = canvas.width / COLS;

let maze, player, goal, enemy, gameOver;

function init() {
  maze = generateMaze(COLS, ROWS);
  player = { x: 0, y: 0, renderX: 0, renderY: 0 };
  goal = { x: COLS - 1, y: ROWS - 1 };
  enemy = { x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2), renderX: Math.floor(COLS / 2), renderY: Math.floor(ROWS / 2) };
  gameOver = false;
  draw();
}

function generateMaze(cols, rows) {
  const grid = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ visited: false, walls: [true, true, true, true] }))
  );

  function carve(x, y) {
    grid[y][x].visited = true;
    const dirs = shuffle([0, 1, 2, 3]);
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

  // Maze
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 2;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const cell = maze[y][x];
      const px = x * CELL;
      const py = y * CELL;
      if (cell.walls[0]) line(px, py, px + CELL, py);
      if (cell.walls[1]) line(px + CELL, py, px + CELL, py + CELL);
      if (cell.walls[2]) line(px, py + CELL, px + CELL, py + CELL);
      if (cell.walls[3]) line(px, py, px, py + CELL);
    }
  }

  // Player with glow
  ctx.shadowColor = "#22d3ee";
  ctx.shadowBlur = 15;
  ctx.fillStyle = "#22d3ee";
  ctx.fillRect(player.renderX * CELL + 4, player.renderY * CELL + 4, CELL - 8, CELL - 8);
  ctx.shadowBlur = 0;

  // Goal
  ctx.fillStyle = "#10b981";
  ctx.fillRect(goal.x * CELL + 8, goal.y * CELL + 8, CELL - 16, CELL - 16);

  // Enemy
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(enemy.renderX * CELL + 6, enemy.renderY * CELL + 6, CELL - 12, CELL - 12);
}

function line(x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function animateMove(obj, targetX, targetY, callback) {
  const startX = obj.renderX;
  const startY = obj.renderY;
  const steps = 8;
  let step = 0;
  const interval = setInterval(() => {
    step++;
    const t = step / steps;
    obj.renderX = startX + (targetX - startX) * t;
    obj.renderY = startY + (targetY - startY) * t;
    draw();
    if (step === steps) {
      clearInterval(interval);
      obj.x = targetX;
      obj.y = targetY;
      obj.renderX = obj.x;
      obj.renderY = obj.y;
      if (callback) callback();
    }
  }, 30);
}

function move(dx, dy) {
  if (gameOver) return;
  const cell = maze[player.y][player.x];
  const dir = dx === 0 && dy === -1 ? 0 :
              dx === 1 && dy === 0 ? 1 :
              dx === 0 && dy === 1 ? 2 : 3;
  if (!cell.walls[dir]) {
    animateMove(player, player.x + dx, player.y + dy, () => {
      if (player.x === goal.x && player.y === goal.y) {
        alert("You escaped the maze! 🎉");
        init(); // reset maze
      }
    });
  }
}

function moveEnemy() {
  if (gameOver) return;
  let dx = 0, dy = 0;
  if (Math.abs(player.x - enemy.x) > Math.abs(player.y - enemy.y)) {
    dx = player.x > enemy.x ? 1 : -1;
  } else {
    dy = player.y > enemy.y ? 1 : -1;
  }
  animateMove(enemy, enemy.x + dx, enemy.y + dy, () => {
    if (enemy.x === player.x && enemy.y === player.y) {
      alert("YoU hAvE bEeN cAuGhT bY tHe EvIl CuBe!");
      init();
    }
  });
}

setInterval(moveEnemy, 600);

function solveMaze() {
  const queue = [{ x: player.x, y: player.y, path: [] }];
