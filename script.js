// script.js

let gameRunning = false;           // ← menu gate
let selectedCharacter = 'hank';    // default character
let gameOverFade = 0;              // fade overlay for smooth transitions

document.addEventListener('DOMContentLoaded', () => {
  /* ——— Character‑select handlers ——— */
  const charH = document.getElementById('characterHank');
  const charE = document.getElementById('characterEdgar');
  const charF = document.getElementById('characterFang');

  charH.addEventListener('click', () => {
    selectedCharacter = 'hank';
    charH.classList.add('selected');
    charE.classList.remove('selected');
    charF.classList.remove('selected');
  });
  charE.addEventListener('click', () => {
    selectedCharacter = 'edgar';
    charE.classList.add('selected');
    charH.classList.remove('selected');
    charF.classList.remove('selected');
  });
  charF.addEventListener('click', () => {
    selectedCharacter = 'fang';
    charF.classList.add('selected');
    charH.classList.remove('selected');
    charE.classList.remove('selected');
  });

  /* ——— Menu glue ——— */
  const menu       = document.getElementById('menu');
  const startBtn   = document.getElementById('startGame');
  const highscoreEl = document.getElementById('highscore');  // ← NEW
  let highscore    = 0;                                     // ← NEW
  const playerImage = new Image();

  if (startBtn) {
    startBtn.addEventListener('click', () => {
      menu.style.display  = 'none';
      playerImage.src     = selectedCharacter + '.png';
      gameRunning         = true;
      lastTime            = performance.now();  // reset timer
      cubeSpawnTimer      = cubeSpawnInterval; // spawn first cube after interval
    });
  } else {
    gameRunning       = true;                  // no menu present
    playerImage.src   = selectedCharacter + '.png';
    cubeSpawnTimer    = cubeSpawnInterval; // spawn first cube after interval
  }

  /* ——— Pause on tab change ——— */
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && gameRunning) {
      lastTime = performance.now();
    }
  });

  const canvas = document.getElementById('gameCanvas');
  const ctx    = canvas.getContext('2d');
  let cw, ch, diag;
  
  // Screen shake
  let shakeX = 0, shakeY = 0, shakeIntensity = 0;

  // ——— Enemy setup ———
  const enemyImage = new Image();
  enemyImage.src   = 'enemy.png';
  const enemySize  = Math.min(cw, ch) < 600 ? 75 : 100; // smaller on small screens
  const enemy      = {
    x: 0,
    y: enemySize/2 + 20,                // 20px down from top
    speed: 250 * 0.6,                   // 3/5 of player speed
    targetX: 0
  };

  function resize() {
    cw   = canvas.width  = window.innerWidth;
    ch   = canvas.height = window.innerHeight;
    diag = Math.hypot(cw, ch);
    enemy.x       = cw/2;               // recenter on width change
    enemy.targetX = cw/2;
  }
  window.addEventListener('resize', resize);
  resize();

  // every 2s, if enemy at target, pick new target in ±0.2·cw around player
  setInterval(() => {
    if (Math.abs(enemy.x - enemy.targetX) < 5) {
      let newX = player.x + (Math.random()*2 - 1) * 0.2 * cw;
      // clamp to screen
      enemy.targetX = Math.min(Math.max(enemySize/2, newX), cw - enemySize/2);
    }
  }, 2000);

  // ——— Background image setup ———
  const bgImage = new Image();
  bgImage.src   = 'background.png';  // your 1:1 image

  // ——— Player setup ———
  const spriteSize = Math.min(cw, ch) < 600 ? 90 : 125; // smaller on small screens
  const player = {
    x: cw/2,
    y: ch/2,
    radius: spriteSize/2,
    speed: 250,
    vx: 0,
    vy: 0,
    // Smooth movement
    targetVx: 0,
    targetVy: 0,
    scale: 1.0,
    // Damage immunity
    invulnerable: false,
    invulnerableTime: 0
  };

  // ——— Ball image setup ———
  const ballImage  = new Image();
  ballImage.src    = 'ball.png';
  const ballSize   = Math.min(cw, ch) < 600 ? 55 : 70; // smaller on small screens
  const ballRadius = ballSize / 2;

  // ——— Power Cube setup ———
  const cubeImage = new Image();
  cubeImage.src = 'powercube.png';
  const cubeSize = Math.min(cw, ch) < 600 ? 40 : 50; // smaller on small screens
  let powerCube = null;
  let cubeSpawnTimer = 0;
  const cubeSpawnInterval = 15000; // 15 seconds
  
  // Buff types
  const buffTypes = [
    { name: 'speed', color: '#00ff00', duration: 12000 },     // Green - Speed boost
    { name: 'shrink', color: '#0080ff', duration: 15000 },    // Blue - Smaller size
    { name: 'shield', color: '#ffff00', duration: 8000 },     // Yellow - Invulnerability  
    { name: 'slowmo', color: '#8000ff', duration: 10000 },    // Purple - Slow projectiles
    { name: 'double', color: '#ff0000', duration: 18000 },    // Red - Double points
    { name: 'heal', color: '#ff69b4', duration: 0 }           // Pink - Instant heal (no duration)
  ];
  
  // Active buffs
  let activeBuffs = {};

  // ——— Input controls ———
  const keys = { w: false, a: false, s: false, d: false };
  let joystickVx = 0, joystickVy = 0;
  let joystickActive = false;
  
  document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key in keys) {
      keys[key] = true;
      e.preventDefault();
    }
  });
  
  document.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key in keys) {
      keys[key] = false;
      e.preventDefault();
    }
  });
  
  function updateInput() {
    // Use joystick if active, otherwise use keyboard
    if (joystickActive) {
      player.targetVx = joystickVx;
      player.targetVy = joystickVy;
    } else {
      let vx = 0, vy = 0;
      if (keys.a) vx -= 1; // left
      if (keys.d) vx += 1; // right
      if (keys.w) vy -= 1; // up
      if (keys.s) vy += 1; // down
      
      // Normalize diagonal movement
      if (vx !== 0 && vy !== 0) {
        const length = Math.hypot(vx, vy);
        vx /= length;
        vy /= length;
      }
      
      player.targetVx = vx;
      player.targetVy = vy;
    }
  }

  // ——— Joystick ———
  if (typeof nipplejs === 'undefined') {
    console.error('NippleJS not loaded');
    return;
  }
  nipplejs.create({
    zone: document.getElementById('joystick-container'),
    mode: 'static',
    position: { left: '125px', bottom: '125px' },
    color: 'blue',
    size: 200
  })
  .on('move', (_e, d) => {
    joystickActive = true;
    joystickVx = d.vector?.x  || 0;
    joystickVy = d.vector?.y ? -d.vector.y : 0;
  })
  .on('end', () => {
    joystickActive = false;
    joystickVx = 0;
    joystickVy = 0;
  });

  // ——— Ball & Spike logic ———
  const balls = [];
  const particles = [];
  const floatingTexts = [];
  const groundMarks = [];
  let score = 0;
  let playerHP = 3;
  const maxHP = 3;
  let heartPulseTime = 0;

  // timing & difficulty
  const initialSpawnInterval = 5000;
  let spawnInterval = initialSpawnInterval,
      minInterval   = 1000,
      spawnTimer    = 0;
  let totalElapsed = 0,
      nextHarderAt = 5;

  // geometry constants
  const spikeCount  = 6;
  const spikeAngVel = Math.PI / 0.55;   // clockwise curve speed
  const speedFactor = 2.2;              // speed-up factor

  // spawn power cube in lower half of screen
  function spawnPowerCube() {
    const x = cubeSize/2 + Math.random() * (cw - cubeSize); // random X within screen bounds
    const y = ch * 0.5 + Math.random() * (ch * 0.5 - cubeSize); // Y between 50%-100% screen height
    const buffType = buffTypes[Math.floor(Math.random() * buffTypes.length)];
    
    powerCube = {
      x: x,
      y: y,
      startX: x,
      startY: y,
      rotation: 0,
      pulse: 0,
      buffType: buffType,
      isJumping: false,
      jumpProgress: 0,
      scale: 1.0
    };
  }

  // spawn a normal ball from enemy position + random x‑offset ±0.2cw
  function spawnBall() {
    const offset = (Math.random()*2 - 1) * 0.2 * cw;
    const x = enemy.x;
    const y = enemy.y + enemySize/2;
    const dx = player.x - x, dy = player.y - y;
    const mag = Math.hypot(dx, dy) || 1;
    const ux = dx / mag, uy = dy / mag;

    const base  = (0.7 * diag) / 3;
    const speed = base * 0.7 * speedFactor;

    balls.push({
      type:   'normal',
      x, y,
      vx:     ux * speed,
      vy:     uy * speed,
      spawnX: x,
      spawnY: y,
      speed,
      rotation: 0,
      particleTimer: 0 // timer for spawning particles
    });

    // —— update score & highscore (back to ball-dodging based)
    const scoreGain = activeBuffs.double ? 2 : 1; // double points buff
    score += scoreGain;
    
    // Add floating score text
    floatingTexts.push({
      x: enemy.x + (Math.random() - 0.5) * 100,
      y: enemy.y,
      text: `+${scoreGain}`,
      life: 1.0,
      vy: -60,
      color: activeBuffs.double ? '#ff0000' : '#00ff00' // red for double points
    });
    
    if (score > highscore) {
      highscore = score;
      highscoreEl.textContent = highscore;
    }
  }

  // create explosion particles
  function createExplosion(x, y, count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 2 * Math.PI;
      const speed = 100 + Math.random() * 100;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        maxLife: 0.8 + Math.random() * 0.4,
        size: 3 + Math.random() * 4,
        color: `hsl(${20 + Math.random() * 40}, 100%, 60%)`
      });
    }
  }

  // spawn spikes curving right, ending at 24.5% of screen width
  function spawnSpikes(ax, ay, parentSpeed) {
    createExplosion(ax, ay, 6);
    const travelDist = cw * 0.267;
    const spikeSpeed = parentSpeed * speedFactor;
    for (let i = 0; i < spikeCount; i++) {
      const angle = i * (2 * Math.PI / spikeCount);
      const dx0   = Math.cos(angle),
            dy0   = Math.sin(angle);
      balls.push({
        type:           'spike',
        x:              ax,
        y:              ay,
        vx:             dx0 * spikeSpeed,
        vy:             dy0 * spikeSpeed,
        originX:        ax,
        originY:        ay,
        travelDistance: travelDist,
        angVel:         spikeAngVel,
        rotation:       0,
        trail:          [] // trail positions
      });
    }
  }

  // ——— Main loop ———
  let lastTime = performance.now();
  function loop(now) {
    if (!gameRunning) {
      requestAnimationFrame(loop);
      return;
    }
    if (document.hidden) {
      lastTime = now;
      requestAnimationFrame(loop);
      return;
    }

    const dt = (now - lastTime) / 1000;
    lastTime = now;
    totalElapsed += dt;

    // Update input (keyboard or joystick)
    updateInput();

    // enemy walks toward its targetX
    const dxE = enemy.targetX - enemy.x;
    if (Math.abs(dxE) > 1) {
      const dir = dxE / Math.abs(dxE);
      enemy.x += enemy.speed * dir * dt;
      // clamp overshoot
      if ((dir > 0 && enemy.x > enemy.targetX) ||
          (dir < 0 && enemy.x < enemy.targetX)) {
        enemy.x = enemy.targetX;
      }
    }

    // ramp difficulty
    if (totalElapsed >= nextHarderAt) {
      spawnInterval = Math.max(minInterval, spawnInterval * 0.9);
      nextHarderAt += 5;
    }

    // spawn timing
    spawnTimer += dt * 1000;
    while (spawnTimer >= spawnInterval) {
      spawnTimer -= spawnInterval;
      spawnBall();
    }

    // smooth player movement with easing
    const easing = 8.0;
    player.vx += (player.targetVx - player.vx) * easing * dt;
    player.vy += (player.targetVy - player.vy) * easing * dt;
    
    // scale effect when moving (modified by shrink buff)
    let baseScale = activeBuffs.shrink ? 0.7 : 1.0; // shrink buff effect
    const targetScale = Math.hypot(player.vx, player.vy) > 0.1 ? baseScale * 1.1 : baseScale;
    player.scale += (targetScale - player.scale) * 5.0 * dt;

    // calculate movement speed (modified by speed buff)
    let currentSpeed = player.speed;
    if (activeBuffs.speed) currentSpeed *= 1.5; // speed buff effect

    // update player position
    const effectiveRadius = player.radius * (activeBuffs.shrink ? 0.7 : 1.0); // shrink hitbox
    player.x = Math.min(
      Math.max(effectiveRadius, player.x + player.vx * currentSpeed * dt),
      cw - effectiveRadius
    );
    player.y = Math.min(
      Math.max(effectiveRadius, player.y + player.vy * currentSpeed * dt),
      ch - effectiveRadius
    );

    // update player invulnerability
    if (player.invulnerable) {
      player.invulnerableTime -= dt;
      if (player.invulnerableTime <= 0) {
        player.invulnerable = false;
      }
    }

    // spawn speed trail particles when speed buff is active
    if (activeBuffs.speed && Math.hypot(player.vx, player.vy) > 0.1) {
      for (let i = 0; i < 3; i++) {
        particles.push({
          x: player.x + (Math.random() - 0.5) * player.radius,
          y: player.y + (Math.random() - 0.5) * player.radius,
          vx: -player.vx * 20 + (Math.random() - 0.5) * 30,
          vy: -player.vy * 20 + (Math.random() - 0.5) * 30,
          life: 1.0,
          maxLife: 0.4,
          size: 2 + Math.random() * 3,
          color: '#00ff00'
        });
      }
    }

    // spawn shrink sparkle particles when shrink buff is active
    if (activeBuffs.shrink) {
      if (Math.random() < 0.3) { // 30% chance per frame
        particles.push({
          x: player.x + (Math.random() - 0.5) * player.radius * 2,
          y: player.y + (Math.random() - 0.5) * player.radius * 2,
          vx: (Math.random() - 0.5) * 50,
          vy: (Math.random() - 0.5) * 50,
          life: 1.0,
          maxLife: 0.8,
          size: 1 + Math.random() * 2,
          color: '#0080ff'
        });
      }
    }

    // spawn red coin particles when double points buff is active
    if (activeBuffs.double) {
      if (Math.random() < 0.2) { // 20% chance per frame
        const angle = Math.random() * Math.PI * 2;
        const distance = player.radius + 20;
        particles.push({
          x: player.x + Math.cos(angle) * distance,
          y: player.y + Math.sin(angle) * distance,
          vx: Math.cos(angle) * 30,
          vy: Math.sin(angle) * 30 - 20, // slight upward bias
          life: 1.0,
          maxLife: 1.2,
          size: 3 + Math.random() * 2,
          color: '#ff0000' // red color to match buff
        });
      }
    }

    // update balls & spikes
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i];
      if (b.type === 'normal') {
        // explode after traveling 40% screen width
        const traveled = Math.hypot(b.x - b.spawnX, b.y - b.spawnY);
        if (traveled >= ch * 0.4) {
          spawnSpikes(b.x, b.y, b.speed);
          balls.splice(i, 1);
          continue;
        }
        // apply slowmo buff to ball movement
        const moveSpeed = activeBuffs.slowmo ? 0.5 : 1.0;
        b.x += b.vx * dt * moveSpeed;
        b.y += b.vy * dt * moveSpeed;
        b.rotation += 3 * dt; // rotate normal balls
        
        // Spawn particles behind the ball
        b.particleTimer += dt;
        if (b.particleTimer >= 0.05) { // spawn particles every 0.05 seconds
          b.particleTimer = 0;
          
          // Create small particles behind the ball
          for (let p = 0; p < 2; p++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 10 + Math.random() * 15;
            const particleX = b.x - Math.cos(Math.atan2(b.vy, b.vx)) * distance + Math.cos(angle) * 8;
            const particleY = b.y - Math.sin(Math.atan2(b.vy, b.vx)) * distance + Math.sin(angle) * 8;
            
            particles.push({
              x: particleX,
              y: particleY,
              vx: (Math.random() - 0.5) * 50,
              vy: (Math.random() - 0.5) * 50,
              life: 1.0,
              maxLife: 0.6 + Math.random() * 0.4,
              size: 2 + Math.random() * 3,
              color: `hsl(${10 + Math.random() * 20}, 80%, 60%)` // red-orange particles
            });
          }
        }
      } else {
        // rotate for rightward curvature (affected by slowmo)
        const curveSpeed = activeBuffs.slowmo ? 0.5 : 1.0;
        const θ = b.angVel * dt * curveSpeed,
              c = Math.cos(θ), s = Math.sin(θ);
        const nx = b.vx * c - b.vy * s,
              ny = b.vx * s + b.vy * c;
        b.vx = nx; b.vy = ny;

        const d = Math.hypot(b.x - b.originX, b.y - b.originY);
        if (d >= b.travelDistance) {
          // Add ground mark where spike ended
          groundMarks.push({
            x: b.x,
            y: b.y,
            life: 1.0,
            maxLife: 3.0, // 3 seconds
            size: ballSize / 6
          });
          
          balls.splice(i, 1);
          continue;
        }
        // apply slowmo buff to spike movement  
        const spikeSpeed = activeBuffs.slowmo ? 0.5 : 1.0;
        b.x += b.vx * dt * spikeSpeed;
        b.y += b.vy * dt * spikeSpeed;
        b.rotation += 5 * dt; // rotate spikes faster
        
        // Add current position to trail
        b.trail.push({ x: b.x, y: b.y, life: 1.0 });
        
        // Update trail positions and remove old ones
        for (let j = b.trail.length - 1; j >= 0; j--) {
          b.trail[j].life -= dt * 3; // trail fades over time
          if (b.trail[j].life <= 0) {
            b.trail.splice(j, 1);
          }
        }
        
        // Limit trail length
        if (b.trail.length > 8) {
          b.trail.shift();
        }
      }

      // collision (only if not invulnerable and no shield buff)
      const dxp = b.x - player.x,
            dyp = b.y - player.y,
            r   = (b.type==='spike' ? ballRadius/3 : ballRadius) + effectiveRadius;
      if (!player.invulnerable && !activeBuffs.shield && dxp*dxp + dyp*dyp < r*r) {
        // Screen shake on collision
        shakeIntensity = 10;
        createExplosion(player.x, player.y, 8);
        
        // Reduce HP and make player invulnerable
        playerHP--;
        player.invulnerable = true;
        player.invulnerableTime = 1.5; // 1.5 seconds of invulnerability
        heartPulseTime = 1.0; // pulse hearts for 1 second
        balls.splice(i, 1);
        
        // Add damage feedback text
        floatingTexts.push({
          x: player.x,
          y: player.y - 50,
          text: '-1 HP',
          life: 1.0,
          vy: -80,
          color: '#ff0000'
        });
        
        // Check if game over
        if (playerHP <= 0) {
          score = 0;
          spawnInterval = initialSpawnInterval;
          spawnTimer    = 0;
          totalElapsed  = 0;
          nextHarderAt  = 5;
          playerHP = maxHP; // reset HP for next game
          
          // Clear all active buffs on death
          activeBuffs = {};
          
          // Reset cube spawn timer
          cubeSpawnTimer = cubeSpawnInterval;
          powerCube = null;
          
          // Start fade transition
          gameOverFade = 1.0;
          gameRunning = false;
          
          // Show menu after fade completes
          setTimeout(() => {
            menu.style.display = 'flex';
          }, 800);
        }
      }
    }

    // update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt / p.maxLife;
      p.vx *= 0.98; // friction
      p.vy *= 0.98;
      
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }

    // update floating text
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const t = floatingTexts[i];
      t.y += t.vy * dt;
      t.life -= dt * 1.5;
      t.vy *= 0.98; // slow down upward movement
      
      if (t.life <= 0) {
        floatingTexts.splice(i, 1);
      }
    }

    // update screen shake
    if (shakeIntensity > 0) {
      shakeX = (Math.random() - 0.5) * shakeIntensity;
      shakeY = (Math.random() - 0.5) * shakeIntensity;
      shakeIntensity *= 0.9; // decay
      if (shakeIntensity < 0.1) shakeIntensity = 0;
    } else {
      shakeX = shakeY = 0;
    }

    // update game over fade
    if (gameOverFade > 0) {
      gameOverFade -= dt * 1.2;
      if (gameOverFade < 0) gameOverFade = 0;
    }

    // update heart pulse effect
    if (heartPulseTime > 0) {
      heartPulseTime -= dt;
      if (heartPulseTime < 0) heartPulseTime = 0;
    }

    // update cube spawn timer
    cubeSpawnTimer -= dt * 1000;
    if (cubeSpawnTimer <= 0 && !powerCube) {
      spawnPowerCube();
      cubeSpawnTimer = cubeSpawnInterval;
    }

    // update power cube
    if (powerCube) {
      powerCube.rotation += 2 * dt; // rotate cube
      powerCube.pulse += dt * 4; // pulse animation
      
      const dx = powerCube.x - player.x;
      const dy = powerCube.y - player.y;
      const distance = Math.hypot(dx, dy);
      const attractRadius = player.radius + 80; // attraction range
      const collectRadius = player.radius + 20; // collection range
      
      if (!powerCube.isJumping && distance < attractRadius) {
        // Start jumping toward player
        powerCube.isJumping = true;
        powerCube.jumpProgress = 0;
      }
      
      if (powerCube.isJumping) {
        powerCube.jumpProgress += dt * 3; // jump speed
        
        if (powerCube.jumpProgress >= 1) {
          // Collection complete - activate buff
          if (powerCube.buffType.name === 'heal') {
            // Instant heal effect
            if (playerHP < maxHP) {
              playerHP++;
              heartPulseTime = 1.0; // pulse hearts
            }
            
            // Add heal text
            floatingTexts.push({
              x: player.x,
              y: player.y - 50,
              text: '+1 HP',
              life: 1.0,
              vy: -60,
              color: powerCube.buffType.color
            });
          } else {
            // Regular timed buff
            activeBuffs[powerCube.buffType.name] = {
              timeLeft: powerCube.buffType.duration,
              color: powerCube.buffType.color
            };
            
            // Add buff text
            floatingTexts.push({
              x: player.x,
              y: player.y - 50,
              text: powerCube.buffType.name.toUpperCase(),
              life: 1.0,
              vy: -60,
              color: powerCube.buffType.color
            });
          }
          
          // Collection particles
          createExplosion(player.x, player.y, 8);
          
          powerCube = null; // remove cube
        } else {
          // Animate jump toward player with arc
          const t = powerCube.jumpProgress;
          const easeT = 1 - Math.pow(1 - t, 3); // ease out cubic
          
          powerCube.x = powerCube.startX + (player.x - powerCube.startX) * easeT;
          powerCube.y = powerCube.startY + (player.y - powerCube.startY) * easeT - Math.sin(t * Math.PI) * 30;
          powerCube.scale = 1 + Math.sin(t * Math.PI) * 0.3; // scale during jump
        }
      }
    }

    // update active buffs
    Object.keys(activeBuffs).forEach(buffName => {
      activeBuffs[buffName].timeLeft -= dt * 1000;
      if (activeBuffs[buffName].timeLeft <= 0) {
        delete activeBuffs[buffName];
      }
    });

    // update ground marks
    for (let i = groundMarks.length - 1; i >= 0; i--) {
      const mark = groundMarks[i];
      mark.life -= dt / mark.maxLife;
      
      if (mark.life <= 0) {
        groundMarks.splice(i, 1);
      }
    }

    // apply screen shake
    ctx.save();
    ctx.translate(shakeX, shakeY);

    // draw painted background underneath
    ctx.fillStyle = '#1a4c96';
    ctx.fillRect(-shakeX, -shakeY, cw, ch);

    // draw background (width expanded, cropping top & bottom)
    if (bgImage.complete) {
      const iw = bgImage.naturalWidth,
            ih = bgImage.naturalHeight;
      const scaledH = cw * (ih / iw),
            yOff    = (ch - scaledH) / 2;
      ctx.drawImage(bgImage, -cw*0.1, yOff*1.2, cw*1.2, scaledH*1.2);
    }

    // draw enemy
    if (enemyImage.complete) {
      ctx.drawImage(
        enemyImage,
        enemy.x - enemySize/2,
        enemy.y - enemySize/2,
        enemySize,
        enemySize
      );
    }

    // draw player with scale effect and invulnerability flashing
    ctx.save();
    
    // Shield buff visual effect with rotating rings
    if (activeBuffs.shield) {
      const time = performance.now() / 1000;
      const shieldPulse = Math.sin(time * 8) * 0.1;
      
      // Outer glow
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius * (2.2 + shieldPulse), 0, 2 * Math.PI);
      ctx.fill();
      
      // Rotating energy rings
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 3;
      
      for (let ring = 0; ring < 3; ring++) {
        const ringRadius = player.radius * (1.3 + ring * 0.3 + shieldPulse);
        const rotation = time * (2 + ring * 0.5);
        
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 + rotation;
          const x = player.x + Math.cos(angle) * ringRadius;
          const y = player.y + Math.sin(angle) * ringRadius;
          
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }
      
      ctx.globalAlpha = 1.0;
    }
    
    // Double points red aura
    if (activeBuffs.double) {
      const redPulse = Math.sin(performance.now() * 6 * Math.PI / 1000);
      ctx.globalAlpha = 0.3 + redPulse * 0.1;
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius * (1.8 + redPulse * 0.2), 0, 2 * Math.PI);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }
    
    // Flash effect when invulnerable
    if (player.invulnerable) {
      const flashRate = 10; // flashes per second
      const flash = Math.sin(performance.now() * flashRate * Math.PI / 1000);
      ctx.globalAlpha = flash > 0 ? 0.3 : 1.0;
    }
    
    if (playerImage.complete) {
      const scaledSize = spriteSize * player.scale;
      ctx.drawImage(
        playerImage,
        player.x - scaledSize/2,
        player.y - scaledSize/2,
        scaledSize,
        scaledSize
      );
    } else {
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius * player.scale, 0, 2 * Math.PI);
      ctx.fillStyle = '#3498db';
      ctx.fill();
    }
    
    ctx.restore();

    // draw spike trails first (behind spikes)
    balls.forEach(b => {
      if (b.type === 'spike' && b.trail && b.trail.length > 1) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Draw trail as connected line segments with fading opacity
        for (let i = 1; i < b.trail.length; i++) {
          const curr = b.trail[i];
          const prev = b.trail[i - 1];
          const alpha = curr.life * 0.6; // trail opacity
          const width = (ballSize/6) * curr.life; // trail width fades
          
          ctx.strokeStyle = `rgba(255, 165, 0, ${alpha})`; // orange trail
          ctx.lineWidth = width;
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(curr.x, curr.y);
          ctx.stroke();
        }
        
        ctx.restore();
      }
    });

    // draw balls & spikes
    balls.forEach(b => {
      const size = (b.type==='spike' ? ballSize/3 : ballSize),
            half = size/2;
      
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rotation);
      
      if (ballImage.complete) {
        ctx.drawImage(ballImage, -half, -half, size, size);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, size/2, 0, 2 * Math.PI);
        ctx.fillStyle = b.type==='spike' ? 'orange' : 'red';
        ctx.fill();
      }
      
      ctx.restore();
    });

    // draw particles
    particles.forEach(p => {
      const alpha = p.life;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();
    });

    // draw power cube
    if (powerCube) {
      ctx.save();
      ctx.translate(powerCube.x, powerCube.y);
      ctx.rotate(powerCube.rotation);
      ctx.scale(powerCube.scale, powerCube.scale);
      
      // Pulsing glow effect with buff color
      const glowScale = 1 + Math.sin(powerCube.pulse) * 0.15;
      const glowSize = cubeSize * glowScale;
      const buffColor = powerCube.buffType.color;
      
      // Outer glow
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = buffColor;
      ctx.beginPath();
      ctx.arc(0, 0, glowSize * 0.9, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw cube
      ctx.globalAlpha = 1.0;
      if (cubeImage.complete) {
        // Tint the cube image with buff color
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = buffColor;
        ctx.fillRect(-cubeSize/2, -cubeSize/2, cubeSize, cubeSize);
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(cubeImage, -cubeSize/2, -cubeSize/2, cubeSize, cubeSize);
      } else {
        // Fallback colored square
        ctx.fillStyle = buffColor;
        ctx.fillRect(-cubeSize/2, -cubeSize/2, cubeSize, cubeSize);
      }
      
      ctx.restore();
    }

    // draw ground marks as white X shapes (like bandaids)
    groundMarks.forEach(mark => {
      const alpha = mark.life * 0.8; // semi-transparent
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#ffffff'; // white color
      ctx.lineWidth = 8; // much thicker lines
      ctx.lineCap = 'round';
      
      // Draw X shape with shorter, thicker lines (like bandaids)
      const size = mark.size * 0.8; // even shorter
      
      // First diagonal line (\)
      ctx.beginPath();
      ctx.moveTo(mark.x - size, mark.y - size);
      ctx.lineTo(mark.x + size, mark.y + size);
      ctx.stroke();
      
      // Second diagonal line (/)
      ctx.beginPath();
      ctx.moveTo(mark.x - size, mark.y + size);
      ctx.lineTo(mark.x + size, mark.y - size);
      ctx.stroke();
      
      ctx.restore();
    });

    // draw floating score text
    floatingTexts.forEach(t => {
      const alpha = t.life;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = t.color || '#00ff00';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    });

    // draw active buff indicators
    const buffNames = Object.keys(activeBuffs);
    let buffY = 15;
    buffNames.forEach(buffName => {
      const buff = activeBuffs[buffName];
      const timeLeft = Math.ceil(buff.timeLeft / 1000);
      
      ctx.save();
      ctx.fillStyle = buff.color;
      ctx.font = 'bold 16px Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText(`${buffName.toUpperCase()}: ${timeLeft}s`, cw - 15, buffY);
      ctx.restore();
      
      buffY += 25;
    });

    // draw score with enhanced styling (scaled for screen size)
    const scoreText = `SCORE: ${score}`;
    const uiScale = Math.max(0.8, Math.min(1.5, Math.min(cw, ch) / 600)); // scale UI based on screen size
    const scoreFontSize = Math.round(28 * uiScale);
    ctx.font = `bold ${scoreFontSize}px Arial, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    const uiPadding = 15 * uiScale;
    
    // Score text shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillText(scoreText, uiPadding + 2, uiPadding + 2);
    
    // Score text main
    ctx.fillStyle = '#ffffff';
    ctx.fillText(scoreText, uiPadding, uiPadding);
    
    // Score text highlight
    ctx.fillStyle = '#ffff00';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2 * uiScale;
    ctx.strokeText(scoreText, uiPadding, uiPadding);
    ctx.fillText(scoreText, uiPadding, uiPadding);
    
    // Draw HP hearts with enhanced styling (scaled)
    const baseFontSize = 36 * uiScale;
    const pulseScale = heartPulseTime > 0 ? 1 + Math.sin(heartPulseTime * 15) * 0.2 : 1;
    const currentFontSize = baseFontSize * pulseScale;
    const heartSpacing = 45 * uiScale;
    const heartY = uiPadding + scoreFontSize + (10 * uiScale);
    
    ctx.font = `bold ${currentFontSize}px Arial, sans-serif`;
    for (let i = 0; i < maxHP; i++) {
      const x = uiPadding + i * heartSpacing;
      const y = heartY;
      
      if (i < playerHP) {
        // Heart shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillText('♥', x + 2, y + 2);
        
        // Heart main color - brighter when pulsing
        const heartColor = heartPulseTime > 0 ? '#ff0000' : '#ff1a1a';
        ctx.fillStyle = heartColor;
        ctx.fillText('♥', x, y);
        
        // Heart highlight
        ctx.fillStyle = '#ff6666';
        ctx.font = `bold ${currentFontSize * 0.9}px Arial, sans-serif`;
        ctx.fillText('♥', x + 2 * uiScale, y - 2 * uiScale);
        ctx.font = `bold ${currentFontSize}px Arial, sans-serif`;
      } else {
        // Empty heart shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillText('♡', x + 2 * uiScale, y + 2 * uiScale);
        
        // Empty heart
        ctx.fillStyle = '#555555';
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = uiScale;
        ctx.strokeText('♡', x, y);
        ctx.fillText('♡', x, y);
      }
    }

    // restore canvas transform
    ctx.restore();

    // draw slowmo screen tint
    if (activeBuffs.slowmo) {
      ctx.fillStyle = 'rgba(128, 0, 255, 0.1)'; // purple tint
      ctx.fillRect(0, 0, cw, ch);
      
      // Add scan lines effect
      ctx.strokeStyle = 'rgba(128, 0, 255, 0.2)';
      ctx.lineWidth = 1;
      for (let y = 0; y < ch; y += 4) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(cw, y);
        ctx.stroke();
      }
    }

    // draw game over fade
    if (gameOverFade > 0) {
      ctx.fillStyle = `rgba(255, 0, 0, ${gameOverFade * 0.3})`;
      ctx.fillRect(0, 0, cw, ch);
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
});
