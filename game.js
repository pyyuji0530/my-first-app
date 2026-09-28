const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const WORLD_WIDTH = 2480;
const GRAVITY = 1750;
const MOVE_SPEED = 290;
const JUMP_SPEED = 690;

const platforms = [
  { x: 0, y: 468, width: 610, height: 110 },
  { x: 720, y: 468, width: 530, height: 110 },
  { x: 1390, y: 468, width: 1090, height: 110 },
  { x: 250, y: 365, width: 170, height: 18 },
  { x: 490, y: 300, width: 150, height: 18 },
  { x: 810, y: 370, width: 180, height: 18 },
  { x: 1050, y: 310, width: 160, height: 18 },
  { x: 1510, y: 365, width: 180, height: 18 },
  { x: 1780, y: 305, width: 170, height: 18 },
  { x: 2050, y: 365, width: 190, height: 18 },
];

const startingEnemies = [
  { x: 370, minX: 335, maxX: 555 },
  { x: 900, minX: 755, maxX: 1170 },
  { x: 1580, minX: 1420, maxX: 1730 },
  { x: 1980, minX: 1850, maxX: 2300 },
];

const keys = new Set();
const touchControls = new Set();
const player = {
  x: 70,
  y: 410,
  width: 34,
  height: 54,
  vx: 0,
  vy: 0,
  facing: 1,
  health: 3,
  invulnerable: 0,
  attackTime: 0,
  attackCooldown: 0,
  attackHits: new Set(),
  grounded: false,
};

let enemies = [];
let cameraX = 0;
let gameState = "playing";
let previousTime = 0;
let elapsedTime = 0;
let jumpWasDown = false;
let attackWasDown = false;

function resetGame() {
  player.x = 70;
  player.y = 410;
  player.vx = 0;
  player.vy = 0;
  player.facing = 1;
  player.health = 3;
  player.invulnerable = 0;
  player.attackTime = 0;
  player.attackCooldown = 0;
  player.attackHits.clear();
  player.grounded = false;
  cameraX = 0;
  elapsedTime = 0;
  enemies = startingEnemies.map((enemy, id) => ({
    ...enemy,
    id,
    x: enemy.x,
    y: 428,
    width: 32,
    height: 40,
    direction: id % 2 === 0 ? 1 : -1,
    alive: true,
  }));
  gameState = "playing";
}

function isDown(...controls) {
  return controls.some((control) => keys.has(control) || touchControls.has(control));
}

function beginAttack() {
  if (gameState !== "playing" || player.attackCooldown > 0) return;
  player.attackTime = 0.2;
  player.attackCooldown = 0.34;
  player.attackHits.clear();
}

function update(delta) {
  elapsedTime += delta;
  const moveLeft = isDown("ArrowLeft", "KeyA", "left");
  const moveRight = isDown("ArrowRight", "KeyD", "right");
  const jumpDown = isDown("Space", "ArrowUp", "KeyW", "jump");
  const attackDown = isDown("KeyJ", "KeyX", "attack");

  if (isDown("KeyR")) {
    resetGame();
    return;
  }
  if (gameState !== "playing") return;

  if (attackDown && !attackWasDown) beginAttack();
  if (jumpDown && !jumpWasDown && player.grounded) {
    player.vy = -JUMP_SPEED;
    player.grounded = false;
  }
  jumpWasDown = jumpDown;
  attackWasDown = attackDown;

  player.vx = (Number(moveRight) - Number(moveLeft)) * MOVE_SPEED;
  if (player.vx !== 0) player.facing = Math.sign(player.vx);
  player.x = Math.max(0, Math.min(WORLD_WIDTH - player.width, player.x + player.vx * delta));

  const previousBottom = player.y + player.height;
  player.vy += GRAVITY * delta;
  player.y += player.vy * delta;
  player.grounded = false;

  for (const platform of platforms) {
    const overlapsX = player.x + player.width > platform.x && player.x < platform.x + platform.width;
    const crossedTop = previousBottom <= platform.y && player.y + player.height >= platform.y;
    if (player.vy >= 0 && overlapsX && crossedTop) {
      player.y = platform.y - player.height;
      player.vy = 0;
      player.grounded = true;
    }
  }

  player.invulnerable = Math.max(0, player.invulnerable - delta);
  player.attackCooldown = Math.max(0, player.attackCooldown - delta);
  player.attackTime = Math.max(0, player.attackTime - delta);
  updateEnemies(delta);

  if (player.y > HEIGHT + 160) takeDamage(true);
  if (player.x >= WORLD_WIDTH - 150) gameState = "won";

  const targetCamera = Math.max(0, Math.min(WORLD_WIDTH - WIDTH, player.x - WIDTH * 0.36));
  cameraX += (targetCamera - cameraX) * Math.min(1, delta * 7);
}

function updateEnemies(delta) {
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    enemy.x += enemy.direction * 72 * delta;
    if (enemy.x < enemy.minX || enemy.x + enemy.width > enemy.maxX) {
      enemy.direction *= -1;
      enemy.x = Math.max(enemy.minX, Math.min(enemy.maxX - enemy.width, enemy.x));
    }

    const attackX = player.facing > 0 ? player.x + player.width : player.x - 48;
    const attackRight = player.facing > 0 ? attackX + 48 : player.x;
    const hitting = player.attackTime > 0 && attackRight > enemy.x && attackX < enemy.x + enemy.width &&
      player.y + player.height > enemy.y && player.y < enemy.y + enemy.height;
    if (hitting && !player.attackHits.has(enemy.id)) {
      enemy.alive = false;
      player.attackHits.add(enemy.id);
      continue;
    }

    const colliding = player.x + player.width > enemy.x && player.x < enemy.x + enemy.width &&
      player.y + player.height > enemy.y && player.y < enemy.y + enemy.height;
    if (colliding && player.invulnerable <= 0) takeDamage(false);
  }
}

function takeDamage(fell) {
  player.health -= 1;
  player.invulnerable = 1.15;
  if (player.health <= 0) {
    gameState = "lost";
    return;
  }

  if (fell) {
    player.x = Math.max(20, player.x - 130);
    player.y = 300;
    player.vy = 0;
  } else {
    player.vx = -player.facing * 220;
    player.vy = -270;
  }
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, "#8dc7df");
  sky.addColorStop(0.7, "#d0e4d7");
  sky.addColorStop(1, "#f2c994");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "rgba(255, 244, 207, 0.8)";
  ctx.beginPath();
  ctx.arc(770 - cameraX * 0.08, 105, 40, 0, Math.PI * 2);
  ctx.fill();

  drawCloud(160 - cameraX * 0.15, 105, 1);
  drawCloud(565 - cameraX * 0.12, 165, 0.8);
  drawCloud(910 - cameraX * 0.16, 95, 0.9);

  drawMountainLayer("#9ac8c5", 0.2, 365, 95);
  drawMountainLayer("#709e9e", 0.34, 420, 72);
}

function drawCloud(x, y, scale) {
  x = ((x % (WIDTH + 220)) + WIDTH + 220) % (WIDTH + 220) - 110;
  ctx.fillStyle = "rgba(255, 255, 255, 0.48)";
  ctx.beginPath();
  ctx.ellipse(x, y, 43 * scale, 13 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(x - 22 * scale, y + 2 * scale, 20 * scale, 13 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 17 * scale, y - 7 * scale, 25 * scale, 18 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawMountainLayer(color, speed, baseY, peakHeight) {
  const offset = (cameraX * speed) % 300;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, HEIGHT);
  for (let x = -300 - offset; x <= WIDTH + 300; x += 150) {
    const peakX = x + 75;
    ctx.lineTo(peakX, baseY - peakHeight * (0.65 + Math.sin((x + 300) * 0.035) * 0.35));
    ctx.lineTo(x + 150, baseY);
  }
  ctx.lineTo(WIDTH, HEIGHT);
  ctx.closePath();
  ctx.fill();
}

function drawWorld() {
  ctx.save();
  ctx.translate(-cameraX, 0);

  for (const platform of platforms) {
    ctx.fillStyle = platform.y >= 460 ? "#80604b" : "#89715c";
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    ctx.fillStyle = "#598b69";
    ctx.fillRect(platform.x, platform.y, platform.width, 9);
    ctx.fillStyle = "rgba(255, 224, 165, 0.18)";
    for (let x = platform.x + 18; x < platform.x + platform.width; x += 45) {
      ctx.fillRect(x, platform.y + 24, 13, 4);
      ctx.fillRect(x + 16, platform.y + 47, 8, 4);
    }
  }

  drawGoal();
  for (const enemy of enemies) {
    if (enemy.alive) drawEnemy(enemy);
  }
  drawPlayer();
  ctx.restore();
}

function drawGoal() {
  const x = WORLD_WIDTH - 155;
  ctx.fillStyle = "#f7e6bf";
  ctx.fillRect(x, 338, 9, 130);
  ctx.fillStyle = "#f18b66";
  ctx.beginPath();
  ctx.moveTo(x + 9, 340);
  ctx.lineTo(x + 75, 360);
  ctx.lineTo(x + 9, 382);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255, 244, 207, 0.16)";
  ctx.beginPath();
  ctx.arc(x + 12, 400, 54 + Math.sin(elapsedTime * 4) * 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayer() {
  if (player.invulnerable > 0 && Math.floor(elapsedTime * 15) % 2 === 0) return;
  const { x, y, width, height, facing } = player;
  ctx.fillStyle = "#26364b";
  ctx.fillRect(x + 4, y + 12, width - 8, height - 12);
  ctx.fillStyle = "#f5bc82";
  ctx.fillRect(x + 8, y + 1, width - 12, 21);
  ctx.fillStyle = "#e67758";
  ctx.fillRect(x + (facing > 0 ? 3 : 13), y + 0, 23, 7);
  ctx.fillStyle = "#26364b";
  ctx.fillRect(x + (facing > 0 ? 23 : 10), y + 9, 4, 4);
  ctx.fillStyle = "#f5bc82";
  ctx.fillRect(x + (facing > 0 ? width - 2 : -2), y + 24, 6, 17);
  ctx.fillStyle = "#e9d7a8";
  ctx.fillRect(x + 4, y + height - 7, 11, 7);
  ctx.fillRect(x + 20, y + height - 7, 11, 7);

  if (player.attackTime > 0) {
    const slashX = facing > 0 ? x + width - 3 : x - 45;
    ctx.fillStyle = "rgba(255, 232, 157, 0.82)";
    ctx.beginPath();
    ctx.ellipse(slashX + 23, y + 28, 27, 12, facing > 0 ? -0.35 : 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff7dc";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(slashX + 23, y + 28, 25, -0.9, 0.8);
    ctx.stroke();
  }
}

function drawEnemy(enemy) {
  ctx.fillStyle = "#a64f4d";
  ctx.fillRect(enemy.x + 2, enemy.y + 7, enemy.width - 4, enemy.height - 7);
  ctx.fillStyle = "#d87864";
  ctx.fillRect(enemy.x, enemy.y + 14, enemy.width, 16);
  ctx.fillStyle = "#f5d4a0";
  ctx.fillRect(enemy.x + (enemy.direction > 0 ? 20 : 8), enemy.y + 15, 4, 5);
  ctx.fillStyle = "#583e50";
  ctx.fillRect(enemy.x + 4, enemy.y + enemy.height - 5, 9, 5);
  ctx.fillRect(enemy.x + 19, enemy.y + enemy.height - 5, 9, 5);
}

function drawHud() {
  ctx.fillStyle = "rgba(25, 38, 52, 0.76)";
  roundRect(ctx, 22, 20, 176, 48, 12);
  ctx.fillStyle = "#fff4d9";
  ctx.font = '500 12px "DM Mono", monospace';
  ctx.fillText("HEALTH", 38, 40);
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = i < player.health ? "#ee8267" : "rgba(255, 255, 255, 0.2)";
    drawHeart(111 + i * 25, 44, 8);
  }

  ctx.fillStyle = "rgba(25, 38, 52, 0.64)";
  roundRect(ctx, WIDTH - 172, 20, 150, 38, 11);
  ctx.fillStyle = "#fff4d9";
  ctx.textAlign = "right";
  ctx.fillText(`${Math.min(100, Math.floor((player.x / (WORLD_WIDTH - 150)) * 100))}%  →`, WIDTH - 38, 44);
  ctx.textAlign = "left";

  if (elapsedTime < 5 && gameState === "playing") {
    ctx.fillStyle = "rgba(25, 38, 52, 0.65)";
    roundRect(ctx, WIDTH / 2 - 160, 20, 320, 38, 11);
    ctx.fillStyle = "#fff4d9";
    ctx.textAlign = "center";
    ctx.fillText("A / D 移動　SPACE ジャンプ　J 攻撃", WIDTH / 2, 44);
    ctx.textAlign = "left";
  }
}

function drawHeart(x, y, size) {
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.85);
  ctx.bezierCurveTo(x - size * 1.6, y - size * 0.2, x - size * 0.8, y - size, x, y - size * 0.35);
  ctx.bezierCurveTo(x + size * 0.8, y - size, x + size * 1.6, y - size * 0.2, x, y + size * 0.85);
  ctx.fill();
}

function drawOverlay() {
  if (gameState === "playing") return;
  ctx.fillStyle = "rgba(19, 29, 41, 0.72)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff4d9";
  ctx.font = '700 46px "Space Grotesk", sans-serif';
  ctx.fillText(gameState === "won" ? "STAGE CLEAR!" : "GAME OVER", WIDTH / 2, HEIGHT / 2 - 12);
  ctx.fillStyle = "#d9dfdf";
  ctx.font = '500 16px "Noto Sans JP", sans-serif';
  ctx.fillText(gameState === "won" ? "空の遺跡を突破した！" : "もう一度チャレンジしよう", WIDTH / 2, HEIGHT / 2 + 28);
  ctx.font = '500 12px "DM Mono", monospace';
  ctx.fillText("R キーでリスタート", WIDTH / 2, HEIGHT / 2 + 65);
  ctx.textAlign = "left";
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fill();
}

function render() {
  drawBackground();
  drawWorld();
  drawHud();
  drawOverlay();
}

function frame(timestamp) {
  const delta = Math.min((timestamp - previousTime) / 1000 || 0, 1 / 30);
  previousTime = timestamp;
  update(delta);
  render();
  requestAnimationFrame(frame);
}

window.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(event.code)) event.preventDefault();
  keys.add(event.code);
});

window.addEventListener("keyup", (event) => keys.delete(event.code));
window.addEventListener("blur", () => keys.clear());

document.querySelectorAll("[data-control]").forEach((button) => {
  const control = button.dataset.control;
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    touchControls.add(control);
    button.setPointerCapture(event.pointerId);
  });
  const release = () => touchControls.delete(control);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
});

resetGame();
requestAnimationFrame(frame);
