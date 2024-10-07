const socket = io('https://hunt-brute-server.onrender.com');

class Character {
    constructor(name, level = 1, hp = 100, attack = 10, defense = 5) {
        this.name = name;
        this.level = level;
        this.maxHp = hp;
        this.hp = hp;
        this.attack = attack;
        this.defense = defense;
        this.experience = 0;
    }

    attackEnemy(enemy) {
        const damage = Math.max(this.attack - enemy.defense, 0);
        enemy.takeDamage(damage);
        return damage;
    }

    takeDamage(damage) {
        this.hp = Math.max(this.hp - damage, 0);
    }

    isDefeated() {
        return this.hp <= 0;
    }

    gainExperience(amount) {
        this.experience += amount;
        if (this.experience >= this.level * 100) {
            this.levelUp();
        }
    }

    levelUp() {
        this.level++;
        this.maxHp += 10;
        this.hp = this.maxHp;
        this.attack += 2;
        this.defense += 1;
        this.experience = 0;
        log(`${this.name} est monté au niveau ${this.level}!`);
    }
}

class Player extends Character {
    constructor(name) {
        super(name);
        this.wins = 0;
    }
}

class NPC extends Character {
    constructor(name, level) {
        super(name, level, level * 50, level * 5, level * 2);
    }
}

let player, enemy;
let gameMode = 'solo';
let roomId = null;

const gameArea = document.getElementById('game-area');
const waitingArea = document.getElementById('waiting-area');
const battleArea = document.getElementById('battle-area');
const createRoomBtn = document.getElementById('create-room');
const joinRoomBtn = document.getElementById('join-room');
const roomIdInput = document.getElementById('room-id');
const attackBtn = document.getElementById('attack-button');
const battleLog = document.getElementById('battle-log');

createRoomBtn.addEventListener('click', () => {
    roomId = roomIdInput.value;
    socket.emit('createRoom', roomId);
});

joinRoomBtn.addEventListener('click', () => {
    roomId = roomIdInput.value;
    socket.emit('joinRoom', roomId);
});

attackBtn.addEventListener('click', playerAttack);

socket.on('roomCreated', (createdRoomId) => {
    console.log(`Salle créée: ${createdRoomId}`);
    gameMode = 'multi';
    gameArea.style.display = 'none';
    waitingArea.style.display = 'block';
});

socket.on('roomJoined', (joinedRoomId) => {
    console.log(`Salle rejointe: ${joinedRoomId}`);
    gameMode = 'multi';
    gameArea.style.display = 'none';
    waitingArea.style.display = 'block';
});

socket.on('roomError', (error) => {
    alert(error);
});

socket.on('gameReady', () => {
    socket.emit('playerReady', roomId);
});

socket.on('startGame', () => {
    initGame();
});

socket.on('enemyAttack', (attackType) => {
    const damage = enemy.attackEnemy(player);
    log(`L'ennemi utilise une attaque ${attackType} et inflige ${damage} dégâts.`);
    updateStats();
    checkGameOver();
});

socket.on('playerDisconnected', () => {
    alert("L'autre joueur s'est déconnecté. La partie est terminée.");
    resetGame();
});

function initGame() {
    player = new Player("Héros");
    if (gameMode === 'solo') {
        generateNewEnemy();
    } else {
        enemy = new Player("Adversaire");
    }
    waitingArea.style.display = 'none';
    battleArea.style.display = 'block';
    updateStats();
}

function generateNewEnemy() {
    const enemyLevel = Math.max(1, player.level - 1 + Math.floor(Math.random() * 3));
    enemy = new NPC(`Ennemi Niv.${enemyLevel}`, enemyLevel);
    log(`Un ${enemy.name} apparaît!`);
    updateStats();
}

function playerAttack() {
    if (player.isDefeated() || enemy.isDefeated()) return;

    const damage = player.attackEnemy(enemy);
    log(`${player.name} inflige ${damage} dégâts à ${enemy.name}`);

    if (gameMode === 'multi') {
        socket.emit('attack', { roomId, attackType: 'normal' });
    } else {
        enemyAttack();
    }

    updateStats();
    checkGameOver();
}

function enemyAttack() {
    const damage = enemy.attackEnemy(player);
    log(`${enemy.name} inflige ${damage} dégâts à ${player.name}`);
    updateStats();
    checkGameOver();
}

function checkGameOver() {
    if (enemy.isDefeated()) {
        log(`Vous avez vaincu ${enemy.name}!`);
        player.wins++;
        player.gainExperience(enemy.level * 20);
        if (gameMode === 'solo') {
            generateNewEnemy();
        } else {
            endGame(true);
        }
    } else if (player.isDefeated()) {
        log("Vous avez été vaincu...");
        endGame(false);
    }
}

function endGame(playerWon) {
    if (gameMode === 'multi') {
        alert(playerWon ? "Vous avez gagné!" : "Vous avez perdu!");
        resetGame();
    }
}

function resetGame() {
    gameMode = 'solo';
    roomId = null;
    gameArea.style.display = 'block';
    waitingArea.style.display = 'none';
    battleArea.style.display = 'none';
    battleLog.innerHTML = '';
}

function updateStats() {
    document.getElementById('player-stats').innerHTML = `
        ${player.name} (Niveau ${player.level})<br>
        PV: ${player.hp}/${player.maxHp}<br>
        ATT: ${player.attack} | DEF: ${player.defense}<br>
        EXP: ${player.experience}/${player.level * 100}<br>
        Victoires: ${player.wins}
    `;
    document.getElementById('enemy-stats').innerHTML = `
        ${enemy.name}<br>
        PV: ${enemy.hp}/${enemy.maxHp}<br>
        ATT: ${enemy.attack} | DEF: ${enemy.defense}
    `;
}

function log(message) {
    battleLog.innerHTML += `<p>${message}</p>`;
    battleLog.scrollTop = battleLog.scrollHeight;
}

// Initialisation du jeu solo
document.getElementById('start-solo').addEventListener('click', () => {
    gameMode = 'solo';
    initGame();
});

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    gameArea.style.display = 'block';
    waitingArea.style.display = 'none';
    battleArea.style.display = 'none';
});
