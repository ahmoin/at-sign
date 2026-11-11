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
const MONSTER_SIGHT = 9;
const STAIRS_HEAL = 5;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.width = MAP_WIDTH * CELL_WIDTH;
canvas.height = MAP_HEIGHT * CELL_HEIGHT + HUD_HEIGHT;

const MONSTERS = [
  { char: "r", name: "rat", hp: 3, atk: 1, color: "#b08860", minDepth: 1 },
  { char: "g", name: "goblin", hp: 6, atk: 2, color: "#5c5", minDepth: 1 },
  { char: "O", name: "orc", hp: 10, atk: 3, color: "#c55", minDepth: 3 },
];

let map, player, monsters, stairs, depth, messages, dead;

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
  monsters = [];
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

  const pool = MONSTERS.filter((type) => type.minDepth <= depth);
  for (const room of rooms.slice(1)) {
    const count = rand(0, 1 + Math.floor(depth / 2));
    for (let spawned = 0; spawned < count; spawned++) {
      const type = pool[rand(0, pool.length - 1)];
      const x = rand(room.x, room.x + room.width - 1),
        y = rand(room.y, room.y + room.height - 1);
      if (!monsterAt(x, y) && !(x === stairs.x && y === stairs.y))
        monsters.push({ ...type, x, y, maxHp: type.hp });
    }
  }
}

const isWall = (x, y) => map[y]?.[x] !== ".";
const monsterAt = (x, y) =>
  monsters.find((monster) => monster.x === x && monster.y === y);

function attack(attacker, target) {
  const dmg = rand(1, attacker.atk);
  target.hp -= dmg;
  return dmg;
}

function playerMove(dx, dy) {
  if (dead) return;
  const nx = player.x + dx,
    ny = player.y + dy;
  const target = monsterAt(nx, ny);

  if (target) {
    const dmg = attack(player, target);
    log(`You hit the ${target.name} for ${dmg}.`);
    if (target.hp <= 0) {
      log(`The ${target.name} dies.`);
      monsters = monsters.filter((other) => other !== target);
      player.kills++;
    }
  } else if (!isWall(nx, ny)) {
    player.x = nx;
    player.y = ny;
    if (nx === stairs.x && ny === stairs.y) {
      depth++;
      player.hp = Math.min(player.maxHp, player.hp + STAIRS_HEAL);
      log(`You descend to depth ${depth}.`);
      genLevel();
      return;
    }
  } else {
    return;
  }
  monstersTurn();
}

function monstersTurn() {
  for (const monster of monsters) {
    const dx = player.x - monster.x,
      dy = player.y - monster.y;
    const dist = Math.abs(dx) + Math.abs(dy);

    if (dist === 1) {
      const dmg = attack(monster, player);
      log(`The ${monster.name} hits you for ${dmg}.`);
      if (player.hp <= 0) {
        dead = true;
        log(`You died on depth ${depth}. Press R to try again.`);
        return;
      }
    } else if (dist < MONSTER_SIGHT) {
      const steps =
        Math.abs(dx) > Math.abs(dy)
          ? [
              [Math.sign(dx), 0],
              [0, Math.sign(dy)],
            ]
          : [
              [0, Math.sign(dy)],
              [Math.sign(dx), 0],
            ];
      for (const [sx, sy] of steps) {
        const nx = monster.x + sx,
          ny = monster.y + sy;
        if (
          (sx || sy) &&
          !isWall(nx, ny) &&
          !monsterAt(nx, ny) &&
          !(nx === player.x && ny === player.y)
        ) {
          monster.x = nx;
          monster.y = ny;
          break;
        }
      }
    }
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
  for (const monster of monsters)
    drawChar(monster.char, monster.x, monster.y, monster.color);
  drawChar("@", player.x, player.y, dead ? "#800" : "#fff");

  ctx.textAlign = "left";
  ctx.font = "16px monospace";
  ctx.fillStyle = "#fff";
  const top = MAP_HEIGHT * CELL_HEIGHT + 18;
  ctx.fillText(
    `HP ${Math.max(0, player.hp)}/${player.maxHp}   Depth ${depth}   Kills ${player.kills}`,
    10,
    top,
  );
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
  if (KEYS[event.code]) {
    event.preventDefault();
    playerMove(...KEYS[event.code]);
  } else if (event.code === "KeyR" && dead) {
    newGame();
  }
  draw();
});

function newGame() {
  player = { x: 0, y: 0, hp: 20, maxHp: 20, atk: 4, kills: 0 };
  depth = 1;
  messages = [];
  dead = false;
  genLevel();
  log("Find the > to go deeper. Bump monsters to attack.");
  draw();
}

newGame();
