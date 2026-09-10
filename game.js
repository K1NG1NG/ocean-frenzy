// Ocean Frenzy Game Engine

class OceanGame {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.dpr = window.devicePixelRatio || 1;

    // Game state
    this.state = "START"; // START, PLAYING, PAUSED, GAMEOVER
    this.startTime = 0;
    this.elapsedTime = 0;

    // Entities
    this.player = null;
    this.fishes = [];
    this.baseMaxFishes = 12; // 游戏基础鱼量，视野清爽不过密
    this.particles = [];
    this.bubbles = [];
    this.floatingTexts = [];
    this.kelps = [];
    this.lightRays = [];

    // Controls
    this.mouse = { x: 0, y: 0, isDown: false };
    this.keys = {};
    this.useKeyboard = false;
    this.keyPos = { x: 0, y: 0 };

    // DOM Elements
    this.dom = {
      startOverlay: document.getElementById("startOverlay"),
      pauseOverlay: document.getElementById("pauseOverlay"),
      gameOverOverlay: document.getElementById("gameOverOverlay"),
      btnStart: document.getElementById("btnStart"),
      btnPause: document.getElementById("btnPause"),
      btnResume: document.getElementById("btnResume"),
      btnRestart: document.getElementById("btnRestart"),
      btnRestartFromPause: document.getElementById("btnRestartFromPause"),
      btnMute: document.getElementById("btnMute"),
      btnFullscreen: document.getElementById("btnFullscreen"),
      btnSprintMobile: document.getElementById("btnSprintMobile"),
      joystickZone: document.getElementById("joystickZone"),
      joystickBase: document.getElementById("joystickBase"),
      joystickThumb: document.getElementById("joystickThumb"),
      scoreVal: document.getElementById("scoreVal"),
      sizeVal: document.getElementById("sizeVal"),
      playerStage: document.getElementById("playerStage"),
      expText: document.getElementById("expText"),
      expBar: document.getElementById("expBar"),
      dangerBanner: document.getElementById("dangerBanner"),
      evolutionToast: document.getElementById("evolutionToast"),
      evoTitle: document.getElementById("evoTitle"),
      finalScore: document.getElementById("finalScore"),
      finalFishEaten: document.getElementById("finalFishEaten"),
      finalSize: document.getElementById("finalSize"),
      finalTime: document.getElementById("finalTime"),
      deathReason: document.getElementById("deathReason")
    };

    this.initCanvas();
    this.initEnvironment();
    this.bindEvents();

    // Start render loop
    requestAnimationFrame((ts) => this.loop(ts));
  }

  initCanvas() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);

    this.mouse.x = this.width / 2;
    this.mouse.y = this.height / 2;
    this.keyPos.x = this.width / 2;
    this.keyPos.y = this.height / 2;
  }

  initEnvironment() {
    // 1. Seaweed/Kelp at seabed
    this.kelps = [];
    const count = Math.ceil(this.width / 45);
    for (let i = 0; i < count; i++) {
      this.kelps.push({
        x: i * 45 + Math.random() * 20,
        height: Math.random() * 120 + 100,
        swayOffset: Math.random() * Math.PI * 2,
        color: `hsl(${145 + Math.random() * 25}, 65%, ${15 + Math.random() * 15}%)`,
        width: Math.random() * 6 + 10
      });
    }

    // 2. Ambient Bubbles
    this.bubbles = [];
    for (let i = 0; i < 40; i++) {
      this.bubbles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: Math.random() * 4 + 1.5,
        speed: Math.random() * 1.5 + 0.6,
        wobble: Math.random() * Math.PI * 2,
        alpha: Math.random() * 0.4 + 0.2
      });
    }

    // 3. Sun God Rays
    this.lightRays = [];
    for (let i = 0; i < 6; i++) {
      this.lightRays.push({
        x: (i + 0.5) * (this.width / 6) + (Math.random() - 0.5) * 80,
        width: Math.random() * 120 + 80,
        speed: Math.random() * 0.005 + 0.003,
        phase: Math.random() * Math.PI * 2,
        maxAlpha: Math.random() * 0.08 + 0.04
      });
    }
  }

  bindEvents() {
    window.addEventListener("resize", () => {
      this.initCanvas();
      this.initEnvironment();
    });

    window.addEventListener("orientationchange", () => {
      setTimeout(() => {
        this.initCanvas();
        this.initEnvironment();
      }, 200);
    });

    // Pointer events (PC & Mobile Pointer)
    window.addEventListener("pointermove", (e) => {
      if (e.pointerType === "mouse") {
        this.useKeyboard = false;
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
      }
    });

    window.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button") || e.target.closest(".modal-content")) return;
      if (e.pointerType === "mouse") {
        this.mouse.isDown = true;
      }
    });

    window.addEventListener("pointerup", () => {
      this.mouse.isDown = false;
    });

    // Mobile Virtual Joystick & Touch Controls
    this.isMobileSprint = false;
    this.doubleTapSprintTimer = 0;
    this.joystick = { active: false, touchId: null, dirX: 0, dirY: 0 };
    this.isUsingJoystick = false;

    const jZone = this.dom.joystickZone;
    const jBase = this.dom.joystickBase;
    const jThumb = this.dom.joystickThumb;
    const maxRadius = 42; // thumb max offset

    const updateJoystickPos = (clientX, clientY) => {
      const rect = jBase.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = clientX - centerX;
      const dy = clientY - centerY;
      const dist = Math.hypot(dx, dy);

      const clampedDist = Math.min(maxRadius, dist);
      const angle = Math.atan2(dy, dx);

      const thumbX = Math.cos(angle) * clampedDist;
      const thumbY = Math.sin(angle) * clampedDist;

      jThumb.style.transform = `translate(${thumbX}px, ${thumbY}px)`;

      // 归一化方向向量 (-1 到 1)
      this.joystick.dirX = dist > 4 ? (thumbX / maxRadius) : 0;
      this.joystick.dirY = dist > 4 ? (thumbY / maxRadius) : 0;
      this.isUsingJoystick = true;
      this.useKeyboard = false;
    };

    const resetJoystick = () => {
      jThumb.style.transform = `translate(0px, 0px)`;
      this.joystick.active = false;
      this.joystick.touchId = null;
      this.joystick.dirX = 0;
      this.joystick.dirY = 0;
      jZone.classList.remove("active");
    };

    // 触摸轮盘事件绑定
    if (jZone) {
      jZone.addEventListener("touchstart", (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.soundManager.init();
        const touch = e.changedTouches[0];
        this.joystick.active = true;
        this.joystick.touchId = touch.identifier;
        jZone.classList.add("active");
        updateJoystickPos(touch.clientX, touch.clientY);
      }, { passive: false });

      // 电脑鼠标支持拖动轮盘测试
      let mouseDrag = false;
      jZone.addEventListener("mousedown", (e) => {
        mouseDrag = true;
        jZone.classList.add("active");
        updateJoystickPos(e.clientX, e.clientY);
      });
      window.addEventListener("mousemove", (e) => {
        if (mouseDrag) updateJoystickPos(e.clientX, e.clientY);
      });
      window.addEventListener("mouseup", () => {
        if (mouseDrag) {
          mouseDrag = false;
          resetJoystick();
        }
      });
    }

    // 全局触摸移动跟踪（处理轮盘滑动）
    window.addEventListener("touchmove", (e) => {
      if (this.joystick.active) {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === this.joystick.touchId) {
            e.preventDefault();
            updateJoystickPos(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
            break;
          }
        }
      }
    }, { passive: false });

    const handleTouchEnd = (e) => {
      if (this.joystick.active) {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === this.joystick.touchId) {
            resetJoystick();
            break;
          }
        }
      }
    };

    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchEnd);

    // 全局双击冲刺检测 (屏幕任意非按钮区域双击触发短冲刺)
    let lastTapTime = 0;
    window.addEventListener("touchstart", (e) => {
      window.soundManager.init();
      if (e.target.closest("button") || e.target.closest(".joystick-zone") || e.target.closest(".modal-content")) return;
      const now = Date.now();
      if (now - lastTapTime < 320) {
        this.doubleTapSprintTimer = 0.6;
      }
      lastTapTime = now;
    }, { passive: true });

    // Mobile Virtual Sprint Button
    if (this.dom.btnSprintMobile) {
      const startSprint = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.isMobileSprint = true;
        this.dom.btnSprintMobile.classList.add("active");
      };
      const stopSprint = (e) => {
        e.preventDefault();
        this.isMobileSprint = false;
        this.dom.btnSprintMobile.classList.remove("active");
      };

      this.dom.btnSprintMobile.addEventListener("pointerdown", startSprint);
      this.dom.btnSprintMobile.addEventListener("pointerup", stopSprint);
      this.dom.btnSprintMobile.addEventListener("pointercancel", stopSprint);
      this.dom.btnSprintMobile.addEventListener("touchstart", startSprint, { passive: false });
      this.dom.btnSprintMobile.addEventListener("touchend", stopSprint, { passive: false });
    }

    // Fullscreen Toggle Button
    if (this.dom.btnFullscreen) {
      this.dom.btnFullscreen.addEventListener("click", () => {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
          const el = document.documentElement;
          if (el.requestFullscreen) {
            el.requestFullscreen().catch(() => {});
          } else if (el.webkitRequestFullscreen) {
            el.webkitRequestFullscreen();
          }
          this.dom.btnFullscreen.textContent = "✖";
        } else {
          if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
          }
          this.dom.btnFullscreen.textContent = "⛶";
        }
      });

      document.addEventListener("fullscreenchange", () => {
        this.dom.btnFullscreen.textContent = document.fullscreenElement ? "✖" : "⛶";
      });
    }

    // Keyboard events
    window.addEventListener("keydown", (e) => {
      this.keys[e.code] = true;
      if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        this.useKeyboard = true;
      }
      if (e.code === "KeyP" || e.code === "Escape") {
        this.togglePause();
      }
      if (e.code === "KeyM") {
        this.toggleMute();
      }
    });

    window.addEventListener("keyup", (e) => {
      this.keys[e.code] = false;
    });

    // Buttons
    this.dom.btnStart.addEventListener("click", () => this.startGame());
    this.dom.btnPause.addEventListener("click", () => this.togglePause());
    this.dom.btnResume.addEventListener("click", () => this.togglePause());
    this.dom.btnRestart.addEventListener("click", () => this.startGame());
    this.dom.btnRestartFromPause.addEventListener("click", () => this.startGame());
    this.dom.btnMute.addEventListener("click", () => this.toggleMute());
  }

  toggleMute() {
    const isMuted = window.soundManager.toggleMute();
    this.dom.btnMute.textContent = isMuted ? "🔇" : "🔊";
  }

  startGame() {
    window.soundManager.init();
    this.state = "PLAYING";
    this.startTime = Date.now();
    this.elapsedTime = 0;

    // Reset Player
    this.player = new PlayerFish(this.width / 2, this.height / 2);
    this.keyPos.x = this.player.x;
    this.keyPos.y = this.player.y;

    // Clear fishes & particles
    this.fishes = [];
    this.particles = [];
    this.floatingTexts = [];

    // Pre-populate screen with safe initial prey (开局生成少量鱼，不多于屏幕大小的10%)
    this.spawnInvulnerableTimer = 1.5; // 1.5s grace period
    for (let i = 0; i < 6; i++) {
      this.spawnFish(true);
    }

    // Hide modals
    this.dom.startOverlay.classList.add("hidden");
    this.dom.pauseOverlay.classList.add("hidden");
    this.dom.gameOverOverlay.classList.add("hidden");
    this.dom.dangerBanner.classList.add("hidden");

    this.updateHUD();
  }

  togglePause() {
    if (this.state === "PLAYING") {
      this.state = "PAUSED";
      this.dom.pauseOverlay.classList.remove("hidden");
    } else if (this.state === "PAUSED") {
      this.state = "PLAYING";
      this.dom.pauseOverlay.classList.add("hidden");
    }
  }

  gameOver(predator) {
    if (this.state !== "PLAYING") return;
    this.state = "GAMEOVER";
    this.player.isDead = true;

    // Crunch & gameover sound
    window.soundManager.playGameOver();

    // Death bubble explosion
    this.createDeathExplosion(this.player.x, this.player.y, this.player.radius);

    const minutes = Math.floor(this.elapsedTime / 60);
    const seconds = this.elapsedTime % 60;
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    this.dom.finalScore.textContent = this.player.score;
    this.dom.finalFishEaten.textContent = this.player.fishEaten;
    this.dom.finalSize.textContent = `${this.player.getSizeInCm()} cm`;
    this.dom.finalTime.textContent = timeStr;
    this.dom.deathReason.textContent = `你被一条身长 ${predator.getSizeInCm()}cm 的 ${predator.tierConfig.name} 一口吞食了！`;

    setTimeout(() => {
      this.dom.gameOverOverlay.classList.remove("hidden");
    }, 900);
  }

  spawnFish(initialSpawn = false, forceEdible = false) {
    const playerTier = this.player ? this.player.currentTierIndex : 0;
    const pRadius = this.player ? this.player.radius : 18;

    // 规则 1：游玩过程中不会出现高于自身两级的鱼类 (最高允许级别严格为 playerTier + 1)
    const maxAllowedTier = Math.min(FISH_TIERS.length - 1, playerTier + 1);

    // 规则 2：无论玩家当前是多少等级，屏幕中一定要出现玩家能捕食的鱼类，且数量不能少于 25%
    const totalCount = this.fishes.length;
    const edibleCount = this.fishes.filter(f => f.radius < pRadius * 0.96).length;
    const edibleRatio = totalCount > 0 ? (edibleCount / totalCount) : 0;

    // 若强制生成可食用鱼、场上没有可捕食鱼或可捕食鱼比例低于 25%，必出可捕食鱼
    let isSmall;
    if (initialSpawn || forceEdible || edibleCount === 0 || edibleRatio < 0.25) {
      isSmall = true;
    } else {
      isSmall = Math.random() < 0.70;
    }

    let tierIndex = 0;
    if (initialSpawn) {
      // 刚开局屏幕中的少量初始鱼为最安全的起始鱼
      tierIndex = 0;
    } else if (isSmall) {
      // 无论玩家是多少级，必选玩家当前能够捕食的鱼种 (等级 <= 当前玩家等级，且基准尺寸小于玩家)
      const smallerTiers = FISH_TIERS.filter(t => t.tier <= playerTier && t.minRadius < pRadius * 0.96);
      if (smallerTiers.length > 0) {
        tierIndex = smallerTiers[Math.floor(Math.random() * smallerTiers.length)].tier;
      } else {
        tierIndex = 0;
      }
    } else {
      // 大体型鱼：必须大于玩家当前体型，且严格不会出现高于自身两级的鱼 (最高为 playerTier + 1)
      const largerTiers = FISH_TIERS.filter(t => t.tier <= maxAllowedTier && (t.tier > playerTier || t.maxRadius > pRadius * 1.05));
      if (largerTiers.length > 0) {
        tierIndex = largerTiers[Math.floor(Math.random() * largerTiers.length)].tier;
      } else {
        tierIndex = maxAllowedTier;
      }
    }

    // 双重安全限制：严格限制在最高允许级别内
    tierIndex = Math.min(maxAllowedTier, tierIndex);

    const tierCfg = FISH_TIERS[tierIndex];
    let radius = tierCfg.minRadius + Math.random() * (tierCfg.maxRadius - tierCfg.minRadius);

    // 确保可食用小鱼严格小于玩家当前体型（满足碰触即捕食），大体型鱼严格大于玩家
    if (isSmall) {
      radius = Math.max(10, Math.min(tierCfg.maxRadius, pRadius * (0.65 + Math.random() * 0.28)));
    } else if (!isSmall && !initialSpawn) {
      if (radius <= pRadius) {
        radius = pRadius * (1.12 + Math.random() * 0.35);
      }
      radius = Math.min(radius, tierCfg.maxRadius);
    }

    let x, y, facing;
    if (initialSpawn) {
      // 初始分散在两侧，避开玩家中心位置
      x = Math.random() > 0.5 ? Math.random() * (this.width * 0.35) : this.width * 0.65 + Math.random() * (this.width * 0.35);
      y = Math.random() * (this.height - 120) + 60;
      facing = Math.random() > 0.5 ? 1 : -1;
    } else {
      // 屏幕边缘生成
      const fromLeft = Math.random() > 0.5;
      x = fromLeft ? -radius * 2.5 : this.width + radius * 2.5;
      y = Math.random() * (this.height - 120) + 60;
      facing = fromLeft ? 1 : -1;
    }

    const fish = new Fish(x, y, radius, tierCfg);
    fish.facing = facing;
    fish.scaleX = facing;
    fish.targetVx = fish.speed * facing;
    fish.vx = fish.targetVx;
    this.fishes.push(fish);
  }

  createEatEffect(x, y, count = 8, color = "#00ffff") {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * 4 + 1.5;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 1,
        radius: Math.random() * 3.5 + 1.5,
        alpha: 1.0,
        color: color,
        life: 0,
        maxLife: Math.random() * 25 + 15
      });
    }
  }

  createDeathExplosion(x, y, radius) {
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * 6 + 2;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        radius: Math.random() * 5 + 2,
        alpha: 1.0,
        color: Math.random() > 0.4 ? "#ff3366" : "#ffffff",
        life: 0,
        maxLife: 45
      });
    }
  }

  addFloatingText(text, x, y, color = "#00ffc2") {
    this.floatingTexts.push({
      text,
      x,
      y,
      vy: -1.2,
      alpha: 1.0,
      color,
      life: 0,
      maxLife: 40
    });
  }

  showEvolutionNotice(tierName) {
    this.dom.evoTitle.textContent = `进化成为：${tierName}`;
    this.dom.evolutionToast.classList.remove("hidden");
    window.soundManager.playLevelUp();

    clearTimeout(this.evoTimer);
    this.evoTimer = setTimeout(() => {
      this.dom.evolutionToast.classList.add("hidden");
    }, 2800);
  }

  updateHUD() {
    if (!this.player) return;
    this.dom.scoreVal.textContent = this.player.score;
    this.dom.sizeVal.textContent = `${this.player.getSizeInCm()} cm`;
    this.dom.playerStage.textContent = `${this.player.tierConfig.name} (Lv.${this.player.currentTierIndex + 1})`;

    const progressPct = Math.min(100, Math.round((this.player.exp / this.player.expToNext) * 100));
    this.dom.expBar.style.width = `${progressPct}%`;
    this.dom.expText.textContent = `${this.player.exp} / ${this.player.expToNext}`;
  }

  update() {
    if (this.state !== "PLAYING") return;

    // Elapsed time calculation
    this.elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);
    if (this.spawnInvulnerableTimer > 0) {
      this.spawnInvulnerableTimer -= 0.016;
    }
    if (this.doubleTapSprintTimer > 0) {
      this.doubleTapSprintTimer -= 0.016;
    }

    // Input sprint handling (Mouse, Keyboard, Mobile Button, Double-tap)
    let sprint = this.mouse.isDown || this.keys["Space"] || this.isMobileSprint || (this.doubleTapSprintTimer > 0);

    if (this.isUsingJoystick) {
      // 移动端轮盘方向控制：使用轮盘推力和方向直接控制游动，不移向屏幕触碰点
      this.player.controlDirection(this.joystick.dirX, this.joystick.dirY, sprint);
    } else {
      // PC 鼠标 / 键盘移动
      let targetX = this.mouse.x;
      let targetY = this.mouse.y;

      if (this.useKeyboard) {
        const keySpeed = 8.25;
        if (this.keys["KeyW"] || this.keys["ArrowUp"]) this.keyPos.y -= keySpeed;
        if (this.keys["KeyS"] || this.keys["ArrowDown"]) this.keyPos.y += keySpeed;
        if (this.keys["KeyA"] || this.keys["ArrowLeft"]) this.keyPos.x -= keySpeed;
        if (this.keys["KeyD"] || this.keys["ArrowRight"]) this.keyPos.x += keySpeed;

        this.keyPos.x = Math.max(30, Math.min(this.width - 30, this.keyPos.x));
        this.keyPos.y = Math.max(30, Math.min(this.height - 30, this.keyPos.y));
        targetX = this.keyPos.x;
        targetY = this.keyPos.y;
      }

      this.player.control(targetX, targetY, sprint);
    }

    this.player.update(this.width, this.height);

    // Sprint bubble trail
    if (this.player.isDashing && Math.random() < 0.6) {
      window.soundManager.playDash();
      this.createEatEffect(this.player.x - this.player.facing * this.player.radius, this.player.y, 2, "rgba(255,255,255,0.6)");
    }

    // Keep player in bounds
    this.player.x = Math.max(this.player.radius, Math.min(this.width - this.player.radius, this.player.x));
    this.player.y = Math.max(this.player.radius, Math.min(this.height - this.player.radius, this.player.y));

    // Check danger predators nearby for UI warning
    let giantThreatNearby = false;
    for (let f of this.fishes) {
      if (f.radius > this.player.radius * 1.6) {
        const d = Math.hypot(f.x - this.player.x, f.y - this.player.y);
        if (d < 380) {
          giantThreatNearby = true;
          break;
        }
      }
    }
    if (giantThreatNearby) {
      this.dom.dangerBanner.classList.remove("hidden");
    } else {
      this.dom.dangerBanner.classList.add("hidden");
    }

    // Update Fishes & Collision
    for (let i = this.fishes.length - 1; i >= 0; i--) {
      const fish = this.fishes[i];
      fish.update(this.width, this.height);

      // Despawn offscreen
      const margin = 180;
      if (
        (fish.facing > 0 && fish.x > this.width + margin) ||
        (fish.facing < 0 && fish.x < -margin) ||
        fish.y < -margin ||
        fish.y > this.height + margin
      ) {
        this.fishes.splice(i, 1);
        continue;
      }

      // Check collision with player
      if (!this.player.isDead) {
        const dist = Math.hypot(fish.x - this.player.x, fish.y - this.player.y);
        const contactDist = (this.player.radius + fish.radius) * 0.78;

        if (dist < contactDist) {
          if (this.player.radius > fish.radius * 1.05) {
            // Player eats fish
            const sizeRatio = this.player.radius / fish.radius;
            window.soundManager.playEat(sizeRatio);

            const result = this.player.feed(fish);
            this.createEatEffect(fish.x, fish.y, 10, fish.tierConfig.bodyColor);
            this.addFloatingText(`+${fish.tierConfig.scoreVal}`, fish.x, fish.y);

            if (result.evolved) {
              this.showEvolutionNotice(this.player.tierConfig.name);
            }

            this.updateHUD();
            this.fishes.splice(i, 1);
            continue;
          } else if (fish.radius > this.player.radius * 1.05 && this.spawnInvulnerableTimer <= 0) {
            // Predator eats player!
            this.gameOver(fish);
            break;
          }
        }
      }
    }

    // 待玩家长到中等体型时 (Lv.3 黄金雀鲷/体长达到30cm以上)，鱼的数量提升 15%
    const isMedium = this.player && (this.player.currentTierIndex >= 2 || this.player.radius >= 30);
    const targetMaxFishes = isMedium ? Math.round(this.baseMaxFishes * 1.15) : this.baseMaxFishes;

    // 屏幕鱼总面积检测：严格不多于屏幕大小的 10%
    const totalFishArea = this.fishes.reduce((sum, f) => sum + Math.PI * f.radius * f.radius, 0);
    const screenArea = this.width * this.height;
    const isUnderAreaLimit = totalFishArea < screenArea * 0.10;

    // 核心保障机制：实时统计场上可被当前玩家捕食的鱼类数量与比例
    const pRadius = this.player ? this.player.radius : 18;
    const edibleFishCount = this.fishes.filter(f => f.radius < pRadius * 0.96).length;
    const currentEdibleRatio = this.fishes.length > 0 ? (edibleFishCount / this.fishes.length) : 0;

    // 无论任何等级，若场上可捕食鱼类数量为 0 或低于 25%，立刻强制补充可捕食鱼
    if (this.fishes.length > 0 && (edibleFishCount === 0 || currentEdibleRatio < 0.25)) {
      this.spawnFish(false, true); // 强制生成可捕食鱼
    } else if (this.fishes.length < targetMaxFishes && isUnderAreaLimit) {
      this.spawnFish(false);
    }

    // Update ambient bubbles
    for (let b of this.bubbles) {
      b.y -= b.speed;
      b.wobble += 0.04;
      b.x += Math.sin(b.wobble) * 0.4;
      if (b.y < -10) {
        b.y = this.height + 10;
        b.x = Math.random() * this.width;
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      p.alpha = 1 - (p.life / p.maxLife);
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.y += t.vy;
      t.life++;
      t.alpha = 1 - (t.life / t.maxLife);
      if (t.life >= t.maxLife) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // 1. Render Sun Light Rays
    const time = Date.now() * 0.0015;
    for (let ray of this.lightRays) {
      const alpha = (Math.sin(time + ray.phase) * 0.5 + 0.5) * ray.maxAlpha;
      const grad = this.ctx.createLinearGradient(ray.x, 0, ray.x + 80, this.height);
      grad.addColorStop(0, `rgba(180, 245, 255, ${alpha * 2})`);
      grad.addColorStop(0.6, `rgba(0, 180, 255, ${alpha})`);
      grad.addColorStop(1, "rgba(0, 50, 120, 0)");

      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.moveTo(ray.x - ray.width * 0.2, 0);
      this.ctx.lineTo(ray.x + ray.width * 0.2, 0);
      this.ctx.lineTo(ray.x + ray.width * 1.2, this.height);
      this.ctx.lineTo(ray.x - ray.width * 0.4, this.height);
      this.ctx.fill();
    }

    // 2. Render Seaweeds / Kelp
    for (let kelp of this.kelps) {
      const sway = Math.sin(time * 1.4 + kelp.swayOffset) * 26;
      this.ctx.beginPath();
      this.ctx.moveTo(kelp.x, this.height);
      this.ctx.quadraticCurveTo(kelp.x + sway * 0.5, this.height - kelp.height * 0.5, kelp.x + sway, this.height - kelp.height);
      this.ctx.lineWidth = kelp.width;
      this.ctx.strokeStyle = kelp.color;
      this.ctx.lineCap = "round";
      this.ctx.stroke();
    }

    // 3. Render Ambient Bubbles
    for (let b of this.bubbles) {
      this.ctx.beginPath();
      this.ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(180, 235, 255, ${b.alpha})`;
      this.ctx.fill();
      this.ctx.strokeStyle = `rgba(255, 255, 255, ${b.alpha * 1.5})`;
      this.ctx.lineWidth = 0.6;
      this.ctx.stroke();
    }

    // 4. Render NPC Fishes (sorted by radius so bigger fish appear on top)
    const sortedFishes = [...this.fishes].sort((a, b) => a.radius - b.radius);
    for (let fish of sortedFishes) {
      fish.render(this.ctx, this.player);
    }

    // 5. Render Player Fish
    if (this.player && !this.player.isDead) {
      this.player.render(this.ctx);
    }

    // 6. Render Particles
    for (let p of this.particles) {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.fill();
      this.ctx.globalAlpha = 1.0;
    }

    // 7. Render Floating Text
    for (let t of this.floatingTexts) {
      this.ctx.save();
      this.ctx.font = "bold 16px 'Outfit', sans-serif";
      this.ctx.fillStyle = t.color;
      this.ctx.shadowColor = "rgba(0,0,0,0.8)";
      this.ctx.shadowBlur = 6;
      this.ctx.globalAlpha = Math.max(0, t.alpha);
      this.ctx.fillText(t.text, t.x, t.y);
      this.ctx.restore();
    }
  }

  loop(timestamp) {
    this.update();
    this.render();
    requestAnimationFrame((ts) => this.loop(ts));
  }
}

// Instantiate game on load
window.addEventListener("DOMContentLoaded", () => {
  window.oceanGame = new OceanGame();
});
