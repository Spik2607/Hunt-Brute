// Connexion à Socket.IO
const socket = io('https://hunt-brute-server.onrender.com');

// Classes pour les combattants
class Fighter {
    constructor(name, health = 100, attack = 10, defense = 5) {
        this.name = name;
        this.maxHealth = health;
        this.health = health;
        this.attack = attack;
        this.defense = defense;
    }

    takeDamage(damage) {
        const actualDamage = Math.max(damage - this.defense, 0);
        this.health = Math.max(this.health - actualDamage, 0);
        return actualDamage;
    }

    isDefeated() {
        return this.health <= 0;
    }

    quickAttack() {
        return Math.floor(Math.random() * (this.attack - 2)) + 1;
    }

    powerfulAttack() {
        return Math.floor(Math.random() * (this.attack + 5)) + this.attack / 2;
    }

    defensiveStance() {
        this.defense += 2;
        return 0;
    }
}

let player, enemy;
let roomId = null;

// Éléments du DOM
const createRoomBtn = document.getElementById('create-room');
const joinRoomBtn = document.getElementById('join-room');
const roomIdInput = document.getElementById('room-id');
const gameArea = document.getElementById('game-area');
const waitingArea = document.getElementById('waiting-area');
const battleArea = document.getElementById('battle-area');
const playerStats = document.getElementById('player-stats');
const enemyStats = document.getElementById('enemy-stats');
const attackButtons = document.querySelectorAll('.attack-button');
const battleLog = document.getElementById('battle-log');

// Événements pour la création et la jointure de salles
createRoomBtn.addEventListener('click', () => {
    roomId = roomIdInput.value;
    socket.emit('createRoom', roomId);
});

joinRoomBtn.addEventListener('click', () => {
    roomId = roomIdInput.value;
    socket.emit('joinRoom', roomId);
});

// Gestion des événements Socket.IO
socket.on('roomCreated', (createdRoomId) => {
    console.log(`Salle créée: ${createdRoomId}`);
    gameArea.style.display = 'none';
    waitingArea.style.display = 'block';
});

socket.on('roomJoined', (joinedRoomId) => {
    console.log(`Salle rejointe: ${joinedRoomId}`);
    gameArea.style.display = 'none';
    waitingArea.style.display = 'block';
});

socket.on('roomError', (error) => {
    alert(error);
});

socket.on('gameReady', () => {
    console.log('La partie est prête à commencer');
    waitingArea.style.display = 'none';
    battleArea.style.display = 'block';
    startGame();
});

socket.on('enemyAttack', (attackType) => {
    console.log(`L'ennemi utilise une attaque ${attackType}`);
    let damage;
    switch(attackType) {
        case 'quick':
            damage = enemy.quickAttack();
            break;
        case 'powerful':
            damage = enemy.powerfulAttack();
            break;
        case 'defensive':
            damage = enemy.defensiveStance();
            break;
    }
    const actualDamage = player.takeDamage(damage);
    updateBattleLog(`L'ennemi vous inflige ${actualDamage} dégâts avec une attaque ${attackType}.`);
    updateStats();
    checkGameOver();
});

socket.on('playerDisconnected', () => {
    alert("L'autre joueur s'est déconnecté. La partie est terminée.");
    resetGame();
});

// Fonctions du jeu
function startGame() {
    player = new Fighter("Joueur");
    enemy = new Fighter("Ennemi");
    updateStats();
    enableAttackButtons();
}

function updateStats() {
    playerStats.textContent = `${player.name} - PV: ${player.health}/${player.maxHealth}, ATT: ${player.attack}, DEF: ${player.defense}`;
    enemyStats.textContent = `${enemy.name} - PV: ${enemy.health}/${enemy.maxHealth}, ATT: ${enemy.attack}, DEF: ${enemy.defense}`;
}

function enableAttackButtons() {
    attackButtons.forEach(button => button.disabled = false);
}

function disableAttackButtons() {
    attackButtons.forEach(button => button.disabled = true);
}

function updateBattleLog(message) {
    battleLog.innerHTML += `<p>${message}</p>`;
    battleLog.scrollTop = battleLog.scrollHeight;
}

function checkGameOver() {
    if (player.isDefeated()) {
        updateBattleLog("Vous avez perdu !");
        disableAttackButtons();
    } else if (enemy.isDefeated()) {
        updateBattleLog("Vous avez gagné !");
        disableAttackButtons();
    }
}

function resetGame() {
    gameArea.style.display = 'block';
    waitingArea.style.display = 'none';
    battleArea.style.display = 'none';
    battleLog.innerHTML = '';
    roomIdInput.value = '';
}

// Gestion des attaques
attackButtons.forEach(button => {
    button.addEventListener('click', () => {
        if (player.isDefeated() || enemy.isDefeated()) return;

        let damage, attackType;
        switch(button.id) {
            case 'quick-attack':
                damage = player.quickAttack();
                attackType = 'quick';
                break;
            case 'powerful-attack':
                damage = player.powerfulAttack();
                attackType = 'powerful';
                break;
            case 'defensive-stance':
                damage = player.defensiveStance();
                attackType = 'defensive';
                break;
        }

        const actualDamage = enemy.takeDamage(damage);
        updateBattleLog(`Vous infligez ${actualDamage} dégâts à l'ennemi avec une attaque ${attackType}.`);
        socket.emit('attack', { roomId, attack: attackType });
        updateStats();
        checkGameOver();
    });
});
