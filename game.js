const MAP_WIDTH = 60,
  MAP_HEIGHT = 28;
const CELL_WIDTH = 14,
  CELL_HEIGHT = 20;
const HUD_HEIGHT = 90;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.width = MAP_WIDTH * CELL_WIDTH;
canvas.height = MAP_HEIGHT * CELL_HEIGHT;

let map, player;

function genLevel() {
  map = Array.from({ length: MAP_HEIGHT }, (_, y) =>
    Array.from({ length: MAP_WIDTH }, (_, x) =>
      x === 0 || y === 0 || x === MAP_WIDTH - 1 || y === MAP_HEIGHT - 1
        ? "#"
        : ".",
    ),
  );
}

const isWall = (x, y) => map[y]?.[x] !== ".";

function playerMove(dx, dy) {
  const nx = player.x + dx,
    ny = player.y + dy;
  if (isWall(nx, ny)) return;
  player.x = nx;
  player.y = ny;
}

function drawChar(char, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillText(
    char,
    x * CELL_WIDTH + CELL_WIDTH / 2,
    y * CELL_HEIGHT + CELL_HEIGHT / 2,
  );
}

function draw() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = "18px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let y = 0; y < MAP_HEIGHT; y++)
    for (let x = 0; x < MAP_WIDTH; x++)
      drawChar(map[y][x], x, y, map[y][x] === "#" ? "#555" : "#2a2a2a");

  drawChar("@", player.x, player.y, "#fff");
}

const KEYS = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  KeyW: [0, -1],
  KeyS: [0, 1],
  KeyA: [-1, 0],
  KeyD: [1, 0],
};

addEventListener("keydown", (event) => {
  if (!KEYS[event.code]) return;
  event.preventDefault();
  playerMove(...KEYS[event.code]);
  draw();
});

player = { x: MAP_WIDTH >> 1, y: MAP_HEIGHT >> 1 };
genLevel();
draw();
