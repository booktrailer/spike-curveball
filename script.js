// script.js

let gameRunning = false;           // ← menu gate
let selectedCharacter = 'hank';    // default character
let gameOverFade = 0;              // fade overlay for smooth transitions

document.addEventListener('DOMContentLoaded', () => {
  /* ——— Character‑select handlers ——— */
  const charH = document.getElementById('characterHank');
  const charE = document.getElementById('characterEdgar');

  charH.addEventListener('click', () => {
    selectedCharacter = 'hank';
    charH.classList.add('selected');
    charE.classList.remove('selected');
  });
  charE.addEventListener('click', () => {
    selectedCharacter = 'edgar';
    charE.classList.add('selected');
    charH.classList.remove('selected');
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
    });
  } else {
    gameRunning       = true;                  // no menu present
    playerImage.src   = selectedCharacter + '.png';
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
    player.targetVx = d.vector?.x  || 0;
    player.targetVy = d.vector?.y ? -d.vector.y : 0;
  })
  .on('end', () => {
    player.targetVx = player.targetVy = 0;
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

    // —— update score & highscore only
    score++;
    
    // Add floating score text
    floatingTexts.push({
      x: enemy.x + (Math.random() - 0.5) * 100,
      y: enemy.y,
      text: '+1',
      life: 1.0,
      vy: -60,
      color: '#00ff00'
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
    const travelDist = cw * 0.245;
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
    
    // scale effect when moving
    const targetScale = Math.hypot(player.vx, player.vy) > 0.1 ? 1.1 : 1.0;
    player.scale += (targetScale - player.scale) * 5.0 * dt;

    // update player position
    player.x = Math.min(
      Math.max(player.radius, player.x + player.vx * player.speed * dt),
      cw - player.radius
    );
    player.y = Math.min(
      Math.max(player.radius, player.y + player.vy * player.speed * dt),
      ch - player.radius
    );

    // update player invulnerability
    if (player.invulnerable) {
      player.invulnerableTime -= dt;
      if (player.invulnerableTime <= 0) {
        player.invulnerable = false;
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
        b.x += b.vx * dt;
        b.y += b.vy * dt;
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
        // rotate for rightward curvature
        const θ = b.angVel * dt,
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
        b.x += b.vx * dt;
        b.y += b.vy * dt;
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

      // collision (only if not invulnerable)
      const dxp = b.x - player.x,
            dyp = b.y - player.y,
            r   = (b.type==='spike' ? ballRadius/3 : ballRadius) + player.radius;
      if (!player.invulnerable && dxp*dxp + dyp*dyp < r*r) {
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

    // draw game over fade
    if (gameOverFade > 0) {
      ctx.fillStyle = `rgba(255, 0, 0, ${gameOverFade * 0.3})`;
      ctx.fillRect(0, 0, cw, ch);
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
});
