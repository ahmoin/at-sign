const MAP_WIDTH = 60,
  MAP_HEIGHT = 28;
const CELL_WIDTH = 14,
  CELL_HEIGHT = 20;
const HUD_HEIGHT = 90;
const MAX_ROOMS = 9,
  ROOM_PLACEMENT_TRIES = 60;
const ROOM_MIN_WIDTH = 5,
  ROOM_MAX_WIDTH = 12;
const ROOM_MIN_HEIGHT = 4,
  ROOM_MAX_HEIGHT = 7;
const MAX_MESSAGES = 3;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.width = MAP_WIDTH * CELL_WIDTH;
canvas.height = MAP_HEIGHT * CELL_HEIGHT + HUD_HEIGHT;

let map, player, stairs, depth, messages;

const rand = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const log = (msg) => {
  messages.push(msg);
  if (messages.length > MAX_MESSAGES) messages.shift();
};

function carve(x1, y1, x2, y2) {
  for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) map[y][x] = ".";
}

function genLevel() {
  map = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill("#"));
  const rooms = [];

  for (
    let tries = 0;
    tries < ROOM_PLACEMENT_TRIES && rooms.length < MAX_ROOMS;
    tries++
  ) {
    const width = rand(ROOM_MIN_WIDTH, ROOM_MAX_WIDTH),
      height = rand(ROOM_MIN_HEIGHT, ROOM_MAX_HEIGHT);
    const x = rand(1, MAP_WIDTH - width - 2),
      y = rand(1, MAP_HEIGHT - height - 2);
    const overlaps = rooms.some(
      (other) =>
        x - 1 <= other.x + other.width &&
        x + width + 1 >= other.x &&
        y - 1 <= other.y + other.height &&
        y + height + 1 >= other.y,
    );
    if (overlaps) continue;

    const room = {
      x,
      y,
      width,
      height,
      centerX: x + (width >> 1),
      centerY: y + (height >> 1),
    };
    carve(x, y, x + width - 1, y + height - 1);

    const prev = rooms[rooms.length - 1];
    if (prev) {
      carve(prev.centerX, prev.centerY, room.centerX, prev.centerY);
      carve(room.centerX, prev.centerY, room.centerX, room.centerY);
    }
    rooms.push(room);
  }

  player.x = rooms[0].centerX;
  player.y = rooms[0].centerY;
  const last = rooms[rooms.length - 1];
  stairs = { x: last.centerX, y: last.centerY };
}

const isWall = (x, y) => map[y]?.[x] !== ".";

function playerMove(dx, dy) {
  const nx = player.x + dx,
    ny = player.y + dy;
  if (isWall(nx, ny)) return;
  player.x = nx;
  player.y = ny;
  if (nx === stairs.x && ny === stairs.y) {
    depth++;
    log(`You descend to depth ${depth}.`);
    genLevel();
  }
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

  drawChar(">", stairs.x, stairs.y, "#ff0");
  drawChar("@", player.x, player.y, "#fff");

  ctx.textAlign = "left";
  ctx.font = "16px monospace";
  ctx.fillStyle = "#fff";
  const top = MAP_HEIGHT * CELL_HEIGHT + 18;
  ctx.fillText(`Depth ${depth}`, 10, top);
  ctx.fillStyle = "#aaa";
  messages.forEach((message, line) =>
    ctx.fillText(message, 10, top + 22 * (line + 1)),
  );
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
depth = 1;
messages = [];
genLevel();
log("Find the > to go deeper.");
draw();
