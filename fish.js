// Fish species, procedural visual rendering, swimming physics and AI

const FISH_TIERS = [
  {
    tier: 0,
    name: "磷虾/发光微鱼",
    minRadius: 10,
    maxRadius: 15,
    speed: 2.2,
    baseExp: 10,
    scoreVal: 20,
    bodyColor: "#00f0ff",
    bellyColor: "#a3ffff",
    finColor: "rgba(0, 240, 255, 0.7)",
    stripeColor: null,
    pattern: "glow_dots",
    tailWagFreq: 8
  },
  {
    tier: 1,
    name: "热带小丑鱼",
    minRadius: 16,
    maxRadius: 23,
    speed: 2.0,
    baseExp: 22,
    scoreVal: 50,
    bodyColor: "#ff6200",
    bellyColor: "#ffa259",
    finColor: "#ff4400",
    stripeColor: "#ffffff",
    pattern: "stripes",
    tailWagFreq: 7
  },
  {
    tier: 2,
    name: "黄金雀鲷",
    minRadius: 24,
    maxRadius: 33,
    speed: 1.8,
    baseExp: 45,
    scoreVal: 120,
    bodyColor: "#ffd000",
    bellyColor: "#fff494",
    finColor: "#ff9d00",
    stripeColor: "#00d2ff",
    pattern: "accent_fin",
    tailWagFreq: 6.5
  },
  {
    tier: 3,
    name: "皇家蓝唐王鱼",
    minRadius: 34,
    maxRadius: 46,
    speed: 1.65,
    baseExp: 90,
    scoreVal: 260,
    bodyColor: "#0849db",
    bellyColor: "#3a76ff",
    finColor: "#ffe600",
    stripeColor: "#001a61",
    pattern: "crescent_tail",
    tailWagFreq: 5.5
  },
  {
    tier: 4,
    name: "深海剑鱼/金枪鱼",
    minRadius: 48,
    maxRadius: 65,
    speed: 1.5,
    baseExp: 180,
    scoreVal: 600,
    bodyColor: "#009aa6",
    bellyColor: "#b2fbff",
    finColor: "#00626b",
    stripeColor: "#003c42",
    pattern: "torpedo_scales",
    tailWagFreq: 5
  },
  {
    tier: 5,
    name: "凶猛虎鲨",
    minRadius: 68,
    maxRadius: 92,
    speed: 1.35,
    baseExp: 380,
    scoreVal: 1500,
    bodyColor: "#47596b",
    bellyColor: "#a0b4c7",
    finColor: "#2b3742",
    stripeColor: "#222c36",
    pattern: "shark_dorsal",
    tailWagFreq: 4.2
  },
  {
    tier: 6,
    name: "深渊巨齿鲸",
    minRadius: 95,
    maxRadius: 130,
    speed: 1.15,
    baseExp: 800,
    scoreVal: 3500,
    bodyColor: "#2c114d",
    bellyColor: "#7539bf",
    finColor: "#a238ff",
    stripeColor: "#00ffff",
    pattern: "abyssal_glow",
    tailWagFreq: 3.5
  }
];

class Fish {
  constructor(x, y, radius, tierConfig, isPlayer = false) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.tierConfig = tierConfig;
    this.isPlayer = isPlayer;

    // Movement & Orientation
    this.vx = 0;
    this.vy = 0;

    if (!isPlayer) {
      // 小型鱼速度再提升 10% (从 2.38 提升至 2.618)，大型鱼维持 0.72
      const sizeProgress = Math.max(0, Math.min(1, (this.radius - 10) / 115));
      this.speed = Math.max(0.72, 2.618 - sizeProgress * 1.898);

      // 小体型的鱼上下摆动幅度减少 50% (乘以 0.5)，大鱼摆动更小
      this.wobbleFactor = Math.max(0.015, Math.pow(16 / Math.max(16, this.radius), 2.0) * 0.5);
    } else {
      // 玩家基础速度再提升 10% (从 3.68 提升至 4.05)，且恒定不变
      this.speed = 4.05;
      this.wobbleFactor = 1.0;
    }

    this.facing = Math.random() > 0.5 ? 1 : -1; // 1 = right, -1 = left
    this.scaleX = this.facing; // for smooth flip animation
    this.angle = 0; // tilt when swimming up/down
    this.targetAngle = 0;

    // Swimming animation
    this.swimPhase = Math.random() * Math.PI * 2;
    this.wagFreq = tierConfig.tailWagFreq;
    this.mouthOpen = 0; // 0 to 1

    // AI behavior parameters
    this.changeDirectionTimer = Math.random() * 120 + 60;
    this.targetVx = this.speed * this.facing;
    this.targetVy = (Math.random() - 0.5) * (0.4 * this.wobbleFactor);

    // Visual traits
    this.growthAnimation = 1.0; // scale punch on eating
  }

  update(worldWidth, worldHeight, player = null, allFishes = []) {
    this.swimPhase += 0.08 * (Math.abs(this.vx) + 1);

    if (!this.isPlayer) {
      this.updateAI(worldWidth, worldHeight, player, allFishes);
    }

    // Apply movement
    this.x += this.vx;
    this.y += this.vy;

    // Update facing smoothly
    if (Math.abs(this.vx) > 0.15) {
      this.facing = this.vx > 0 ? 1 : -1;
    }
    this.scaleX += (this.facing - this.scaleX) * 0.15;

    // Calculate vertical tilt angle (小鱼上下摆动倾角减少 50%)
    const tiltDamping = this.isPlayer ? 1.0 : this.wobbleFactor;
    const targetTilt = Math.atan2(this.vy, Math.abs(this.vx) || 1) * 0.2 * tiltDamping;
    this.angle += (targetTilt - this.angle) * 0.1;

    // Decay growth punch
    if (this.growthAnimation > 1.0) {
      this.growthAnimation += (1.0 - this.growthAnimation) * 0.1;
    }

    // Mouth animation decay
    if (this.mouthOpen > 0.05) {
      this.mouthOpen *= 0.85;
    } else {
      this.mouthOpen = 0;
    }
  }

  updateAI(worldWidth, worldHeight) {
    this.changeDirectionTimer--;

    // 小体型鱼上下摆动幅度整体降低 50%，游动轨迹更加平缓自然
    if (this.changeDirectionTimer <= 0) {
      this.changeDirectionTimer = Math.random() * 120 + 60;
      this.targetVy = (Math.random() - 0.5) * (0.3 * this.wobbleFactor);
    }

    // 稳定水平横穿
    this.targetVx = this.facing * this.speed;
    // 正弦波垂直摆动幅度减少 50%
    this.targetVy += Math.sin(this.swimPhase * 0.3) * (0.07 * this.wobbleFactor);

    // 平滑速度过渡
    this.vx += (this.targetVx - this.vx) * 0.05;
    this.vy += (this.targetVy - this.vy) * 0.05;

    // 屏幕上下边缘回弹
    const pad = this.radius * 1.5;
    if (this.y < pad) {
      this.vy += 0.3;
    } else if (this.y > worldHeight - pad) {
      this.vy -= 0.3;
    }
  }

  render(ctx, playerRef = null) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Apply squash/stretch & horizontal facing
    const sX = this.scaleX * this.growthAnimation;
    const sY = (2 - Math.abs(this.scaleX)) * this.growthAnimation;
    ctx.scale(sX, sY);
    ctx.rotate(this.angle * (this.facing > 0 ? 1 : -1));

    const r = this.radius;
    const cfg = this.tierConfig;
    const wag = Math.sin(this.swimPhase) * (r * 0.22);

    // Indicator aura for non-player fish
    if (!this.isPlayer && playerRef) {
      const isSmaller = playerRef.radius > this.radius * 1.06;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.25, 0, Math.PI * 2);
      ctx.lineWidth = isSmaller ? 1.5 : 2.5;
      ctx.strokeStyle = isSmaller ? "rgba(0, 255, 170, 0.4)" : "rgba(255, 45, 85, 0.7)";
      if (!isSmaller) {
        ctx.shadowColor = "rgba(255, 45, 85, 0.8)";
        ctx.shadowBlur = 10;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else if (this.isPlayer) {
      // Golden player indicator aura
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.3, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(0, 229, 255, 0.6)";
      ctx.shadowColor = "rgba(0, 229, 255, 0.8)";
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // 1. Tail Fin (animated)
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, 0);
    ctx.quadraticCurveTo(-r * 1.3, wag * 0.7, -r * 1.7, -r * 0.75 + wag);
    ctx.quadraticCurveTo(-r * 1.35, wag, -r * 1.7, r * 0.75 + wag);
    ctx.quadraticCurveTo(-r * 1.3, wag * 0.7, -r * 0.9, 0);
    ctx.fillStyle = cfg.finColor;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // 2. Dorsal Fin (Top)
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -r * 0.55);
    ctx.quadraticCurveTo(0, -r * 1.05 + wag * 0.2, r * 0.4, -r * 0.4);
    ctx.lineTo(r * 0.1, -r * 0.45);
    ctx.fillStyle = cfg.finColor;
    ctx.fill();

    // 3. Ventral Fin (Bottom)
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, r * 0.5);
    ctx.quadraticCurveTo(0, r * 0.9, r * 0.3, r * 0.45);
    ctx.fillStyle = cfg.finColor;
    ctx.fill();

    // 4. Main Body (Smooth aerodynamic teardrop)
    ctx.beginPath();
    // Mouth coordinates
    const mouthGap = this.mouthOpen * (r * 0.35);
    ctx.moveTo(r * 1.15, -mouthGap); // Upper lip
    // Upper back
    ctx.bezierCurveTo(r * 0.7, -r * 0.65, -r * 0.4, -r * 0.6, -r * 0.95, 0);
    // Lower belly
    ctx.bezierCurveTo(-r * 0.4, r * 0.65, r * 0.7, r * 0.65, r * 1.15, mouthGap); // Lower lip
    ctx.closePath();

    // Body Gradient
    const bodyGrad = ctx.createLinearGradient(0, -r * 0.6, 0, r * 0.6);
    bodyGrad.addColorStop(0, cfg.bodyColor);
    bodyGrad.addColorStop(0.7, cfg.bellyColor);
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = Math.max(1, r * 0.04);
    ctx.stroke();

    // 5. Distinct Species Patterns & Stripes
    if (cfg.pattern === "stripes" && cfg.stripeColor) {
      ctx.save();
      ctx.clip(); // clip within body
      ctx.fillStyle = cfg.stripeColor;
      // Stripe 1
      ctx.beginPath();
      ctx.ellipse(r * 0.3, 0, r * 0.12, r * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
      // Stripe 2
      ctx.beginPath();
      ctx.ellipse(-r * 0.2, 0, r * 0.1, r * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (cfg.pattern === "shark_dorsal") {
      ctx.save();
      ctx.clip();
      ctx.fillStyle = cfg.stripeColor;
      for (let i = -3; i <= 2; i++) {
        ctx.fillRect(r * i * 0.25, -r * 0.6, r * 0.08, r * 0.7);
      }
      ctx.restore();
    } else if (cfg.pattern === "abyssal_glow") {
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = "#00ffff";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "#00ffff";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(-r * 0.7, 0);
      ctx.lineTo(0, -r * 0.15);
      ctx.lineTo(r * 0.6, 0);
      ctx.stroke();
      ctx.restore();
    }

    // 6. Animated Pectoral Fin (Side fluttering)
    const finFlutter = Math.sin(this.swimPhase * 1.5) * 0.35;
    ctx.save();
    ctx.translate(r * 0.1, r * 0.1);
    ctx.rotate(finFlutter);
    ctx.beginPath();
    ctx.ellipse(-r * 0.1, r * 0.1, r * 0.35, r * 0.18, Math.PI / 4, 0, Math.PI * 2);
    ctx.fillStyle = cfg.finColor;
    ctx.fill();
    ctx.restore();

    // 7. Eye & Pupil
    const eyeX = r * 0.65;
    const eyeY = -r * 0.18;
    const eyeRadius = Math.max(3, r * 0.18);

    // Eye Sclera (White)
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, eyeRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Pupil (Black with look direction)
    const lookOffset = eyeRadius * 0.35;
    ctx.beginPath();
    ctx.arc(eyeX + lookOffset, eyeY, eyeRadius * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = "#0d1b2a";
    ctx.fill();

    // Pupil Specular Highlight
    ctx.beginPath();
    ctx.arc(eyeX + lookOffset - eyeRadius * 0.15, eyeY - eyeRadius * 0.2, eyeRadius * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    ctx.restore();
  }

  // Calculate size in virtual cm for HUD
  getSizeInCm() {
    return Math.round(this.radius * 1.6);
  }
}

// Player Fish subclass with specialized controls & sprint
class PlayerFish extends Fish {
  constructor(x, y) {
    super(x, y, 18, FISH_TIERS[0], true);
    this.currentTierIndex = 0;
    this.exp = 0;
    this.expToNext = 100;
    this.isDead = false;
    this.stamina = 100;
    this.isDashing = false;
    this.score = 0;
    this.fishEaten = 0;
  }

  feed(prey) {
    this.score += prey.tierConfig.scoreVal;
    this.fishEaten++;
    this.growthAnimation = 1.25; // pop animation
    this.mouthOpen = 1.0;

    // Gain EXP and grow
    const expGain = prey.tierConfig.baseExp;
    this.exp += expGain;
    this.radius = Math.min(145, this.radius + 0.45); // smooth physical growth

    let evolved = false;
    if (this.exp >= this.expToNext && this.currentTierIndex < FISH_TIERS.length - 1) {
      this.evolve();
      evolved = true;
    }

    return { expGain, evolved };
  }

  evolve() {
    this.currentTierIndex++;
    this.tierConfig = FISH_TIERS[this.currentTierIndex];
    this.radius = Math.max(this.radius, this.tierConfig.minRadius);
    this.exp = 0;
    this.expToNext = Math.round(this.expToNext * 1.8);
    // 玩家速度始终保持再次提升后的恒定速度 (4.05)，不随体型与进阶衰减
    this.speed = 4.05;
  }

  control(targetX, targetY, isSprintRequested) {
    if (this.isDead) return;

    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.hypot(dx, dy);

    // Sprint mechanics
    let currentSpeed = this.speed;
    if (isSprintRequested && this.stamina > 10) {
      this.isDashing = true;
      currentSpeed *= 1.85;
      this.stamina = Math.max(0, this.stamina - 1.2);
    } else {
      this.isDashing = false;
      this.stamina = Math.min(100, this.stamina + 0.4);
    }

    if (dist > 5) {
      const moveSpeed = Math.min(currentSpeed, dist * 0.12);
      this.vx += ((dx / dist) * moveSpeed - this.vx) * 0.15;
      this.vy += ((dy / dist) * moveSpeed - this.vy) * 0.15;
    } else {
      this.vx *= 0.85;
      this.vy *= 0.85;
    }
  }

  // 移动端轮盘移动控制：通过轮盘方向与力度直接控制移动方向
  controlDirection(dirX, dirY, isSprintRequested) {
    if (this.isDead) return;

    let currentSpeed = this.speed;
    if (isSprintRequested && this.stamina > 10) {
      this.isDashing = true;
      currentSpeed *= 1.85;
      this.stamina = Math.max(0, this.stamina - 1.2);
    } else {
      this.isDashing = false;
      this.stamina = Math.min(100, this.stamina + 0.4);
    }

    const len = Math.hypot(dirX, dirY);
    if (len > 0.06) {
      // 按照轮盘向量方向施加速度
      const targetVx = (dirX / len) * currentSpeed * Math.min(1, len);
      const targetVy = (dirY / len) * currentSpeed * Math.min(1, len);
      this.vx += (targetVx - this.vx) * 0.18;
      this.vy += (targetVy - this.vy) * 0.18;
    } else {
      // 松开轮盘时自然减速平稳停下
      this.vx *= 0.86;
      this.vy *= 0.86;
    }
  }
}
