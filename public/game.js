// game.js
import { items, missions, dropRates } from './gameData.js';
import { expeditionEvents } from './expedition.js';

let player = null;
let enemy = null;
let currentMission = null;
let currentExpedition = null;
let companion = null;
let socket;

const FIXED_ROOM = 'fixed-room';

class Character {
    constructor(name, hp, attack, defense) {
        this.name = name;
        this.level = 1;
        this.maxHp = hp;
        this.hp = hp;
        this.attack = attack;
        this.defense = defense;
        this.experience = 0;
        this.gold = 0;
        this.inventory = [];
        this.equippedItems = [];
        this.energy = 100;
        this.maxEnergy = 100;
        this.resources = { wood: 0, stone: 0, iron: 0 };
        this.companions = [];
    }

    levelUp() {
        this.level++;
        this.maxHp += 10;
        this.hp = this.maxHp;
        this.attack += 2;
        this.defense += 1;
        this.experience = this.experience - (this.level - 1) * 100;
        this.energy = this.maxEnergy;
        showLevelUpModal();
    }

    gainExperience(amount) {
        this.experience += amount;
        while (this.experience >= this.level * 100) {
            this.levelUp();
        }
        updatePlayerInfo();
    }

    die() {
        this.experience = 0;
        this.hp = this.maxHp / 2;
        const lostItems = Math.floor(Math.random() * 3);
        for (let i = 0; i < lostItems; i++) {
            if (this.inventory.length > 0) {
                const index = Math.floor(Math.random() * this.inventory.length);
                this.inventory.splice(index, 1);
            }
        }
        updatePlayerInfo();
        alert("Vous êtes mort ! Vous avez perdu toute votre expérience et quelques objets.");
    }

    regenerateHP() {
        if (this.hp < this.maxHp) {
            this.hp = Math.min(this.hp + 1, this.maxHp);
            updatePlayerInfo();
        }
    }
}

class Companion extends Character {
    constructor(name, type, hp, attack, defense) {
        super(name, hp, attack, defense);
        this.type = type;
    }
}

function initGame() {
    setupEventListeners();
    initializeSocket();
    setInterval(() => {
        if (player) {
            player.regenerateHP();
        }
    }, 300000); // Régénère 1 PV toutes les 5 minutes
}

function initializeSocket() {
    socket = io('https://hunt-brute-server.onrender.com');
    socket.on('connect', () => {
        console.log('Connected to server');
    });
    socket.on('roomJoined', ({ roomId, players }) => {
        console.log(`Joined room: ${roomId}`, players);
        updateWaitingAreaDisplay(players);
    });
    socket.on('playerJoined', (players) => {
        console.log('Players in room:', players);
        updateWaitingAreaDisplay(players);
    });
    socket.on('gameReady', (players) => {
        console.log('Game is ready to start');
        startMultiplayerGame(players);
    });
    socket.on('opponentAction', (action) => {
        handleOpponentAction(action);
    });
}

function setupEventListeners() {
    document.getElementById('create-character').addEventListener('click', createCharacter);
    document.getElementById('start-mission').addEventListener('click', chooseMission);
    document.getElementById('start-expedition').addEventListener('click', startExpedition);
    document.getElementById('attack-button').addEventListener('click', playerAttack);
    document.getElementById('open-inventory').addEventListener('click', openInventory);
    document.getElementById('manage-companions').addEventListener('click', openCompanionsMenu);
    document.getElementById('join-fixed-room').addEventListener('click', () => joinRoom(FIXED_ROOM));
    // Add more event listeners as needed
}

function createCharacter() {
    const name = document.getElementById('hero-name').value.trim();
    if (!name) {
        alert("Veuillez entrer un nom pour votre personnage.");
        return;
    }
    player = new Character(name, 100, 10, 5);
    updatePlayerInfo();
    showGameArea('adventure-menu');
}

function chooseMission() {
    const missionList = document.getElementById('mission-list');
    missionList.innerHTML = '';
    missions.forEach((mission, index) => {
        const missionButton = document.createElement('button');
        missionButton.textContent = `${mission.name} (Niveau ${mission.enemyLevel})`;
        missionButton.onclick = () => startMission(index);
        missionList.appendChild(missionButton);
    });
    showGameArea('mission-choice');
}

function startMission(index) {
    currentMission = missions[index];
    enemy = new Character(currentMission.name, currentMission.enemyLevel * 50, currentMission.enemyLevel * 5, currentMission.enemyLevel * 2);
    showGameArea('battle-area');
    updateBattleInfo();
}

function startExpedition() {
    if (currentExpedition) {
        alert("Une expédition est déjà en cours !");
        return;
    }
    const expedition = expeditionEvents[Math.floor(Math.random() * expeditionEvents.length)];
    currentExpedition = {
        name: expedition.name,
        duration: expedition.duration,
        timeRemaining: expedition.duration,
        events: [...expedition.events],
        rewards: { xp: 0, gold: 0, resources: {} }
    };
    updateExpeditionDisplay();
    const expeditionTimer = setInterval(() => {
        currentExpedition.timeRemaining--;
        if (currentExpedition.timeRemaining <= 0) {
            clearInterval(expeditionTimer);
            finishExpedition();
        } else if (currentExpedition.events.length > 0 && currentExpedition.timeRemaining % 15 === 0) {
            triggerExpeditionEvent();
        }
        updateExpeditionDisplay();
    }, 1000);
}

function triggerExpeditionEvent() {
    const event = currentExpedition.events.shift();
    // Handle event logic and update rewards
    updateExpeditionLog(event.description);
}

function finishExpedition() {
    player.gainExperience(currentExpedition.rewards.xp);
    player.gold += currentExpedition.rewards.gold;
    Object.entries(currentExpedition.rewards.resources).forEach(([resource, amount]) => {
        player.resources[resource] += amount;
    });
    updateExpeditionLog("Expédition terminée !");
    currentExpedition = null;
    updatePlayerInfo();
    showGameArea('adventure-menu');
}

function playerAttack() {
    if (!player || !enemy) return;
    const damage = Math.max(player.attack - enemy.defense, 0);
    enemy.hp -= damage;
    updateBattleLog(`${player.name} inflige ${damage} dégâts à ${enemy.name}.`);
    if (enemy.hp <= 0) {
        endCombat(true);
    } else {
        enemyAttack();
    }
    if (companion) {
        companionAttack();
    }
    updateBattleInfo();
}

function enemyAttack() {
    if (!player || !enemy) return;
    const damage = Math.max(enemy.attack - player.defense, 0);
    player.hp -= damage;
    updateBattleLog(`${enemy.name} inflige ${damage} dégâts à ${player.name}.`);
    if (player.hp <= 0) {
        endCombat(false);
    }
    updateBattleInfo();
}

function companionAttack() {
    if (!companion || !enemy) return;
    const damage = Math.max(companion.attack - enemy.defense, 0);
    enemy.hp -= damage;
    updateBattleLog(`${companion.name} inflige ${damage} dégâts à ${enemy.name}.`);
    if (enemy.hp <= 0) {
        endCombat(true);
    }
    updateBattleInfo();
}

function endCombat(victory) {
    if (victory) {
        player.gainExperience(enemy.level * 10);
        player.gold += enemy.level * 5;
        const droppedItem = getRandomItem();
        if (droppedItem) {
            player.inventory.push(droppedItem);
            updateBattleLog(`Vous avez obtenu : ${droppedItem.name}`);
        }
        if (Math.random() < 0.1) {
            const newCompanion = getRandomCompanion();
            player.companions.push(newCompanion);
            updateBattleLog(`Vous avez obtenu un nouveau compagnon : ${newCompanion.name}`);
        }
    } else {
        player.die();
    }
    enemy = null;
    updatePlayerInfo();
    showGameArea('adventure-menu');
}

function getRandomItem() {
    return items[Math.floor(Math.random() * items.length)];
}

function getRandomCompanion() {
    const types = ['animal', 'monster', 'slave', 'spirit', 'shinigami'];
    const type = types[Math.floor(Math.random() * types.length)];
    const name = `Companion${Math.floor(Math.random() * 1000)}`;
    return new Companion(name, type, 50, 5, 3);
}

function openInventory() {
    const inventoryItems = document.getElementById('inventory-items');
    inventoryItems.innerHTML = '';
    player.inventory.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.textContent = item.name;
        const equipButton = document.createElement('button');
        equipButton.textContent = 'Équiper';
        equipButton.onclick = () => equipItem(index);
        itemElement.appendChild(equipButton);
        inventoryItems.appendChild(itemElement);
    });
    showGameArea('inventory-area');
}

function equipItem(index) {
    const item = player.inventory[index];
    if (item.type === 'weapon' || item.type === 'armor') {
        const currentEquipped = player.equippedItems.find(i => i.type === item.type);
        if (currentEquipped) {
            player.inventory.push(currentEquipped);
            player.equippedItems = player.equippedItems.filter(i => i.type !== item.type);
        }
        player.equippedItems.push(item);
        player.inventory.splice(index, 1);
        updatePlayerInfo();
        openInventory();
    }
}

function openCompanionsMenu() {
    const companionsList = document.getElementById('companions-list');
    companionsList.innerHTML = '';
    player.companions.forEach((comp, index) => {
        const compElement = document.createElement('div');
        compElement.textContent = `${comp.name} (${comp.type})`;
        const selectButton = document.createElement('button');
        selectButton.textContent = 'Sélectionner';
        selectButton.onclick = () => selectCompanion(index);
        compElement.appendChild(selectButton);
        companionsList.appendChild(compElement);
    });
    showGameArea('companions-area');
}

function selectCompanion(index) {
    companion = player.companions[index];
    updateCompanionInfo();
    showGameArea('adventure-menu');
}

function updatePlayerInfo() {
    const playerInfo = document.getElementById('player-info');
    playerInfo.innerHTML = `
        ${player.name} - Niveau ${player.level}<br>
        PV: ${player.hp}/${player.maxHp}<br>
        XP: ${player.experience}/${player.level * 100}<br>
        Or: ${player.gold}<br>
        Ressources: Bois ${player.resources.wood}, Pierre ${player.resources.stone}, Fer ${player.resources.iron}
    `;
}

function updateBattleInfo() {
    const playerStats = document.getElementById('player-stats');
    const enemyStats = document.getElementById('enemy-stats');
    const companionStats = document.getElementById('companion-stats');

    playerStats.innerHTML = `${player.name}: ${player.hp}/${player.maxHp} PV`;
    enemyStats.innerHTML = `${enemy.name}: ${enemy.hp}/${enemy.maxHp} PV`;
    
    if (companion) {
        companionStats.innerHTML = `${companion.name}: ${companion.hp}/${companion.maxHp} PV`;
        companionStats.style.display = 'block';
    } else {
        companionStats.style.display = 'none';
    }
}

function updateBattleLog(message) {
    const battleLog = document.getElementById('battle-log');
    battleLog.innerHTML += `<p>${message}</p>`;
    battleLog.scrollTop = battleLog.scrollHeight;
}

function updateExpeditionDisplay() {
    const expeditionInfo = document.getElementById('expedition-info');
    if (currentExpedition) {
        expeditionInfo.innerHTML = `
            Expédition: ${currentExpedition.name}<br>
            Temps restant: ${Math.floor(currentExpedition.timeRemaining / 60)}:${(currentExpedition.timeRemaining % 60).toString().padStart(2, '0')}
        `;
    } else {
        expeditionInfo.innerHTML = 'Aucune expédition en cours';
    }
}

function updateExpeditionLog(message) {
    const expeditionLog = document.getElementById('expedition-log');
    expeditionLog.innerHTML += `<p>${message}</p>`;
    expeditionLog.scrollTop = expeditionLog.scrollHeight;
}

function showGameArea(areaId) {
    document.querySelectorAll('.game-area').forEach(area => area.style.display = 'none');
    document.getElementById(areaId).style.display = 'block';
}

function joinRoom(roomId) {
    if (!player) {
        alert("Veuillez d'abord créer un personnage.");
        return;
    }
    const playerInfo = {
        name: player.name,
        level: player.level,
        hp: player.hp,
        attack: player.attack,
        defense: player.defense
    };
    socket.emit('joinRoom', { roomId, playerInfo });
}

function startMultiplayerGame(players) {
    const opponent = players.find(p => p.name !== player.name);
    enemy = new Character(opponent.name, opponent.hp, opponent.attack, opponent.defense);
    showGameArea('multiplayer-battle');
    updateBattleInfo();
}

function handleOpponentAction(action) {
    if (action.type === 'attack') {
        player.hp -= action.damage;
        updateBattleLog(`${enemy.name} vous inflige ${action.damage} dégâts.`);
        if (player.hp <= 0) {
            endCombat(false);
        } else {
            updateBattleInfo();
        }
    }
}

function showLevelUpModal() {
    const modal = document.getElementById('level-up-modal');
    const newLevelSpan = document.getElementById('new-level');
    newLevelSpan.textContent = player.level;
    modal.style.display = 'block';
}

document.getElementById('confirm-level-up').addEventListener('click', () => {
    document.getElementById('level-up-modal').style.display = 'none';
    updatePlayerInfo();
});

function updateWaitingAreaDisplay(players) {
    const waitingArea = document.getElementById('waiting-area');
    waitingArea.innerHTML = '<h3>Joueurs dans la salle :</h3>';
    players.forEach(p => {
        waitingArea.innerHTML += `<p>${p.name} (Niveau ${p.level})</p>`;
    });
}

function saveGame() {
    const gameState = {
        player: player,
        companion: companion,
        currentMission: currentMission,
        currentExpedition: currentExpedition
    };
    localStorage.setItem('huntBruteGameState', JSON.stringify(gameState));
    alert('Partie sauvegardée avec succès !');
}

function loadGame() {
    const savedState = localStorage.getItem('huntBruteGameState');
    if (savedState) {
        const gameState = JSON.parse(savedState);
        player = new Character(
            gameState.player.name, 
            gameState.player.maxHp, 
            gameState.player.attack, 
            gameState.player.defense
        );
        Object.assign(player, gameState.player);
        
        if (gameState.companion) {
            companion = new Companion(
                gameState.companion.name,
                gameState.companion.type,
                gameState.companion.maxHp,
                gameState.companion.attack,
                gameState.companion.defense
            );
            Object.assign(companion, gameState.companion);
        }
        
        currentMission = gameState.currentMission;
        currentExpedition = gameState.currentExpedition;
        
        updatePlayerInfo();
        if (currentExpedition) {
            updateExpeditionDisplay();
        }
        showGameArea('adventure-menu');
        alert('Partie chargée avec succès !');
    } else {
        alert('Aucune sauvegarde trouvée.');
    }
}

function useItem(itemIndex) {
    const item = player.inventory[itemIndex];
    if (item.type === 'consumable') {
        if (item.effect === 'heal') {
            player.hp = Math.min(player.hp + item.value, player.maxHp);
            updateBattleLog(`Vous utilisez ${item.name} et récupérez ${item.value} PV.`);
        } else if (item.effect === 'energy') {
            player.energy = Math.min(player.energy + item.value, player.maxEnergy);
            updateBattleLog(`Vous utilisez ${item.name} et récupérez ${item.value} points d'énergie.`);
        }
        player.inventory.splice(itemIndex, 1);
        updatePlayerInfo();
        openInventory();
    }
}

function startRaid() {
    // Implement raid logic here
    alert("Fonctionnalité de raid pas encore implémentée.");
}

function updateCompanionInfo() {
    const activeCompanion = document.getElementById('active-companion');
    if (companion) {
        activeCompanion.innerHTML = `
            Compagnon actif : ${companion.name} (${companion.type})<br>
            PV : ${companion.hp}/${companion.maxHp}<br>
            Attaque : ${companion.attack} | Défense : ${companion.defense}
        `;
    } else {
        activeCompanion.innerHTML = 'Aucun compagnon actif';
    }
}

function toggleCompanion() {
    if (companion) {
        player.companions.push(companion);
        companion = null;
    } else if (player.companions.length > 0) {
        companion = player.companions.shift();
    }
    updateCompanionInfo();
    updatePlayerInfo();
}

document.getElementById('toggle-companion').addEventListener('click', toggleCompanion);

function checkGameOver() {
    if (player.hp <= 0) {
        alert("Game Over! Votre personnage est mort.");
        // Reset game state or return to main menu
        player = null;
        companion = null;
        currentMission = null;
        currentExpedition = null;
        showGameArea('main-menu');
    }
}

setInterval(checkGameOver, 1000); // Check every second

// Multiplayer functions
function sendPlayerAction(action) {
    socket.emit('playerAction', { roomId: FIXED_ROOM, action: action });
}

function handleOpponentAction(action) {
    if (action.type === 'attack') {
        player.hp -= action.damage;
        updateBattleLog(`L'adversaire vous inflige ${action.damage} dégâts.`);
        checkGameOver();
        updateBattleInfo();
    }
    // Handle other action types as needed
}

// Initialize the game
document.addEventListener('DOMContentLoaded', initGame);

// Automatic saving
setInterval(saveGame, 300000); // Save every 5 minutes
