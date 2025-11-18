const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const resetBtn = document.getElementById("resetBtn");
const pathBtn = document.getElementById("pathBtn");
const sizeSelect = document.getElementById("sizeSelect");

let COLS = 20;
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
