// script.js
let gameRunning = false;           // ← menu gate
let selectedCharacter = 'hank';    // default character

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
  const menu     = document.getElementById('menu');
  const startBtn = document.getElementById('startGame');
  const playerImage = new Image();

  if (startBtn) {
    startBtn.addEventListener('click', () => {
      menu.style.display    = 'none';
      playerImage.src       = selectedCharacter + '.png';
      gameRunning           = true;
      lastTime              = performance.now();  // reset timer
    });
  } else {
    gameRunning       = true;                    // no menu present
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

  function resize() {
    cw   = canvas.width  = window.innerWidth;
    ch   = canvas.height = window.innerHeight;
    diag = Math.hypot(cw, ch);
  }
  window.addEventListener('resize', resize);
  resize();

  // ——— Background image setup ———
  const bgImage = new Image();
  bgImage.src   = 'background.png';  // your 1:1 image

  // ——— Player setup ———
  const spriteSize = 85;
  const player = {
    x: cw/2,
    y: ch/2,
    radius: spriteSize/2,
    speed: 250,
    vx: 0,
    vy: 0
  };

  // ——— Ball image setup ———
  const ballImage  = new Image();
  ballImage.src    = 'ball.png';
  const ballSize   = 70;
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
    player.vx = d.vector?.x  || 0;
    player.vy = d.vector?.y ? -d.vector.y : 0;
  })
  .on('end', () => {
    player.vx = player.vy = 0;
  });

  // ——— Ball & Spike logic ———
  const balls = [];
  let score = 0;

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

  // spawn a normal ball from top, at player.x ±0.2*cw
  function spawnBall() {
    const x = player.x + (Math.random()*2 - 1) * 0.2 * cw;
    const y = 0;
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
      speed
    });
    score++;
  }

  // spawn spikes curving right, ending at 30% of screen width
  function spawnSpikes(ax, ay, parentSpeed) {
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
        angVel:         spikeAngVel
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

    // update player
    player.x = Math.min(
      Math.max(player.radius, player.x + player.vx * player.speed * dt),
      cw - player.radius
    );
    player.y = Math.min(
      Math.max(player.radius, player.y + player.vy * player.speed * dt),
      ch - player.radius
    );

    // update balls & spikes
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i];
      if (b.type === 'normal') {
        // explode after traveling 65% screen height
        const traveled = Math.hypot(b.x - b.spawnX, b.y - b.spawnY);
        if (traveled >= ch * 0.65) {
          spawnSpikes(b.x, b.y, b.speed);
          balls.splice(i, 1);
          continue;
        }
        b.x += b.vx * dt;
        b.y += b.vy * dt;
      } else {
        // rotate for rightward curvature
        const θ = b.angVel * dt,
              c = Math.cos(θ), s = Math.sin(θ);
        const nx = b.vx * c - b.vy * s,
              ny = b.vx * s + b.vy * c;
        b.vx = nx; b.vy = ny;

        const d = Math.hypot(b.x - b.originX, b.y - b.originY);
        if (d >= b.travelDistance) {
          balls.splice(i, 1);
          continue;
        }
        b.x += b.vx * dt;
        b.y += b.vy * dt;
      }

      // collision
      const dxp = b.x - player.x,
            dyp = b.y - player.y,
            r   = (b.type==='spike' ? ballRadius/3 : ballRadius) + player.radius;
      if (dxp*dxp + dyp*dyp < r*r) {
        score = 0;
        spawnInterval = initialSpawnInterval;
        spawnTimer    = 0;
        totalElapsed  = 0;
        nextHarderAt  = 5;
        balls.splice(i, 1);
        gameRunning = false;
        menu.style.display = 'flex';
      }
    }

    // draw background (width expanded, cropping top & bottom)
    if (bgImage.complete) {
      const iw = bgImage.naturalWidth,
            ih = bgImage.naturalHeight;
      const scaledH = cw * (ih / iw);
      const yOff = (ch - scaledH) / 2;
      ctx.drawImage(bgImage, -cw*0.1, yOff*1.2, cw*1.2, scaledH*1.2);
    } else {
      ctx.clearRect(0, 0, cw, ch);
    }

    // draw player
    if (playerImage.complete) {
      ctx.drawImage(
        playerImage,
        player.x - spriteSize/2,
        player.y - spriteSize/2,
        spriteSize,
        spriteSize
      );
    } else {
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#3498db';
      ctx.fill();
    }

    // draw balls & spikes
    balls.forEach(b => {
      const size = b.type==='spike' ? ballSize/3 : ballSize,
            half = size/2;
      if (ballImage.complete) {
        ctx.drawImage(ballImage, b.x - half, b.y - half, size, size);
      } else {
        ctx.beginPath();
        ctx.arc(b.x, b.y, size/2, 0, 2 * Math.PI);
        ctx.fillStyle = b.type==='spike' ? 'orange' : 'red';
        ctx.fill();
      }
    });

    // draw score
    ctx.fillStyle = '#000';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Score: ${score}`, 10, 10);

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
});
