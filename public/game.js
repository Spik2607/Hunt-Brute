// game.js
import { items, missions, dropRates, getRandomCompanionName } from './gameData.js';
import { expeditionEvents, getRandomExpeditionEvent } from './expedition.js';

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
    console.log("Initializing game...");
    initializeSocket();
    setupEventListeners();
    showGameArea('main-menu');
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
    socket.on('opponentAction', handleOpponentAction);
}

function setupEventListeners() {
    const listeners = [
        { id: 'start-adventure', event: 'click', handler: () => showGameArea('adventure-menu') },
        { id: 'create-character', event: 'click', handler: createCharacter },
        { id: 'start-mission', event: 'click', handler: chooseMission },
        { id: 'start-expedition', event: 'click', handler: startExpedition },
        { id: 'attack-button', event: 'click', handler: playerAttack },
        { id: 'open-shop', event: 'click', handler: openShop },
        { id: 'open-inventory', event: 'click', handler: openInventory },
        { id: 'manage-companions', event: 'click', handler: openCompanionsMenu },
        { id: 'join-fixed-room', event: 'click', handler: () => joinRoom(FIXED_ROOM) },
        { id: 'save-game', event: 'click', handler: saveGame },
        { id: 'load-game', event: 'click', handler: loadGame },
        { id: 'back-to-main', event: 'click', handler: () => showGameArea('main-menu') },
        { id: 'close-inventory', event: 'click', handler: () => showGameArea('main-menu') },
        { id: 'leave-shop', event: 'click', handler: () => showGameArea('main-menu') },
        { id: 'open-multiplayer', event: 'click', handler: startMultiplayerMode }
    ];

    listeners.forEach(({ id, event, handler }) => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener(event, handler);
            console.log(`Écouteur ajouté pour ${id}`);
        } else {
            console.warn(`Élément avec l'id '${id}' non trouvé.`);
        }
    });
}

function showGameArea(areaId) {
    console.log(`Tentative d'affichage de la zone: ${areaId}`);
    const areas = document.querySelectorAll('.game-area');
    areas.forEach(area => {
        if (area.id === areaId) {
            area.style.display = 'block';
            console.log(`Zone ${areaId} affichée`);
        } else {
            area.style.display = 'none';
        }
    });
}

function createCharacter() {
    const nameInput = document.getElementById('hero-name');
    if (!nameInput) {
        console.error("L'élément 'hero-name' n'a pas été trouvé");
        return;
    }
    const name = nameInput.value.trim();
    if (!name) {
        alert("Veuillez entrer un nom pour votre personnage.");
        return;
    }
    player = new Character(name, 100, 10, 5);
    updatePlayerInfo();
    showGameArea('adventure-menu');
    console.log("Personnage créé:", player);
}

function chooseMission() {
    if (!player) {
        console.error("Aucun joueur n'est initialisé");
        return;
    }
    const missionList = document.getElementById('mission-list');
    if (!missionList) {
        console.error("L'élément 'mission-list' n'a pas été trouvé");
        return;
    }
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
    console.log("Mission commencée:", currentMission);
}

function startExpedition() {
    if (!player) {
        console.error("Aucun joueur n'est initialisé");
        return;
    }
    if (currentExpedition) {
        alert("Une expédition est déjà en cours !");
        showGameArea('expedition-area');
        return;
    }
    const expedition = expeditionEvents[Math.floor(Math.random() * expeditionEvents.length)];
    currentExpedition = {
        name: expedition.name,
        duration: expedition.duration,
        timeRemaining: expedition.duration,
        events: [...expedition.events],
        rewards: { xp: 0, gold: 0, resources: { wood: 0, stone: 0, iron: 0 } }
    };
    
    updateExpeditionDisplay();
    showGameArea('expedition-area');
    
    const expeditionTimer = setInterval(() => {
        if (!currentExpedition) {
            clearInterval(expeditionTimer);
            return;
        }
        
        currentExpedition.timeRemaining--;
        
        if (currentExpedition.timeRemaining <= 0) {
            clearInterval(expeditionTimer);
            finishExpedition();
        } else if (currentExpedition.events.length > 0 && currentExpedition.timeRemaining % 15 === 0) {
            triggerExpeditionEvent();
        }
        
        updateExpeditionDisplay();
    }, 1000);

    updateAdventureMenu();
    console.log("Expédition commencée:", currentExpedition);
}

function triggerExpeditionEvent() {
    if (!currentExpedition || currentExpedition.events.length === 0) return;

    const event = currentExpedition.events.shift();
    const eventResult = event.trigger(player);

    currentExpedition.rewards.xp += eventResult.xp || 0;
    currentExpedition.rewards.gold += eventResult.gold || 0;
    
    Object.keys(eventResult.resources || {}).forEach(resource => {
        currentExpedition.rewards.resources[resource] += eventResult.resources[resource];
    });

    updateExpeditionLog(eventResult.message);
    console.log("Événement d'expédition déclenché:", event, "Résultat:", eventResult);
}

function finishExpedition() {
    if (!currentExpedition) return;

    player.gainExperience(currentExpedition.rewards.xp);
    player.gold += currentExpedition.rewards.gold;
    
    Object.entries(currentExpedition.rewards.resources).forEach(([resource, amount]) => {
        player.resources[resource] += amount;
    });

    updateExpeditionLog("Expédition terminée ! Récompenses attribuées.");
    updatePlayerInfo();
    
    currentExpedition = null;
    showGameArea('adventure-menu');
    updateAdventureMenu();
    
    console.log("Expédition terminée, récompenses attribuées");
}

function playerAttack() {
    if (!player || !enemy) {
        console.error("Joueur ou ennemi non initialisé");
        return;
    }
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
    console.log("Combat terminé, victoire:", victory);
}

function getRandomItem() {
    return items[Math.floor(Math.random() * items.length)];
}

function getRandomCompanion() {
    const types = ['animal', 'monster', 'slave', 'spirit', 'shinigami'];
    const type = types[Math.floor(Math.random() * types.length)];
    const name = getRandomCompanionName(type);
    return new Companion(name, type, 50, 5, 3);
}

function openInventory() {
    if (!player) {
        console.error("Aucun joueur n'est initialisé");
        return;
    }
    const inventoryItems = document.getElementById('inventory-items');
    if (!inventoryItems) {
        console.error("L'élément 'inventory-items' n'a pas été trouvé");
        return;
    }
    inventoryItems.innerHTML = '';
    player.inventory.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'inventory-item';
        itemElement.innerHTML = `
            <span>${item.name}</span>
            ${item.type === 'consumable' ? 
              `<button onclick="useItem(${index})">Utiliser</button>` :
              `<button onclick="equipItem(${index})">Équiper</button>`}
            <button onclick="sellItem(${index})">Vendre</button>
        `;
        inventoryItems.appendChild(itemElement);
    });
    showGameArea('inventory-area');
    console.log("Inventaire ouvert");
}

function useItem(index) {
    const item = player.inventory[index];
    if (item.type === 'consumable') {
        if (item.effect === 'heal') {
            player.hp = Math.min(player.hp + item.value, player.maxHp);
            updateBattleLog(`Vous utilisez ${item.name} et récupérez ${item.value} PV.`);
        }
        player.inventory.splice(index, 1);
        updatePlayerInfo();
        openInventory();
    }
}

function sellItem(index) {
    const item = player.inventory[index];
    const sellPrice = Math.floor(item.cost * 0.5);
    player.gold += sellPrice;
    player.inventory.splice(index, 1);
    updatePlayerInfo();
    openInventory();
    alert(`Vous avez vendu ${item.name} pour ${sellPrice} or.`);
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
        console.log("Objet équipé:", item);
    }
}

function openShop() {
    console.log("Ouverture de la boutique");
    const shopItems = document.getElementById('shop-items');
    if (!shopItems) {
        console.error("L'élément 'shop-items' n'a pas été trouvé");
        return;
    }
    shopItems.innerHTML = '';
    items.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'shop-item';
        itemElement.innerHTML = `
            <span>${item.name} - ${item.cost} or</span>
            <button onclick="buyItem('${item.id}')" class="buy-button">Acheter</button>
        `;
        shopItems.appendChild(itemElement);
    });
    showGameArea('shop-area');
}

function buyItem(itemId) {
    if (!player) {
        console.error("Player not initialized");
        return;
    }
    const item = items.find(i => i.id === itemId);
    if (!item) {
        console.error("Item not found");
        return;
    }
    if (player.gold >= item.cost) {
        player.gold -= item.cost;
        player.inventory.push(item);
        updatePlayerInfo();
        openShop(); // Rafraîchir la boutique
        alert(`Vous avez acheté ${item.name}`);
    } else {
        alert("Vous n'avez pas assez d'or !");
    }
}

function openCompanionsMenu() {
    if (!player) {
        console.error("Aucun joueur n'est initialisé");
        return;
    }
    const companionsList = document.getElementById('companions-list');
    if (!companionsList) {
        console.error("L'élément 'companions-list' n'a pas été trouvé");
        return;
    }
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
    console.log("Menu des compagnons ouvert");
}

function selectCompanion(index) {
    if (!player || !player.companions[index]) {
        console.error("Joueur non initialisé ou compagnon non trouvé");
        return;
    }
    companion = player.companions[index];
    updateCompanionInfo();
    showGameArea('adventure-menu');
    console.log("Compagnon sélectionné:", companion);
}

function updatePlayerInfo() {
    if (!player) {
        console.error("Aucun joueur n'est initialisé");
        return;
    }
    const playerInfo = document.getElementById('player-info');
    if (!playerInfo) {
        console.error("L'élément 'player-info' n'a pas été trouvé");
        return;
    }
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

    if (playerStats && player) playerStats.innerHTML = `${player.name}: ${player.hp}/${player.maxHp} PV`;
    if (enemyStats && enemy) enemyStats.innerHTML = `${enemy.name}: ${enemy.hp}/${enemy.maxHp} PV`;
    
    if (companionStats) {
        if (companion) {
            companionStats.innerHTML = `${companion.name}: ${companion.hp}/${companion.maxHp} PV`;
            companionStats.style.display = 'block';
        } else {
            companionStats.style.display = 'none';
        }
    }
}

function updateBattleLog(message) {
    const battleLog = document.getElementById('battle-log');
    if (battleLog) {
        battleLog.innerHTML += `<p>${message}</p>`;
        battleLog.scrollTop = battleLog.scrollHeight;
    }
}

function updateExpeditionDisplay() {
    const expeditionInfo = document.getElementById('expedition-info');
    if (expeditionInfo) {
        if (currentExpedition) {
            expeditionInfo.innerHTML = `
                Expédition: ${currentExpedition.name}<br>
                Temps restant: ${Math.floor(currentExpedition.timeRemaining / 60)}:${(currentExpedition.timeRemaining % 60).toString().padStart(2, '0')}
            `;
        } else {
            expeditionInfo.innerHTML = 'Aucune expédition en cours';
        }
    }
}

function updateExpeditionLog(message) {
    const expeditionLog = document.getElementById('expedition-log');
    if (expeditionLog) {
        expeditionLog.innerHTML += `<p>${message}</p>`;
        expeditionLog.scrollTop = expeditionLog.scrollHeight;
    }
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
    console.log(`Tentative de rejoindre la salle: ${roomId}`);
}

function startMultiplayerMode() {
    showGameArea('multiplayer-area');
    console.log("Mode multijoueur activé");
}

function startMultiplayerGame(players) {
    const opponent = players.find(p => p.name !== player.name);
    if (opponent) {
        enemy = new Character(opponent.name, opponent.hp, opponent.attack, opponent.defense);
        showGameArea('multiplayer-battle');
        updateBattleInfo();
        console.log("Partie multijoueur commencée avec:", opponent);
    } else {
        console.error("Adversaire non trouvé dans la liste des joueurs");
    }
}

function handleOpponentAction(action) {
    if (action.type === 'attack') {
        player.hp -= action.damage;
        updateBattleLog(`L'adversaire vous inflige ${action.damage} dégâts.`);
        checkGameOver();
        updateBattleInfo();
    }
    // Gérer d'autres types d'actions si nécessaire
}

function checkGameOver() {
    if (player.hp <= 0) {
        alert("Game Over! Votre personnage est mort.");
        player = null;
        companion = null;
        currentMission = null;
        currentExpedition = null;
        showGameArea('main-menu');
    }
}

function saveGame() {
    if (!player) {
        alert("Aucun personnage à sauvegarder.");
        return;
    }
    const gameState = {
        player: player,
        companion: companion,
        currentMission: currentMission,
        currentExpedition: currentExpedition
    };
    localStorage.setItem('huntBruteGameState', JSON.stringify(gameState));
    alert('Partie sauvegardée avec succès !');
    console.log('Partie sauvegardée:', gameState);
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
        console.log('Partie chargée:', player);
    } else {
        alert('Aucune sauvegarde trouvée.');
    }
}

function updateCompanionInfo() {
    const activeCompanion = document.getElementById('active-companion');
    if (activeCompanion) {
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
    console.log("Compagnon actuel:", companion);
}

// Initialisation du jeu
document.addEventListener('DOMContentLoaded', initGame);

// Sauvegarde automatique
setInterval(saveGame, 300000); // Sauvegarde toutes les 5 minutes

console.log("Script game.js chargé");
