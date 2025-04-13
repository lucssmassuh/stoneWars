const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game objects
const leftCastle = {
    x: 50,
    y: 250,
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
    x: 650,
    y: 250,
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
    x: 100, // Positioned on left mountain
    y: 200, // Higher up on the mountain
    angle: 0, // Start pointing straight
    power: 0,
    maxPower: 150,
    charging: false,
    chargeStart: 0
};

const rightCatapult = {
    x: 700, // Positioned on right mountain
    y: 200, // Higher up on the mountain
    angle: 180, // Start pointing straight left
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
    const wheelRadius = 8;
    const wheelY = catapult.y + 5;
    
    // Left wheel
    ctx.beginPath();
    ctx.arc(catapult.x - 15, wheelY, wheelRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.stroke();
    
    // Right wheel
    ctx.beginPath();
    ctx.arc(catapult.x + 15, wheelY, wheelRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.stroke();
    
    // Draw wheel spokes
    ctx.strokeStyle = '#333';
    for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;
        // Left wheel spokes
        ctx.beginPath();
        ctx.moveTo(catapult.x - 15 + Math.cos(angle) * wheelRadius, wheelY + Math.sin(angle) * wheelRadius);
        ctx.lineTo(catapult.x - 15 - Math.cos(angle) * wheelRadius, wheelY - Math.sin(angle) * wheelRadius);
        ctx.stroke();
        
        // Right wheel spokes
        ctx.beginPath();
        ctx.moveTo(catapult.x + 15 + Math.cos(angle) * wheelRadius, wheelY + Math.sin(angle) * wheelRadius);
        ctx.lineTo(catapult.x + 15 - Math.cos(angle) * wheelRadius, wheelY - Math.sin(angle) * wheelRadius);
        ctx.stroke();
    }
    
    // Draw base
    ctx.fillStyle = '#4A4A4A';
    ctx.fillRect(catapult.x - 20, catapult.y - 5, 40, 10);
    
    // Draw cannon body
    ctx.save();
    ctx.translate(catapult.x, catapult.y);
    ctx.rotate(catapult.angle * Math.PI / 180);
    
    // Cannon barrel
    ctx.fillStyle = '#333';
    ctx.fillRect(0, -5, 40, 10);
    
    // Cannon tip
    ctx.fillStyle = '#666';
    ctx.fillRect(40, -7, 10, 14);
    
    ctx.restore();
    
    // Draw power meter only when charging
    if (catapult.charging) {
        // Calculate current power in real-time
        const currentPower = Math.min((Date.now() - catapult.chargeStart) / 10, catapult.maxPower);
        
        ctx.fillStyle = 'red';
        ctx.fillRect(catapult.x - 20, catapult.y - 30, 40, 10);
        ctx.fillStyle = 'green';
        ctx.fillRect(catapult.x - 20, catapult.y - 30, 40 * (currentPower / catapult.maxPower), 10);
        
        // Draw power text
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Power: ${Math.round(currentPower)}`, catapult.x, catapult.y - 35);
    }
}

function drawProjectile(projectile) {
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#000';
    ctx.fill();
}

function drawScore() {
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Round ${currentRound}`, 400, 30);
    
    // Draw left player score and health
    ctx.fillText(`Player 1: ${leftScore}`, 200, 30);
    ctx.fillStyle = 'red';
    ctx.fillRect(150, 40, 100, 10);
    ctx.fillStyle = 'green';
    ctx.fillRect(150, 40, 100 * (leftCastle.health / 100), 10);
    
    // Draw right player score and health
    ctx.fillStyle = 'white';
    ctx.fillText(`Player 2: ${rightScore}`, 600, 30);
    ctx.fillStyle = 'red';
    ctx.fillRect(550, 40, 100, 10);
    ctx.fillStyle = 'green';
    ctx.fillRect(550, 40, 100 * (rightCastle.health / 100), 10);
}

// Physics
function updateProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2; // Gravity

        // Check collision with castles
        const checkCastleCollision = (castle) => {
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

        if (checkCastleCollision(rightCastle)) {
            leftScore += 5;
            projectiles.splice(i, 1);
        } else if (checkCastleCollision(leftCastle)) {
            rightScore += 5;
            projectiles.splice(i, 1);
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

// Game loop
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw sky
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGradient.addColorStop(0, '#87CEEB'); // Light blue
    skyGradient.addColorStop(1, '#1E90FF'); // Darker blue
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw clouds
    clouds.forEach(cloud => {
        cloud.update();
        cloud.draw(ctx);
    });

    // Draw mountains
    function drawMountain(x, width, height) {
        const gradient = ctx.createLinearGradient(x, 300, x + width, 300);
        gradient.addColorStop(0, '#90EE90'); // Light green
        gradient.addColorStop(1, '#98FB98'); // Pale green
        ctx.fillStyle = gradient;
        
        ctx.beginPath();
        ctx.moveTo(x, 300);
        ctx.lineTo(x + width/2, 300 - height);
        ctx.lineTo(x + width, 300);
        ctx.closePath();
        ctx.fill();
        
        // Add snow cap
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.moveTo(x + width/2 - 20, 300 - height + 20);
        ctx.lineTo(x + width/2, 300 - height);
        ctx.lineTo(x + width/2 + 20, 300 - height + 20);
        ctx.closePath();
        ctx.fill();
    }

    // Draw left mountain
    drawMountain(0, 200, 150);
    // Draw right mountain
    drawMountain(600, 200, 150);
    
    // Draw ground layers
    // Brown ground
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, 350, canvas.width, 50);
    
    // Green grass
    const grassGradient = ctx.createLinearGradient(0, 300, 0, 350);
    grassGradient.addColorStop(0, '#228B22'); // Forest green
    grassGradient.addColorStop(1, '#006400'); // Dark green
    ctx.fillStyle = grassGradient;
    ctx.fillRect(0, 300, canvas.width, 50);
    
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
            const barrelLength = 50; // Total length of the barrel (40 + 10 for the tip)
            const flashX = currentCatapult.x + Math.cos(angle) * barrelLength;
            const flashY = currentCatapult.y + Math.sin(angle) * barrelLength;
            
            // Create muzzle flash at the tip
            muzzleFlashes.push(new MuzzleFlash(flashX, flashY, currentCatapult.angle));
            
            const power = currentCatapult.power / 5;
            
            // Launch projectile from the tip
            projectiles.push({
                x: flashX,
                y: flashY,
                vx: Math.cos(angle) * power,
                vy: Math.sin(angle) * power
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