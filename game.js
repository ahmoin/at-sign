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
const POTION_HEAL = 8,
  POTION_CHANCE = 0.4;
const VIEW_RADIUS = 7;
const XP_PER_LEVEL = 5;
const LEVEL_HP_GAIN = 5,
  LEVEL_ATK_GAIN = 1;
const HP_BAR_WIDTH = 10;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.width = MAP_WIDTH * CELL_WIDTH;
canvas.height = MAP_HEIGHT * CELL_HEIGHT + HUD_HEIGHT;

const MONSTERS = [
  {
    char: "r",
    name: "rat",
    hp: 3,
    atk: 1,
    xp: 1,
    color: "#b08860",
    minDepth: 1,
  },
  {
    char: "g",
    name: "goblin",
    hp: 6,
    atk: 2,
    xp: 3,
    color: "#5c5",
    minDepth: 1,
  },
  { char: "O", name: "orc", hp: 10, atk: 3, xp: 6, color: "#c55", minDepth: 3 },
];

let map,
  seen,
  player,
  monsters,
  potions,
  stairs,
  depth,
  messages,
  dead,
  lastHit;

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
  seen = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(false));
  monsters = [];
  potions = [];
  lastHit = null;
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

    if (Math.random() < POTION_CHANCE) {
      const x = rand(room.x, room.x + room.width - 1),
        y = rand(room.y, room.y + room.height - 1);
      if (!(x === stairs.x && y === stairs.y)) potions.push({ x, y });
    }
  }
}

const isWall = (x, y) => map[y]?.[x] !== ".";
const monsterAt = (x, y) =>
  monsters.find((monster) => monster.x === x && monster.y === y);
const potionAt = (x, y) =>
  potions.find((potion) => potion.x === x && potion.y === y);

function attack(attacker, target) {
  const dmg = rand(1, attacker.atk);
  target.hp -= dmg;
  return dmg;
}

const xpToNextLevel = () => player.level * XP_PER_LEVEL;

function gainXp(amount) {
  player.xp += amount;
  while (player.xp >= xpToNextLevel()) {
    player.xp -= xpToNextLevel();
    player.level++;
    player.maxHp += LEVEL_HP_GAIN;
    player.hp += LEVEL_HP_GAIN;
    player.atk += LEVEL_ATK_GAIN;
    log(`You reach level ${player.level}!`);
  }
}

function playerMove(dx, dy) {
  if (dead) return;
  const nx = player.x + dx,
    ny = player.y + dy;
  const target = monsterAt(nx, ny);

  if (target) {
    const dmg = attack(player, target);
    log(`You hit the ${target.name} for ${dmg}.`);
    lastHit = target;
    if (target.hp <= 0) {
      log(`The ${target.name} dies.`);
      monsters = monsters.filter((other) => other !== target);
      lastHit = null;
      player.kills++;
      gainXp(target.xp);
    }
  } else if (!isWall(nx, ny)) {
    player.x = nx;
    player.y = ny;
    const potion = potionAt(nx, ny);
    if (potion) {
      const healed = Math.min(POTION_HEAL, player.maxHp - player.hp);
      player.hp += healed;
      potions = potions.filter((other) => other !== potion);
      log(`You drink a potion and heal ${healed}.`);
    }
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

function hasLineOfSight(fromX, fromY, toX, toY) {
  const dx = Math.abs(toX - fromX),
    dy = -Math.abs(toY - fromY);
  const sx = fromX < toX ? 1 : -1,
    sy = fromY < toY ? 1 : -1;
  let error = dx + dy,
    x = fromX,
    y = fromY;
  while (true) {
    if (x === toX && y === toY) return true;
    if ((x !== fromX || y !== fromY) && isWall(x, y)) return false;
    const doubledError = 2 * error;
    if (doubledError >= dy) {
      error += dy;
      x += sx;
    }
    if (doubledError <= dx) {
      error += dx;
      y += sy;
    }
  }
}

function computeVisible() {
  const visible = Array.from({ length: MAP_HEIGHT }, () =>
    Array(MAP_WIDTH).fill(false),
  );
  for (let y = player.y - VIEW_RADIUS; y <= player.y + VIEW_RADIUS; y++)
    for (let x = player.x - VIEW_RADIUS; x <= player.x + VIEW_RADIUS; x++) {
      if (x < 0 || y < 0 || x >= MAP_WIDTH || y >= MAP_HEIGHT) continue;
      const distSquared = (x - player.x) ** 2 + (y - player.y) ** 2;
      if (
        distSquared <= VIEW_RADIUS ** 2 &&
        hasLineOfSight(player.x, player.y, x, y)
      ) {
        visible[y][x] = true;
        seen[y][x] = true;
      }
    }
  return visible;
}

function drawChar(char, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillText(
    char,
    x * CELL_WIDTH + CELL_WIDTH / 2,
    y * CELL_HEIGHT + CELL_HEIGHT / 2,
  );
}

function hpBar(monster) {
  const filled = Math.ceil((HP_BAR_WIDTH * monster.hp) / monster.maxHp);
  return `[${"#".repeat(filled)}${"-".repeat(HP_BAR_WIDTH - filled)}]`;
}

function draw() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = "18px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const visible = computeVisible();
  for (let y = 0; y < MAP_HEIGHT; y++)
    for (let x = 0; x < MAP_WIDTH; x++) {
      if (!seen[y][x]) continue;
      const isWallTile = map[y][x] === "#";
      const color = visible[y][x]
        ? isWallTile
          ? "#555"
          : "#2a2a2a"
        : isWallTile
          ? "#2e2e2e"
          : "#161616";
      drawChar(map[y][x], x, y, color);
    }

  if (seen[stairs.y][stairs.x])
    drawChar(
      ">",
      stairs.x,
      stairs.y,
      visible[stairs.y][stairs.x] ? "#ff0" : "#770",
    );
  for (const potion of potions)
    if (visible[potion.y][potion.x]) drawChar("!", potion.x, potion.y, "#e5e");
  for (const monster of monsters)
    if (visible[monster.y][monster.x])
      drawChar(monster.char, monster.x, monster.y, monster.color);
  drawChar("@", player.x, player.y, dead ? "#800" : "#fff");

  ctx.textAlign = "left";
  ctx.font = "16px monospace";
  ctx.fillStyle = "#fff";
  const top = MAP_HEIGHT * CELL_HEIGHT + 18;
  let status = `HP ${Math.max(0, player.hp)}/${player.maxHp}   Lv ${player.level}   XP ${player.xp}/${xpToNextLevel()}   Depth ${depth}   Kills ${player.kills}`;
  if (lastHit && visible[lastHit.y][lastHit.x])
    status += `   ${lastHit.name} ${hpBar(lastHit)}`;
  ctx.fillText(status, 10, top);
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
  player = { x: 0, y: 0, hp: 20, maxHp: 20, atk: 4, kills: 0, level: 1, xp: 0 };
  depth = 1;
  messages = [];
  dead = false;
  genLevel();
  log("Find the > to go deeper. Bump monsters to attack. Drink ! to heal.");
  draw();
}

newGame();
