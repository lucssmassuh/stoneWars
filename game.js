const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Function to resize canvas to window size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// Initial resize
resizeCanvas();

// Add resize event listener
window.addEventListener('resize', resizeCanvas);

// Game objects
const leftCastle = {
    x: 0,
    y: 0,
    width: 140,
    height: 150,
    stones: [
        [1,0,1,0,1,0,1],
        [1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1]
    ],
    health: 100
};

const rightCastle = {
    x: 0,
    y: 0,
    width: 140,
    height: 150,
    stones: [
        [1,0,1,0,1,0,1],
        [1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1]
    ],
    health: 100
};

const leftCatapult = {
    x: 0,
    y: 0,
    angle: -45,
    power: 0,
    maxPower: 150,
    charging: false,
    chargeStart: 0
};

const rightCatapult = {
    x: 0,
    y: 0,
    angle: 225,
    power: 0,
    maxPower: 150,
    charging: false,
    chargeStart: 0
};

let projectiles = [];
let currentPlayer = 'left';
let leftScore = 0;
let rightScore = 0;
let canShoot = true;
let currentRound = 1;
let explosions = []; // Array to store active explosions
let fallingStones = []; // Array to store stones that are falling
let muzzleFlashes = []; // Array to store active muzzle flashes

// Function to update positions based on canvas size
function updatePositions() {
    // Update castle positions - placing them closer to the edges
    leftCastle.x = canvas.width * 0.05;
    leftCastle.y = canvas.height * 0.65;
    rightCastle.x = canvas.width * 0.85;
    rightCastle.y = canvas.height * 0.65;

    // Update castle sizes - making them 50% bigger
    const baseSize = Math.min(canvas.width, canvas.height) * 0.22;
    leftCastle.width = baseSize;
    leftCastle.height = baseSize * 1.2;
    rightCastle.width = baseSize;
    rightCastle.height = baseSize * 1.2;

    // Calculate position 9% from the bottom of the screen
    const bottomPosition = canvas.height * 0.91; // Changed from 0.93 to 0.91 for 9% from bottom

    // Update catapult positions - placing them 9% from the bottom
    leftCatapult.x = canvas.width * 0.1;
    leftCatapult.y = bottomPosition;
    rightCatapult.x = canvas.width * 0.9;
    rightCatapult.y = bottomPosition;
}

// Explosion particle class
class ExplosionParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 5;
        this.vy = (Math.random() - 0.5) * 5;
        this.life = 1.0;
        this.size = Math.random() * 5 + 2;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.1; // Gravity
        this.life -= 0.02;
        this.size *= 0.98;
    }

    draw(ctx) {
        ctx.fillStyle = `rgba(128, 128, 128, ${this.life})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Falling stone class
class FallingStone {
    constructor(castle, row, col, targetY) {
        this.castle = castle;
        this.row = row;
        this.col = col;
        this.x = castle.x + col * (castle.width / 7);
        this.y = castle.y + row * (castle.height / 4);
        this.targetY = targetY;
        this.vy = 0; // Initial vertical velocity
        this.gravity = 0.2; // Gravity acceleration
        this.delay = (row - 1) * 200; // Delay based on row position
        this.startTime = Date.now();
        this.exploded = false;
    }

    update() {
        // Check if delay has passed
        if (Date.now() - this.startTime < this.delay) {
            return false; // Still in delay
        }

        if (this.y < this.targetY) {
            this.vy += this.gravity; // Apply gravity
            this.y += this.vy; // Update position based on velocity
            
            // Add a slight horizontal wobble
            this.x += (Math.random() - 0.5) * 0.5;
            
            return false; // Still falling
        }
        return true; // Reached target
    }

    draw(ctx) {
        const stoneWidth = this.castle.width / 7;
        const stoneHeight = this.castle.height / 4;
        
        ctx.fillStyle = '#808080';
        ctx.fillRect(this.x, this.y, stoneWidth, stoneHeight);
        
        ctx.strokeStyle = '#606060';
        ctx.strokeRect(this.x, this.y, stoneWidth, stoneHeight);
    }
}

// Add cloud class
class Cloud {
    constructor(x, y, size) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.speed = 0.2;
    }

    update() {
        this.x += this.speed;
        if (this.x > canvas.width + 100) {
            this.x = -100;
        }
    }

    draw(ctx) {
        ctx.fillStyle = 'white';
        // Draw cloud parts
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.arc(this.x + this.size, this.y - this.size/2, this.size * 0.8, 0, Math.PI * 2);
        ctx.arc(this.x + this.size * 2, this.y, this.size, 0, Math.PI * 2);
        ctx.arc(this.x + this.size, this.y + this.size/2, this.size * 0.8, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Create clouds
const clouds = [
    new Cloud(100, 50, 20),
    new Cloud(300, 80, 25),
    new Cloud(500, 40, 30),
    new Cloud(700, 70, 22)
];

// Draw functions
function drawCastle(castle) {
    const stoneWidth = castle.width / 7;
    const stoneHeight = castle.height / 4;
    
    // Draw stones
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 7; col++) {
            if (castle.stones[row][col]) {
                ctx.fillStyle = '#808080';
                ctx.fillRect(
                    castle.x + col * stoneWidth,
                    castle.y + row * stoneHeight,
                    stoneWidth,
                    stoneHeight
                );
                
                ctx.strokeStyle = '#606060';
                ctx.strokeRect(
                    castle.x + col * stoneWidth,
                    castle.y + row * stoneHeight,
                    stoneWidth,
                    stoneHeight
                );
            }
        }
    }
}

function drawCatapult(catapult) {
    // Draw wheels
    ctx.fillStyle = '#4A4A4A';
    const backWheelRadius = 12;
    const frontWheelRadius = 24;
    const floorY = catapult.y; // Use catapult.y directly as floor level
    const backWheelY = floorY - backWheelRadius;
    const frontWheelY = floorY - frontWheelRadius;
    
    // Determine wheel positions based on which catapult it is
    const isRightCatapult = catapult === rightCatapult;
    const backWheelX = catapult.x + (isRightCatapult ? 10 : -10);
    const frontWheelX = catapult.x + (isRightCatapult ? -10 : 10);
    
    // Back wheel (smaller)
    ctx.beginPath();
    ctx.arc(backWheelX, backWheelY, backWheelRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.stroke();
    
    // Draw back wheel spokes
    ctx.strokeStyle = '#333';
    for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(backWheelX + Math.cos(angle) * backWheelRadius, backWheelY + Math.sin(angle) * backWheelRadius);
        ctx.lineTo(backWheelX - Math.cos(angle) * backWheelRadius, backWheelY - Math.sin(angle) * backWheelRadius);
        ctx.stroke();
    }
    
    // Draw base
    ctx.fillStyle = '#4A4A4A';
    ctx.fillRect(backWheelX - 30, backWheelY - 5, 60, 10);
    
    // Draw cannon body
    ctx.save();
    ctx.translate(backWheelX, backWheelY - 5);
    ctx.rotate(catapult.angle * Math.PI / 180);
    
    // Cannon barrel
    ctx.fillStyle = '#333';
    ctx.fillRect(0, -5, 60, 10);
    
    // Cannon tip
    ctx.fillStyle = '#666';
    ctx.fillRect(60, -7, 15, 14);
    
    ctx.restore();
    
    // Front wheel (larger) - drawn last to appear in front
    ctx.fillStyle = '#4A4A4A';
    ctx.beginPath();
    ctx.arc(frontWheelX, frontWheelY, frontWheelRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.stroke();
    
    // Draw front wheel spokes
    ctx.strokeStyle = '#333';
    for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(frontWheelX + Math.cos(angle) * frontWheelRadius, frontWheelY + Math.sin(angle) * frontWheelRadius);
        ctx.lineTo(frontWheelX - Math.cos(angle) * frontWheelRadius, frontWheelY - Math.sin(angle) * frontWheelRadius);
        ctx.stroke();
    }
    
    // Draw power meter and trajectory prediction only when charging
    if (catapult.charging) {
        // Calculate current power in real-time
        const currentPower = Math.min((Date.now() - catapult.chargeStart) / 10, catapult.maxPower);
        
        // Draw power meter
        ctx.fillStyle = 'red';
        ctx.fillRect(backWheelX - 20, backWheelY - 30, 40, 10);
        ctx.fillStyle = 'green';
        ctx.fillRect(backWheelX - 20, backWheelY - 30, 40 * (currentPower / catapult.maxPower), 10);
        
        // Draw power text
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Power: ${Math.round(currentPower)}`, backWheelX, backWheelY - 35);

        // Draw trajectory prediction
        const angle = catapult.angle * Math.PI / 180;
        const barrelLength = 60;
        const startX = backWheelX + Math.cos(angle) * barrelLength;
        const startY = backWheelY - 5 + Math.sin(angle) * barrelLength;
        const power = currentPower / 5;
        
        // Simulate trajectory for 1 second
        let x = startX;
        let y = startY;
        let vx = Math.cos(angle) * power;
        let vy = Math.sin(angle) * power;
        const gravity = 0.2;
        const screenMiddle = canvas.width / 2;
        const fadeStartDistance = 200;
        const dotSpacing = 20;
        let distanceTraveled = 0;
        
        for (let t = 0; t < 60; t++) { // 60 frames = 1 second
            x += vx;
            y += vy;
            vy += gravity;
            distanceTraveled += Math.sqrt(vx * vx + vy * vy);
            
            // Stop if we hit the ground
            if (y > floorY) break;
            
            // Only draw a dot at specified intervals
            if (distanceTraveled >= dotSpacing) {
                // Calculate opacity based on distance from middle of screen
                let opacity = 1;
                if (currentPlayer === 'left' && x > screenMiddle - fadeStartDistance) {
                    opacity = Math.max(0, 1 - (x - (screenMiddle - fadeStartDistance)) / 150);
                } else if (currentPlayer === 'right' && x < screenMiddle + fadeStartDistance) {
                    opacity = Math.max(0, 1 - ((screenMiddle + fadeStartDistance) - x) / 150);
                }
                
                // Draw dot
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.5})`;
                ctx.fill();
                
                distanceTraveled = 0; // Reset distance counter
            }
        }
    }
}

function drawProjectile(projectile) {
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#000';
    ctx.fill();
}

function calculateCastleHealth(castle) {
    let totalStones = 0;
    let remainingStones = 0;
    
    // Count total stones and remaining stones
    for (let row = 0; row < castle.stones.length; row++) {
        for (let col = 0; col < castle.stones[row].length; col++) {
            if (castle.stones[row][col]) {
                totalStones++;
                remainingStones++;
            }
        }
    }
    
    // Calculate health percentage based on remaining stones
    return totalStones > 0 ? (remainingStones / totalStones) * 100 : 0;
}

function drawScore() {
    ctx.fillStyle = '#00008B';
    ctx.font = `${Math.min(canvas.width, canvas.height) * 0.02}px Arial`;
    ctx.textAlign = 'center';
    
    // Always show round indicator
    ctx.fillText(`Round ${currentRound}`, canvas.width / 2, canvas.height * 0.1);
    
    // Draw left player score and stones
    ctx.fillText(`Player 1: ${leftScore}`, canvas.width * 0.2, canvas.height * 0.1);
    
    // Draw stone indicators for left player
    const stoneSize = Math.min(canvas.width, canvas.height) * 0.008;
    const stoneSpacing = stoneSize * 0.3;
    const startY = canvas.height * 0.12;
    
    // Count total stones for left player
    let totalLeftStones = 0;
    for (let row = 0; row < leftCastle.stones.length; row++) {
        for (let col = 0; col < leftCastle.stones[row].length; col++) {
            if (leftCastle.stones[row][col]) {
                totalLeftStones++;
            }
        }
    }
    
    // Calculate total width of stone indicators
    const totalWidth = (totalLeftStones * stoneSize) + ((totalLeftStones - 1) * stoneSpacing);
    const startX = canvas.width * 0.2 - (totalWidth / 2);
    
    // Draw stones in a single row for left player
    for (let i = 0; i < totalLeftStones; i++) {
        const x = startX + i * (stoneSize + stoneSpacing);
        ctx.fillStyle = '#006400';
        ctx.fillRect(x, startY, stoneSize, stoneSize);
    }
    
    // Draw right player score and stones
    ctx.fillStyle = '#00008B';
    ctx.fillText(`Player 2: ${rightScore}`, canvas.width * 0.8, canvas.height * 0.1);
    
    // Count total stones for right player
    let totalRightStones = 0;
    for (let row = 0; row < rightCastle.stones.length; row++) {
        for (let col = 0; col < rightCastle.stones[row].length; col++) {
            if (rightCastle.stones[row][col]) {
                totalRightStones++;
            }
        }
    }
    
    // Calculate total width of stone indicators
    const totalRightWidth = (totalRightStones * stoneSize) + ((totalRightStones - 1) * stoneSpacing);
    const rightStartX = canvas.width * 0.8 - (totalRightWidth / 2);
    
    // Draw stones in a single row for right player
    for (let i = 0; i < totalRightStones; i++) {
        const x = rightStartX + i * (stoneSize + stoneSpacing);
        ctx.fillStyle = '#006400';
        ctx.fillRect(x, startY, stoneSize, stoneSize);
    }
}

// Physics
function updateProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2; // Gravity

        // Check collision with castles
        const checkCastleCollision = (castle, isLeftCastle) => {
            const stoneWidth = castle.width / 7;
            const stoneHeight = castle.height / 4;
            
            for (let row = 0; row < 4; row++) {
                for (let col = 0; col < 7; col++) {
                    if (castle.stones[row][col]) {
                        const stoneX = castle.x + col * stoneWidth;
                        const stoneY = castle.y + row * stoneHeight;
                        
                        if (p.x > stoneX && p.x < stoneX + stoneWidth &&
                            p.y > stoneY && p.y < stoneY + stoneHeight) {
                            // Create explosion for the hit stone
                            createExplosion(stoneX + stoneWidth/2, stoneY + stoneHeight/2);
                            castle.stones[row][col] = 0;
                            castle.health -= 5;
                            
                            // Check and explode stones above with delay
                            for (let aboveRow = row - 1; aboveRow >= 0; aboveRow--) {
                                if (castle.stones[aboveRow][col]) {
                                    const aboveStoneX = castle.x + col * stoneWidth;
                                    const aboveStoneY = castle.y + aboveRow * stoneHeight;
                                    const targetY = castle.y + row * stoneHeight;
                                    
                                    // Add falling stone
                                    fallingStones.push(new FallingStone(castle, aboveRow, col, targetY));
                                    
                                    // Remove the stone from the castle
                                    castle.stones[aboveRow][col] = 0;
                                    castle.health -= 5;
                                } else {
                                    break; // Stop if we hit an empty space
                                }
                            }
                            
                            return true;
                        }
                    }
                }
            }
            return false;
        };

        // Only check collision with the opponent's castle based on who fired the projectile
        if (p.firedBy === 'left') {
            // Left player's projectile - only check right castle
            if (checkCastleCollision(rightCastle, false)) {
                leftScore += 5;
                projectiles.splice(i, 1);
            }
        } else {
            // Right player's projectile - only check left castle
            if (checkCastleCollision(leftCastle, true)) {
                rightScore += 5;
                projectiles.splice(i, 1);
            }
        }

        // Remove if out of bounds
        if (p.y > canvas.height || p.x < 0 || p.x > canvas.width) {
            projectiles.splice(i, 1);
        }
    }
}

// Update explosions
function updateExplosions() {
    for (let i = explosions.length - 1; i >= 0; i--) {
        explosions[i].update();
        if (explosions[i].life <= 0) {
            explosions.splice(i, 1);
        }
    }
}

// Helper function to create explosion
function createExplosion(x, y) {
    for (let j = 0; j < 15; j++) {
        explosions.push(new ExplosionParticle(x, y));
    }
}

// Update falling stones
function updateFallingStones() {
    for (let i = fallingStones.length - 1; i >= 0; i--) {
        const stone = fallingStones[i];
        if (stone.update()) {
            // Stone has reached its target, create explosion
            const stoneWidth = stone.castle.width / 7;
            const stoneHeight = stone.castle.height / 4;
            createExplosion(stone.x + stoneWidth/2, stone.y + stoneHeight/2);
            fallingStones.splice(i, 1);
        }
    }
}

// Muzzle flash class
class MuzzleFlash {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.life = 1.0;
        this.size = 15;
    }

    update() {
        this.life -= 0.1;
        this.size *= 0.9;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle * Math.PI / 180);
        
        // Draw flash
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
        gradient.addColorStop(0, 'rgba(255, 255, 0, ' + this.life + ')');
        gradient.addColorStop(0.5, 'rgba(255, 165, 0, ' + this.life * 0.7 + ')');
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw smoke
        ctx.fillStyle = 'rgba(100, 100, 100, ' + this.life * 0.5 + ')';
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 0.7, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

// Update muzzle flashes
function updateMuzzleFlashes() {
    for (let i = muzzleFlashes.length - 1; i >= 0; i--) {
        muzzleFlashes[i].update();
        if (muzzleFlashes[i].life <= 0) {
            muzzleFlashes.splice(i, 1);
        }
    }
}

// Update drawMountain function to scale with canvas size
function drawMountain(x, width, height) {
    const gradient = ctx.createLinearGradient(x, canvas.height * 0.6, x + width, canvas.height * 0.6);
    gradient.addColorStop(0, '#90EE90');
    gradient.addColorStop(1, '#98FB98');
    ctx.fillStyle = gradient;
    
    ctx.beginPath();
    ctx.moveTo(x, canvas.height * 0.6);
    ctx.lineTo(x + width/2, canvas.height * 0.6 - height);
    ctx.lineTo(x + width, canvas.height * 0.6);
    ctx.closePath();
    ctx.fill();
    
    // Add snow cap
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.moveTo(x + width/2 - width * 0.1, canvas.height * 0.6 - height + height * 0.15);
    ctx.lineTo(x + width/2, canvas.height * 0.6 - height);
    ctx.lineTo(x + width/2 + width * 0.1, canvas.height * 0.6 - height + height * 0.15);
    ctx.closePath();
    ctx.fill();
}

// Game loop
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Update positions based on current canvas size
    updatePositions();
    
    // Draw sky
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGradient.addColorStop(0, '#87CEEB');
    skyGradient.addColorStop(1, '#1E90FF');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw clouds
    clouds.forEach(cloud => {
        cloud.update();
        cloud.draw(ctx);
    });

    // Draw left mountain
    drawMountain(canvas.width * 0.05, canvas.width * 0.2, canvas.height * 0.25);
    // Draw right mountain
    drawMountain(canvas.width * 0.75, canvas.width * 0.2, canvas.height * 0.25);
    
    // Draw ground layers
    // Brown ground
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, canvas.height * 0.6, canvas.width, canvas.height * 0.4);
    
    // Green grass
    const grassGradient = ctx.createLinearGradient(0, canvas.height * 0.5, 0, canvas.height * 0.6);
    grassGradient.addColorStop(0, '#228B22');
    grassGradient.addColorStop(1, '#006400');
    ctx.fillStyle = grassGradient;
    ctx.fillRect(0, canvas.height * 0.5, canvas.width, canvas.height * 0.1);
    
    drawScore();
    drawCastle(leftCastle);
    drawCastle(rightCastle);
    drawCatapult(leftCatapult);
    drawCatapult(rightCatapult);
    
    updateProjectiles();
    updateExplosions();
    updateFallingStones();
    updateMuzzleFlashes();
    projectiles.forEach(drawProjectile);
    explosions.forEach(particle => particle.draw(ctx));
    fallingStones.forEach(stone => stone.draw(ctx));
    muzzleFlashes.forEach(flash => flash.draw(ctx));
    
    // Check game over
    if (leftCastle.health <= 0 || rightCastle.health <= 0) {
        alert(`Game Over! ${leftCastle.health <= 0 ? 'Player 2' : 'Player 1'} wins!\nFinal Score:\nPlayer 1: ${leftScore}\nPlayer 2: ${rightScore}`);
        location.reload();
    }
    
    requestAnimationFrame(gameLoop);
}

// Controls
document.addEventListener('keydown', (e) => {
    switch(e.key) {
        case 'q':
            if (currentPlayer === 'left') {
                leftCatapult.angle = Math.max(leftCatapult.angle - 5, -85); // Decrease angle (point down)
            }
            break;
        case 'a':
            if (currentPlayer === 'left') {
                leftCatapult.angle = Math.min(leftCatapult.angle + 5, 0); // Increase angle (point up)
            }
            break;
        case 'o':
            if (currentPlayer === 'right') {
                rightCatapult.angle = Math.min(rightCatapult.angle + 5, 265);
            }
            break;
        case 'l':
            if (currentPlayer === 'right') {
                rightCatapult.angle = Math.max(rightCatapult.angle - 5, 180);
            }
            break;
        case ' ':
            const currentCatapult = currentPlayer === 'left' ? leftCatapult : rightCatapult;
            if (!currentCatapult.charging) {
                currentCatapult.charging = true;
                currentCatapult.chargeStart = Date.now();
            }
            break;
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === ' ') {
        const currentCatapult = currentPlayer === 'left' ? leftCatapult : rightCatapult;
        if (currentCatapult.charging) {
            const chargeTime = Date.now() - currentCatapult.chargeStart;
            currentCatapult.power = Math.min(chargeTime / 10, currentCatapult.maxPower);
            currentCatapult.charging = false;
            
            // Calculate position at the tip of the cannon barrel
            const angle = currentCatapult.angle * Math.PI / 180;
            const barrelLength = 60; // Length of the barrel
            const floorY = currentCatapult.y;
            const backWheelRadius = 12;
            const cannonBaseY = floorY - backWheelRadius - 5;
            
            // Calculate the position of the cannon tip
            const flashX = currentCatapult.x + Math.cos(angle) * barrelLength;
            const flashY = cannonBaseY + Math.sin(angle) * barrelLength;
            
            // Create muzzle flash at the tip
            muzzleFlashes.push(new MuzzleFlash(flashX, flashY, currentCatapult.angle));
            
            const power = currentCatapult.power / 5;
            
            // Launch projectile from the tip
            projectiles.push({
                x: flashX,
                y: flashY,
                vx: Math.cos(angle) * power,
                vy: Math.sin(angle) * power,
                firedBy: currentPlayer // Track which player fired the projectile
            });
            
            canShoot = false;
            currentPlayer = currentPlayer === 'left' ? 'right' : 'left';
            currentRound++;
            setTimeout(() => {
                canShoot = true;
            }, 1000);
        }
    }
});

// Start game
gameLoop(); 