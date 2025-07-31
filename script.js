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
    { name: 'speed', color: '#00ff00', duration: 8000 },      // Green - Speed boost
    { name: 'shrink', color: '#0080ff', duration: 10000 },    // Blue - Smaller size
    { name: 'shield', color: '#ffff00', duration: 3000 },     // Yellow - Invulnerability  
    { name: 'slowmo', color: '#8000ff', duration: 6000 },     // Purple - Slow projectiles
    { name: 'double', color: '#ff0000', duration: 12000 },    // Red - Double points
    { name: 'heal', color: '#ff69b4', duration: 0 }           // Pink - Instant heal (no duration)
  ];
  
  // Active buffs
  let activeBuffs = {};
  
  // ——— Ability System ———
  let abilityChargeTime = 0;
  let abilityReady = false;
  let abilityActive = false;
  let enemyDizzyTime = 0;
  let isEnemyDizzy = false;
  let dizzyPointTimer = 0;
  
  const ABILITY_CHARGE_DURATION = 10000; // 10 seconds
  const ENEMY_DIZZY_DURATION = 5000; // 5 seconds
  const DIZZY_POINT_INTERVAL = 1500; // Give points every 1.5 seconds during dizzy
  
  // Edgar's jump ability
  let edgarJumping = false;
  let edgarJumpTime = 0;
  let edgarJumpStartX = 0;
  let edgarJumpStartY = 0;
  let edgarJumpTargetX = 0;
  let edgarJumpTargetY = 0;
  const EDGAR_JUMP_DURATION = 1200; // 1.2 seconds
  const EDGAR_JUMP_DISTANCE = 300;
  
  // Hank's bubble ability
  let hankBubble = null;
  const HANK_BUBBLE_DURATION = 3000; // 3 seconds
  const HANK_BUBBLE_SIZE = 240; // Even bigger bubble
  
  // Fang's chain attack ability
  let fangChaining = false;
  let fangChainTargets = [];
  let fangCurrentTarget = 0;
  let fangDashTime = 0;
  let fangStartX = 0;
  let fangStartY = 0;
  let fangTargetX = 0;
  let fangTargetY = 0;
  let frozenSpikes = [];
  const FANG_DASH_SPEED = 800; // pixels per second
  const FANG_FREEZE_DURATION = 5000; // 5 seconds
  
  // Character abilities
  const abilities = {
    hank: {
      name: 'Bubble Shield',
      execute: executeHankAbility,
      chargeTime: 10000 // 10 seconds
    },
    edgar: {
      name: 'Jump Dash',
      execute: executeEdgarAbility,
      chargeTime: 10000 // 10 seconds
    },
    fang: {
      name: 'Chain Strike',
      execute: executeFangAbility,
      chargeTime: 20000 // 20 seconds
    }
  };

  // ——— Input controls ———
  const keys = { w: false, a: false, s: false, d: false, space: false };
  let joystickVx = 0, joystickVy = 0;
  let joystickActive = false;
  
  document.addEventListener('keydown', (e) => {
    const key = e.key === ' ' ? 'space' : e.key.toLowerCase();
    if (key in keys) {
      keys[key] = true;
      e.preventDefault();
    }
  });
  
  document.addEventListener('keyup', (e) => {
    const key = e.key === ' ' ? 'space' : e.key.toLowerCase();
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

  // \u2014\u2014\u2014 Ability System Functions \u2014\u2014\u2014
  function updateAbilitySystem(dt) {
    // Get current character's charge time
    const currentAbility = abilities[selectedCharacter];
    const chargeTime = currentAbility ? currentAbility.chargeTime : ABILITY_CHARGE_DURATION;
    
    // Update ability charge
    if (!abilityReady) {
      abilityChargeTime += dt * 1000;
      if (abilityChargeTime >= chargeTime) {
        abilityReady = true;
        abilityChargeTime = chargeTime;
      }
    }
    
    // Handle ability activation
    if (keys.space && abilityReady && !abilityActive) {
      activateAbility();
    }
    
    // Update enemy dizzy state
    if (isEnemyDizzy) {
      enemyDizzyTime -= dt * 1000;
      
      // Give Fang points during dizzy state
      if (selectedCharacter === 'fang') {
        dizzyPointTimer += dt * 1000;
        if (dizzyPointTimer >= DIZZY_POINT_INTERVAL) {
          dizzyPointTimer = 0;
          
          // Award points
          const scoreGain = activeBuffs.double ? 2 : 1; // double points buff applies
          score += scoreGain;
          
          // Add floating score text near enemy
          floatingTexts.push({
            x: enemy.x + (Math.random() - 0.5) * 60,
            y: enemy.y - 30 + (Math.random() - 0.5) * 20,
            text: `+${scoreGain}`,
            life: 1.0,
            vy: -40,
            color: activeBuffs.double ? '#ff0000' : '#ffff00' // yellow for dizzy points, red for double
          });
          
          if (score > highscore) {
            highscore = score;
            highscoreEl.textContent = highscore;
          }
        }
      }
      
      if (enemyDizzyTime <= 0) {
        isEnemyDizzy = false;
        abilityActive = false;
        abilityReady = false;
        abilityChargeTime = 0;
        dizzyPointTimer = 0; // Reset dizzy point timer
        
        // Remove Fang's immunity when enemy recovers
        if (selectedCharacter === 'fang') {
          player.invulnerable = false;
          player.invulnerableTime = 0;
        }
      }
    }
  }
  
  function activateAbility() {
    const ability = abilities[selectedCharacter];
    if (ability && ability.execute) {
      abilityActive = true;
      ability.execute();
      
      // Only Fang makes enemy dizzy
      if (selectedCharacter === 'fang') {
        // Start enemy dizzy state after ability
        setTimeout(() => {
          isEnemyDizzy = true;
          enemyDizzyTime = ENEMY_DIZZY_DURATION;
          dizzyPointTimer = 0; // Reset point timer when dizzy starts
        }, 1000); // Small delay before dizzy starts
      } else {
        // For other characters, just reset ability after a short delay
        setTimeout(() => {
          abilityActive = false;
          abilityReady = false;
          abilityChargeTime = 0;
        }, 1500);
      }
    }
  }
  
  function executeHankAbility() {
    // Calculate bubble direction towards enemy
    let bubbleDx = enemy.x - player.x;
    let bubbleDy = enemy.y - player.y;
    
    // Normalize direction
    const magnitude = Math.hypot(bubbleDx, bubbleDy) || 1;
    bubbleDx /= magnitude;
    bubbleDy /= magnitude;
    
    // Create bubble in front of player, aimed at enemy
    const bubbleDistance = player.radius + HANK_BUBBLE_SIZE/2 + 20;
    hankBubble = {
      x: player.x + bubbleDx * bubbleDistance,
      y: player.y + bubbleDy * bubbleDistance,
      vx: bubbleDx * 150, // bubble moves towards enemy
      vy: bubbleDy * 150,
      size: HANK_BUBBLE_SIZE,
      life: HANK_BUBBLE_DURATION,
      pulse: 0,
      spikesAbsorbed: 0
    };
    
    // Visual effect
    createExplosion(hankBubble.x, hankBubble.y, 10);
  }
  
  function executeEdgarAbility() {
    // Calculate jump direction based on current movement or default forward
    let jumpDx = player.vx || 0;
    let jumpDy = player.vy || 0;
    
    // If not moving, jump in the direction of current target velocity
    if (jumpDx === 0 && jumpDy === 0) {
      jumpDx = player.targetVx || 1; // default right
      jumpDy = player.targetVy || 0;
    }
    
    // Normalize direction
    const magnitude = Math.hypot(jumpDx, jumpDy) || 1;
    jumpDx /= magnitude;
    jumpDy /= magnitude;
    
    // Set jump parameters
    edgarJumping = true;
    edgarJumpTime = 0;
    edgarJumpStartX = player.x;
    edgarJumpStartY = player.y;
    edgarJumpTargetX = player.x + jumpDx * EDGAR_JUMP_DISTANCE;
    edgarJumpTargetY = player.y + jumpDy * EDGAR_JUMP_DISTANCE;
    
    // Clamp target to screen bounds
    const effectiveRadius = player.radius * (activeBuffs.shrink ? 0.7 : 1.0);
    edgarJumpTargetX = Math.min(Math.max(effectiveRadius, edgarJumpTargetX), cw - effectiveRadius);
    edgarJumpTargetY = Math.min(Math.max(effectiveRadius, edgarJumpTargetY), ch - effectiveRadius);
    
    // Give immunity during jump
    player.invulnerable = true;
    player.invulnerableTime = EDGAR_JUMP_DURATION / 1000;
    
    // Visual effect
    createExplosion(player.x, player.y, 12);
  }
  
  function executeFangAbility() {
    // Find all spikes on screen
    const spikes = balls.filter(ball => ball.type === 'spike');
    
    if (spikes.length === 0) {
      // No spikes to chain to, just dash toward enemy
      fangChainTargets = [{ x: enemy.x, y: enemy.y, isEnemy: true }];
    } else {
      // Find closest spike
      let closestSpike = null;
      let closestDistance = Infinity;
      
      spikes.forEach(spike => {
        const distance = Math.hypot(spike.x - player.x, spike.y - player.y);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestSpike = spike;
        }
      });
      
      // Build chain targets: all spikes then enemy
      fangChainTargets = [...spikes.map(spike => ({ x: spike.x, y: spike.y, spike: spike })), 
                         { x: enemy.x, y: enemy.y, isEnemy: true }];
      
      // Sort by distance to create optimal chaining path
      fangChainTargets.sort((a, b) => {
        const distA = Math.hypot(a.x - player.x, a.y - player.y);
        const distB = Math.hypot(b.x - player.x, b.y - player.y);
        return distA - distB;
      });
    }
    
    // Start chaining
    fangChaining = true;
    fangCurrentTarget = 0;
    fangDashTime = 0;
    
    // Give immunity during chain (will be extended after enemy dizzy ends)
    player.invulnerable = true;
    player.invulnerableTime = 10; // Initial immunity during chain
    
    // Start first dash
    startFangDash();
    
    // Visual effect
    createExplosion(player.x, player.y, 15);
  }
  
  function updateEdgarJump(dt) {
    if (!edgarJumping) return;
    
    edgarJumpTime += dt * 1000;
    const progress = Math.min(edgarJumpTime / EDGAR_JUMP_DURATION, 1);
    
    if (progress >= 1) {
      // Jump complete
      edgarJumping = false;
      player.x = edgarJumpTargetX;
      player.y = edgarJumpTargetY;
      
      // Landing particles
      createExplosion(player.x, player.y, 8);
      return;
    }
    
    // Smooth arc interpolation
    const easeProgress = 1 - Math.pow(1 - progress, 3); // ease out cubic
    const arcHeight = 80 * Math.sin(progress * Math.PI); // parabolic arc
    
    player.x = edgarJumpStartX + (edgarJumpTargetX - edgarJumpStartX) * easeProgress;
    player.y = edgarJumpStartY + (edgarJumpTargetY - edgarJumpStartY) * easeProgress - arcHeight;
    
    // Jump trail particles
    if (Math.random() < 0.3) {
      particles.push({
        x: player.x + (Math.random() - 0.5) * player.radius,
        y: player.y + (Math.random() - 0.5) * player.radius,
        vx: (Math.random() - 0.5) * 100,
        vy: (Math.random() - 0.5) * 100 + 50, // slight downward bias
        life: 1.0,
        maxLife: 0.8,
        size: 2 + Math.random() * 3,
        color: '#00ffff' // cyan trail
      });
    }
  }
  
  function updateHankBubble(dt) {
    if (!hankBubble) return;
    
    // Update bubble position
    hankBubble.x += hankBubble.vx * dt;
    hankBubble.y += hankBubble.vy * dt;
    hankBubble.life -= dt * 1000;
    hankBubble.pulse += dt * 6; // pulsing animation
    
    // Remove bubble if expired or off screen
    if (hankBubble.life <= 0 || 
        hankBubble.x < -hankBubble.size || hankBubble.x > cw + hankBubble.size ||
        hankBubble.y < -hankBubble.size || hankBubble.y > ch + hankBubble.size) {
      hankBubble = null;
      return;
    }
    
    // Safety check: ensure balls array exists and has valid length
    if (!balls || balls.length === 0) return;
    
    // Check collision with spikes - use safer iteration
    const ballsToRemove = [];
    for (let i = 0; i < balls.length; i++) {
      const ball = balls[i];
      if (!ball) continue; // Safety check
      
      const dx = ball.x - hankBubble.x;
      const dy = ball.y - hankBubble.y;
      const distance = Math.hypot(dx, dy);
      const collisionRadius = hankBubble.size/2 + (ball.type === 'spike' ? ballRadius/3 : ballRadius);
      
      if (distance < collisionRadius) {
        // Mark ball for removal instead of removing immediately
        ballsToRemove.push(i);
        
        // Absorb the spike/ball
        hankBubble.spikesAbsorbed++;
        
        // Pop particles at absorption point
        for (let p = 0; p < 5; p++) {
          particles.push({
            x: ball.x,
            y: ball.y,
            vx: (Math.random() - 0.5) * 150,
            vy: (Math.random() - 0.5) * 150,
            life: 1.0,
            maxLife: 0.6,
            size: 3,
            color: '#00ffff' // cyan absorption particles
          });
        }
        
        // Bubble gets slightly smaller after absorbing spikes
        hankBubble.size *= 0.95;
        
        // Remove bubble if it absorbed too many spikes
        if (hankBubble.spikesAbsorbed >= 8) {
          createExplosion(hankBubble.x, hankBubble.y, 15);
          hankBubble = null;
          break; // Exit early if bubble is destroyed
        }
      }
    }
    
    // Remove absorbed balls in reverse order to maintain indices
    for (let i = ballsToRemove.length - 1; i >= 0; i--) {
      const index = ballsToRemove[i];
      if (index >= 0 && index < balls.length) {
        balls.splice(index, 1);
      }
    }
  }
  
  function startFangDash() {
    if (fangCurrentTarget >= fangChainTargets.length) {
      // Chain complete
      fangChaining = false;
      return;
    }
    
    const target = fangChainTargets[fangCurrentTarget];
    fangStartX = player.x;
    fangStartY = player.y;
    fangTargetX = target.x;
    fangTargetY = target.y;
    fangDashTime = 0;
  }
  
  function updateFangChain(dt) {
    if (!fangChaining) {
      // Update frozen spikes countdown with safety checks
      if (frozenSpikes && frozenSpikes.length > 0) {
        for (let i = frozenSpikes.length - 1; i >= 0; i--) {
          const frozenSpike = frozenSpikes[i];
          if (!frozenSpike || !frozenSpike.spike) {
            // Remove invalid frozen spike entries
            frozenSpikes.splice(i, 1);
            continue;
          }
          
          frozenSpike.freezeTime -= dt * 1000;
          if (frozenSpike.freezeTime <= 0) {
            // Unfreeze spike
            if (frozenSpike.spike && typeof frozenSpike.originalVx !== 'undefined') {
              frozenSpike.spike.vx = frozenSpike.originalVx;
              frozenSpike.spike.vy = frozenSpike.originalVy;
              if (typeof frozenSpike.originalAngVel !== 'undefined') {
                frozenSpike.spike.angVel = frozenSpike.originalAngVel;
              }
            }
            frozenSpikes.splice(i, 1);
          }
        }
      }
      return;
    }
    
    if (fangCurrentTarget >= fangChainTargets.length) {
      fangChaining = false;
      return;
    }
    
    const target = fangChainTargets[fangCurrentTarget];
    const dashDistance = Math.hypot(fangTargetX - fangStartX, fangTargetY - fangStartY);
    const dashDuration = dashDistance / FANG_DASH_SPEED;
    
    fangDashTime += dt;
    const progress = Math.min(fangDashTime / dashDuration, 1);
    
    if (progress >= 1) {
      // Reached target
      player.x = fangTargetX;
      player.y = fangTargetY;
      
      if (target.spike) {
        // Freeze this spike
        frozenSpikes.push({
          spike: target.spike,
          freezeTime: FANG_FREEZE_DURATION,
          originalVx: target.spike.vx,
          originalVy: target.spike.vy,
          originalAngVel: target.spike.angVel || 0
        });
        
        // Stop spike movement
        target.spike.vx = 0;
        target.spike.vy = 0;
        if (target.spike.angVel) target.spike.angVel = 0;
        
        // Visual effect
        createExplosion(player.x, player.y, 8);
        
        // Lightning particles
        for (let p = 0; p < 10; p++) {
          particles.push({
            x: player.x,
            y: player.y,
            vx: (Math.random() - 0.5) * 200,
            vy: (Math.random() - 0.5) * 200,
            life: 1.0,
            maxLife: 0.4,
            size: 2 + Math.random() * 3,
            color: '#ffff00' // yellow lightning
          });
        }
      } else if (target.isEnemy) {
        // Reached enemy - big explosion
        createExplosion(player.x, player.y, 20);
      }
      
      // Move to next target
      fangCurrentTarget++;
      if (fangCurrentTarget < fangChainTargets.length) {
        startFangDash();
      } else {
        fangChaining = false;
      }
    } else {
      // Update dash position
      const easeProgress = 1 - Math.pow(1 - progress, 2); // ease out quad
      player.x = fangStartX + (fangTargetX - fangStartX) * easeProgress;
      player.y = fangStartY + (fangTargetY - fangStartY) * easeProgress;
      
      // Dash trail particles
      if (Math.random() < 0.5) {
        particles.push({
          x: player.x + (Math.random() - 0.5) * player.radius,
          y: player.y + (Math.random() - 0.5) * player.radius,
          vx: (Math.random() - 0.5) * 50,
          vy: (Math.random() - 0.5) * 50,
          life: 1.0,
          maxLife: 0.6,
          size: 3 + Math.random() * 2,
          color: '#ffff00' // yellow dash trail
        });
      }
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
    
    // Handle ability system
    updateAbilitySystem(dt);
    
    // Update Edgar's jump ability
    updateEdgarJump(dt);
    
    // Update Hank's bubble ability (before ball updates to avoid conflicts)
    updateHankBubble(dt);
    
    // Update Fang's chain ability
    updateFangChain(dt);

    // enemy walks toward its targetX (unless dizzy)
    if (!isEnemyDizzy) {
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
    }

    // ramp difficulty
    if (totalElapsed >= nextHarderAt) {
      spawnInterval = Math.max(minInterval, spawnInterval * 0.9);
      nextHarderAt += 5;
    }

    // spawn timing (pause during enemy dizzy)
    if (!isEnemyDizzy) {
      spawnTimer += dt * 1000;
      while (spawnTimer >= spawnInterval) {
        spawnTimer -= spawnInterval;
        spawnBall();
      }
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

    // update player position (unless Edgar is jumping or Fang is chaining)
    if (!edgarJumping && !fangChaining) {
      const effectiveRadius = player.radius * (activeBuffs.shrink ? 0.7 : 1.0); // shrink hitbox
      player.x = Math.min(
        Math.max(effectiveRadius, player.x + player.vx * currentSpeed * dt),
        cw - effectiveRadius
      );
      player.y = Math.min(
        Math.max(effectiveRadius, player.y + player.vy * currentSpeed * dt),
        ch - effectiveRadius
      );
    }

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

    // spawn dizzy particles around enemy when enemy is dizzy
    if (isEnemyDizzy) {
      if (Math.random() < 0.4) { // 40% chance per frame
        const angle = Math.random() * Math.PI * 2;
        const distance = enemySize/2 + 20 + Math.random() * 15;
        particles.push({
          x: enemy.x + Math.cos(angle) * distance,
          y: enemy.y + Math.sin(angle) * distance - 25,
          vx: Math.cos(angle) * 15,
          vy: -25 - Math.random() * 15, // upward movement
          life: 1.0,
          maxLife: 1.2,
          size: 3 + Math.random() * 2,
          color: '#ff69b4' // pink dizzy stars
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
      const effectiveRadius = player.radius * (activeBuffs.shrink ? 0.7 : 1.0); // shrink hitbox
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
          
          // Reset ability cooldowns
          abilityChargeTime = 0;
          abilityReady = false;
          abilityActive = false;
          isEnemyDizzy = false;
          enemyDizzyTime = 0;
          dizzyPointTimer = 0;
          
          // Reset character-specific ability states
          edgarJumping = false;
          edgarJumpTime = 0;
          hankBubble = null;
          fangChaining = false;
          fangChainTargets = [];
          fangCurrentTarget = 0;
          frozenSpikes = [];
          
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
      ctx.save();
      
      // Add dizzy effect to enemy when dizzy
      if (isEnemyDizzy) {
        // Swaying motion
        const swayTime = performance.now() / 200;
        const swayX = Math.sin(swayTime) * 5;
        const swayY = Math.cos(swayTime * 1.3) * 3;
        
        // Spinning stars around enemy
        const time = performance.now() / 500;
        for (let i = 0; i < 3; i++) {
          const starAngle = (i / 3) * Math.PI * 2 + time;
          const starDistance = enemySize/2 + 25;
          const starX = enemy.x + Math.cos(starAngle) * starDistance;
          const starY = enemy.y + Math.sin(starAngle) * starDistance - 20;
          
          ctx.fillStyle = '#ff69b4';
          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('★', starX, starY);
        }
        
        ctx.translate(swayX, swayY);
      }
      
      ctx.drawImage(
        enemyImage,
        enemy.x - enemySize/2,
        enemy.y - enemySize/2,
        enemySize,
        enemySize
      );
      
      ctx.restore();
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
      
      // Check if this spike is frozen (with safety check)
      const isFrozen = frozenSpikes && frozenSpikes.length > 0 && frozenSpikes.some(frozen => frozen && frozen.spike === b);
      
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rotation);
      
      // Frozen spike effects
      if (isFrozen) {
        // Ice-blue glow
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.arc(0, 0, (size/2) * 1.5, 0, 2 * Math.PI);
        ctx.fill();
        
        // Ice crystals effect
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          const length = (size/2) * 0.8;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
          ctx.stroke();
        }
        
        ctx.globalAlpha = 1.0;
      }
      
      if (ballImage.complete) {
        if (isFrozen) {
          // Tint frozen spikes blue
          ctx.globalCompositeOperation = 'multiply';
          ctx.fillStyle = '#aaffff';
          ctx.fillRect(-half, -half, size, size);
          ctx.globalCompositeOperation = 'source-over';
        }
        ctx.drawImage(ballImage, -half, -half, size, size);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, size/2, 0, 2 * Math.PI);
        ctx.fillStyle = isFrozen ? '#00ffff' : (b.type==='spike' ? 'orange' : 'red');
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

    // draw Hank's bubble
    if (hankBubble) {
      ctx.save();
      
      // Pulsing bubble with transparency
      const pulseFactor = 1 + Math.sin(hankBubble.pulse) * 0.1;
      const bubbleRadius = (hankBubble.size / 2) * pulseFactor;
      const alpha = Math.min(0.6, hankBubble.life / HANK_BUBBLE_DURATION);
      
      // Outer glow
      ctx.globalAlpha = alpha * 0.3;
      ctx.fillStyle = '#00ffff';
      ctx.beginPath();
      ctx.arc(hankBubble.x, hankBubble.y, bubbleRadius * 1.2, 0, 2 * Math.PI);
      ctx.fill();
      
      // Main bubble
      ctx.globalAlpha = alpha * 0.4;
      ctx.fillStyle = '#00ffff';
      ctx.beginPath();
      ctx.arc(hankBubble.x, hankBubble.y, bubbleRadius, 0, 2 * Math.PI);
      ctx.fill();
      
      // Bubble outline
      ctx.globalAlpha = alpha * 0.8;
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(hankBubble.x, hankBubble.y, bubbleRadius, 0, 2 * Math.PI);
      ctx.stroke();
      
      // Bubble highlights (soap bubble effect)
      ctx.globalAlpha = alpha * 0.6;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hankBubble.x - bubbleRadius * 0.3, hankBubble.y - bubbleRadius * 0.3, bubbleRadius * 0.2, 0, 2 * Math.PI);
      ctx.stroke();
      
      ctx.restore();
    }

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
    
    // draw ability charge/cooldown indicator
    const abilityBarY = buffY + 10;
    const abilityBarWidth = 200;
    const abilityBarHeight = 20;
    const abilityBarX = cw - 15 - abilityBarWidth;
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(abilityBarX, abilityBarY, abilityBarWidth, abilityBarHeight);
    
    // Progress bar
    let progress = 0;
    let barColor = '#666666';
    let statusText = '';
    
    if (isEnemyDizzy && selectedCharacter === 'fang') {
      progress = 1 - (enemyDizzyTime / ENEMY_DIZZY_DURATION);
      barColor = '#ff69b4'; // pink for enemy dizzy
      statusText = 'ENEMY DIZZY';
    } else if (abilityReady) {
      progress = 1;
      barColor = '#00ff00'; // green when ready
      statusText = 'READY - SPACE';
    } else {
      const currentAbility = abilities[selectedCharacter];
      const chargeTime = currentAbility ? currentAbility.chargeTime : ABILITY_CHARGE_DURATION;
      progress = abilityChargeTime / chargeTime;
      barColor = '#ffff00'; // yellow while charging
      statusText = 'CHARGING...';
    }
    
    ctx.fillStyle = barColor;
    ctx.fillRect(abilityBarX, abilityBarY, abilityBarWidth * progress, abilityBarHeight);
    
    // Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(abilityBarX, abilityBarY, abilityBarWidth, abilityBarHeight);
    
    // Ability name and status
    const ability = abilities[selectedCharacter];
    if (ability) {
      ctx.font = 'bold 14px Arial, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText(`${ability.name}: ${statusText}`, cw - 15, abilityBarY + abilityBarHeight + 5);
    }

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
