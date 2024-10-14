// game.js
import { Character, items, missions, dropRates, getRandomCompanion, getRandomItem, enemies, getItemStats } from './gameData.js';
import { expeditionEvents, getRandomExpeditionEvent } from './expedition.js';
import { initializeCombat, playerAttack, playerDefend, playerUseSpecial, updateBattleInfo, updateBattleLog, isCombatActive } from './combat.js';
import { generateUniqueEnemy, generateDonjonReward, generateDonjonEvent, generateDonjonBoss, generateBossReward } from './donjon.js';

let player = null;
let companion = null;
let currentMission = null;
let currentExpedition = null;
let currentDonjon = null;
let socket;
let currentRoom = null;

const FIXED_ROOM = 'fixed-room';

const skills = {
    fireballSpell: {
        name: "Boule de feu",
        type: "offensive",
        energyCost: 30,
        damage: (player) => player.skills.intelligence * 2,
        description: "Lance une boule de feu sur l'ennemi"
    },
    powerStrike: {
        name: "Frappe puissante",
        type: "offensive",
        energyCost: 25,
        damage: (player) => player.skills.strength * 1.5,
        description: "Une attaque physique puissante"
    },
    magicBarrier: {
        name: "Barrière magique",
        type: "defensive",
        energyCost: 40,
        effect: (player) => { player.defense += player.skills.intelligence; },
        duration: 3,
        description: "Crée une barrière magique qui augmente la défense"
    },
    quickReflexes: {
        name: "Réflexes rapides",
        type: "defensive",
        energyCost: 20,
        effect: (player) => { player.evasion = 0.3; },
        duration: 2,
        description: "Augmente temporairement les chances d'esquiver les attaques"
    }
};

function initGame() {
    console.log("Initialisation du jeu...");
    hideAllGameAreas();
    showGameArea('main-menu');
    initializeSocket();
    setupEventListeners();
    
    const savedState = localStorage.getItem('huntBruteGameState');
    if (savedState) {
        try {
            const gameState = JSON.parse(savedState);
            loadGame(gameState);
            console.log("Partie chargée avec succès");
        } catch (error) {
            console.error("Erreur lors du chargement de la sauvegarde:", error);
            showCreateHunterButton();
        }
    } else {
        showCreateHunterButton();
    }

    setInterval(() => {
        if (player && !isCombatActive()) {
            player.regenerateHP();
            player.regenerateEnergy();
            updatePlayerInfo();
        }
        if (currentExpedition) {
            updateExpedition();
        }
    }, 1000);

    window.addEventListener('combatEnd', handleCombatEnd);

    // Rendre les fonctions d'inventaire globalement accessibles
    window.inventoryModule = {
        equipItem,
        unequipItem,
        useItem,
        updateInventoryDisplay,
        updateEquippedItemsDisplay,
        openShop,
        buyItem,
        sellItem,
        sellUniqueItem,
        addItemToInventory
    };

    console.log("Initialisation du jeu terminée");
}

function hideAllGameAreas() {
    const gameAreas = document.querySelectorAll('.game-area');
    gameAreas.forEach(area => {
        area.style.display = 'none';
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

function showCreateHunterButton() {
    const mainMenu = document.getElementById('main-menu');
    if (!mainMenu.querySelector('#create-hunter-button')) {
        const createHunterButton = document.createElement('button');
        createHunterButton.id = 'create-hunter-button';
        createHunterButton.textContent = 'Créer un Hunter';
        createHunterButton.addEventListener('click', showCharacterCreationArea);
        mainMenu.appendChild(createHunterButton);
    }
    showGameArea('main-menu');
}

function showCharacterCreationArea() {
    showGameArea('character-creation');
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
    console.log("Nouveau personnage créé:", player);
    updatePlayerInfo();
    updateInventoryDisplay(player);
    updateEquippedItemsDisplay(player);
    showGameArea('adventure-menu');
}

function openShop() {
    console.log("Tentative d'ouverture de la boutique");
    console.log("État actuel du joueur:", player);
    if (player) {
        const shopElement = document.getElementById('shop-items');
        if (!shopElement) return;

        shopElement.innerHTML = '';
        items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'shop-item';
            itemElement.innerHTML = `
                <span>${item.name} - ${item.cost} or</span>
                <button onclick="window.inventoryModule.buyItem('${item.id}')">Acheter</button>
            `;
            itemElement.title = getItemStats(item);
            shopElement.appendChild(itemElement);
        });

        showGameArea('shop-area');
    } else {
        console.error("Aucun joueur n'est initialisé");
        showGameMessage("Veuillez d'abord créer un personnage.");
    }
}

function equipItem(index) {
    if (player && player.inventory[index]) {
        const item = player.inventory[index];
        player.equip(item);
        updatePlayerInfo();
        updateInventoryDisplay(player);
        updateEquippedItemsDisplay(player);
    }
}

function unequipItem(type) {
    if (player) {
        player.unequip(type);
        updatePlayerInfo();
        updateInventoryDisplay(player);
        updateEquippedItemsDisplay(player);
    }
}

function useItem(index) {
    if (player && player.inventory[index]) {
        const item = player.inventory[index];
        player.useItem(item);
        updatePlayerInfo();
        updateInventoryDisplay(player);
    }
}

function buyItem(itemId) {
    const item = items.find(i => i.id === itemId);
    if (player && item && player.gold >= item.cost) {
        player.gold -= item.cost;
        player.inventory.push(item);
        updatePlayerInfo();
        updateInventoryDisplay(player);
        showGameMessage(`${player.name} a acheté ${item.name}`);
    } else {
        showGameMessage("Vous n'avez pas assez d'or !");
    }
}

function sellItem(index) {
    if (player && player.inventory[index]) {
        const item = player.inventory[index];
        const sellPrice = Math.floor(item.cost * 0.5);
        player.gold += sellPrice;
        player.inventory.splice(index, 1);
        updatePlayerInfo();
        updateInventoryDisplay(player);
        showGameMessage(`${player.name} a vendu ${item.name} pour ${sellPrice} or`);
    }
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
        Énergie: ${player.energy}/${player.maxEnergy}<br>
        Attaque: ${player.attack} | Défense: ${player.defense}<br>
        Ressources: Bois ${player.resources.wood}, Pierre ${player.resources.stone}, Fer ${player.resources.iron}
    `;
    updateInventoryDisplay(player);
    updateEquippedItemsDisplay(player);
}

function updateInventoryDisplay(player) {
    if (!player || !Array.isArray(player.inventory)) {
        console.error("Mise à jour de l'inventaire impossible : joueur invalide ou inventaire non défini");
        return;
    }
    const inventoryElement = document.getElementById('inventory-items');
    if (!inventoryElement) return;

    inventoryElement.innerHTML = '';
    player.inventory.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'inventory-item';
        itemElement.innerHTML = `
            <span>${item.name}</span>
            ${item.type === 'weapon' || item.type === 'armor' || item.type === 'accessory' 
                ? `<button onclick="window.inventoryModule.equipItem(${index})">Équiper</button>`
                : ''}
            ${item.type === 'consumable'
                ? `<button onclick="window.inventoryModule.useItem(${index})">Utiliser</button>`
                : ''}
            <button onclick="window.inventoryModule.sellItem(${index})">Vendre</button>
        `;
        itemElement.title = getItemStats(item);
        inventoryElement.appendChild(itemElement);
    });
}

function updateEquippedItemsDisplay(player) {
    if (!player || !player.equippedItems) {
        console.error("Mise à jour des objets équipés impossible : joueur invalide");
        return;
    }
    const equippedItemsElement = document.getElementById('equipped-items');
    if (!equippedItemsElement) return;

    equippedItemsElement.innerHTML = `
        <div>
            Arme: ${player.equippedItems.weapon ? player.equippedItems.weapon.name : 'Aucune'}
            ${player.equippedItems.weapon ? `<button onclick="window.inventoryModule.unequipItem('weapon')">Déséquiper</button>` : ''}
        </div>
        <div>
            Armure: ${player.equippedItems.armor ? player.equippedItems.armor.name : 'Aucune'}
            ${player.equippedItems.armor ? `<button onclick="window.inventoryModule.unequipItem('armor')">Déséquiper</button>` : ''}
        </div>
        <div>
            Accessoire: ${player.equippedItems.accessory ? player.equippedItems.accessory.name : 'Aucun'}
            ${player.equippedItems.accessory ? `<button onclick="window.inventoryModule.unequipItem('accessory')">Déséquiper</button>` : ''}
        </div>
    `;
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
        const missionElement = document.createElement('div');
        missionElement.className = 'mission-item';
        missionElement.innerHTML = `
            <h3>${mission.name}</h3>
            <p>Niveau ennemi : ${mission.enemyLevel}</p>
            <p>Difficulté : ${mission.difficulty}</p>
            <p>Récompenses : ${mission.goldReward} or, ${mission.expReward} XP</p>
            <button onclick="startMission(${index})">Commencer la mission</button>
        `;
        missionList.appendChild(missionElement);
    });
    showGameArea('mission-choice');
}

function startMission(index) {
    currentMission = missions[index];
    const chosenEnemy = selectEnemyForMission(currentMission);
    initializeCombat(player, companion, chosenEnemy);
    showGameArea('battle-area');
    console.log("Mission commencée:", currentMission);
}

function selectEnemyForMission(mission) {
    const suitableEnemies = enemies.filter(enemy => 
        enemy.level >= mission.enemyLevel - 1 && 
        enemy.level <= mission.enemyLevel + 1
    );
    
    if (suitableEnemies.length > 0) {
        const selectedEnemy = { ...suitableEnemies[Math.floor(Math.random() * suitableEnemies.length)] };
        selectedEnemy.name = mission.enemy;
        return selectedEnemy;
    } else {
        return { ...enemies[0], name: mission.enemy };
    }
}

function handleCombatEnd(event) {
    const { victory } = event.detail;
    if (victory) {
        showGameArea('adventure-menu');
    } else {
        showGameArea('main-menu');
    }
    updatePlayerInfo();
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
    const expedition = getRandomExpeditionEvent();
    currentExpedition = {
        name: expedition.name,
        duration: expedition.duration,
        timeRemaining: expedition.duration,
        events: [...expedition.events],
        rewards: { xp: 0, gold: 0, resources: { wood: 0, stone: 0, iron: 0 } }
    };
    
    updateExpeditionDisplay();
    showGameArea('expedition-area');

    function startDonjon() {
    if (!player) {
        console.error("Aucun joueur n'est initialisé");
        return;
    }
    currentDonjon = {
        floor: 1,
        events: []
    };
    generateDonjonFloor();
    updateDonjonInfo();
    showGameArea('donjon-area');
    console.log("Donjon commencé");
}

function generateDonjonFloor() {
    currentDonjon.events = [];
    for (let i = 0; i < 5; i++) {
        currentDonjon.events.push(generateDonjonEvent(currentDonjon.floor));
    }
}

function updateDonjonInfo() {
    const donjonInfo = document.getElementById('donjon-info');
    if (donjonInfo) {
        donjonInfo.innerHTML = `
            <h3>Étage ${currentDonjon.floor}</h3>
            <p>Événements restants : ${currentDonjon.events.length}</p>
        `;
    }
}

function nextDonjonEvent() {
    if (!currentDonjon || currentDonjon.events.length === 0) {
        console.log("Fin de l'étage du donjon");
        currentDonjon.floor++;
        generateDonjonFloor();
        updateDonjonInfo();
        return;
    }

    const event = currentDonjon.events.shift();
    handleDonjonEvent(event);
}

function handleDonjonEvent(event) {
    const eventArea = document.getElementById('donjon-events');
    if (!eventArea) return;

    switch (event.type) {
        case 'combat':
            eventArea.innerHTML = `<p>Vous rencontrez un ${event.enemy.name} !</p>`;
            initializeCombat(player, companion, event.enemy);
            showGameArea('battle-area');
            break;
        case 'treasure':
            const reward = event.reward;
            player.gold += reward.gold;
            player.gainExperience(reward.exp);
            inventoryModule.addItemToInventory(player, reward.item);
            eventArea.innerHTML = `
                <p>Vous avez trouvé un trésor !</p>
                <p>Or : ${reward.gold}</p>
                <p>Expérience : ${reward.exp}</p>
                <p>Objet : ${reward.item.name}</p>
            `;
            updatePlayerInfo();
            break;
        case 'trap':
            player.hp -= event.damage;
            eventArea.innerHTML = `<p>Vous êtes tombé dans un piège ! Vous perdez ${event.damage} PV.</p>`;
            updatePlayerInfo();
            break;
        case 'rest':
            player.hp = Math.min(player.hp + event.healAmount, player.maxHp);
            eventArea.innerHTML = `<p>Vous trouvez un endroit sûr pour vous reposer. Vous récupérez ${event.healAmount} PV.</p>`;
            updatePlayerInfo();
            break;
    }
}

function exitDonjon() {
    currentDonjon = null;
    showGameArea('adventure-menu');
    console.log("Sortie du donjon");
}

function openInventory() {
    console.log("Tentative d'ouverture de l'inventaire");
    if (player) {
        updateInventoryDisplay(player);
        updateEquippedItemsDisplay(player);
        showGameArea('inventory-area');
    } else {
        console.error("Aucun joueur n'est initialisé");
        showGameMessage("Veuillez d'abord créer un personnage.");
    }
}

function distributeSkillPoint(skill) {
    if (player.skillPoints > 0) {
        player.skills[skill]++;
        player.skillPoints--;
        document.getElementById(`${skill}-skill`).textContent = player.skills[skill];
        document.getElementById('skill-points').textContent = player.skillPoints;
    }
    if (player.skillPoints === 0) {
        document.getElementById('confirm-level-up').disabled = false;
    }
}

function confirmLevelUp() {
    player.applySkills();
    document.getElementById('level-up-modal').style.display = 'none';
    updatePlayerInfo();
}

function showLevelUpModal() {
    const modal = document.getElementById('level-up-modal');
    const newLevelSpan = document.getElementById('new-level');
    const skillPointsSpan = document.getElementById('skill-points');
    if (modal && newLevelSpan && skillPointsSpan) {
        newLevelSpan.textContent = player.level;
        skillPointsSpan.textContent = player.skillPoints;
        modal.style.display = 'block';
        document.getElementById('strength-skill').textContent = player.skills.strength;
        document.getElementById('agility-skill').textContent = player.skills.agility;
        document.getElementById('intelligence-skill').textContent = player.skills.intelligence;
    }
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
    const expedition = getRandomExpeditionEvent();
    currentExpedition = {
        name: expedition.name,
        duration: expedition.duration,
        timeRemaining: expedition.duration,
        events: [...expedition.events],
        rewards: { xp: 0, gold: 0, resources: { wood: 0, stone: 0, iron: 0 } }
    };
    
    updateExpeditionDisplay();
    showGameArea('expedition-area');
    updateAdventureMenu();
    console.log("Expédition commencée:", currentExpedition);
}

function cancelExpedition() {
    if (!currentExpedition) {
        alert("Il n'y a pas d'expédition en cours à annuler.");
        return;
    }
    
    currentExpedition = null;
    updateExpeditionDisplay();
    showGameArea('adventure-menu');
    updateAdventureMenu();
    console.log("Expédition annulée");
}

function updateExpedition() {
    if (!currentExpedition) return;

    currentExpedition.timeRemaining--;

    if (currentExpedition.timeRemaining <= 0) {
        finishExpedition();
    } else if (currentExpedition.events.length > 0 && currentExpedition.timeRemaining % 15 === 0) {
        triggerExpeditionEvent();
    }

    updateExpeditionDisplay();
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

function updateExpeditionDisplay() {
    const expeditionInfo = document.getElementById('expedition-info');
    if (expeditionInfo && currentExpedition) {
        const minutes = Math.floor(currentExpedition.timeRemaining / 60);
        const seconds = currentExpedition.timeRemaining % 60;
        expeditionInfo.innerHTML = `
            Expédition: ${currentExpedition.name}<br>
            Temps restant: ${minutes}:${seconds.toString().padStart(2, '0')}
        `;
    }
}

function updateExpeditionLog(message) {
    const expeditionLog = document.getElementById('expedition-log');
    if (expeditionLog) {
        expeditionLog.innerHTML += `<p>${message}</p>`;
        expeditionLog.scrollTop = expeditionLog.scrollHeight;
    }
}

function updateAdventureMenu() {
    const currentExpeditionDiv = document.getElementById('current-expedition');
    if (currentExpeditionDiv) {
        if (currentExpedition) {
            const minutes = Math.floor(currentExpedition.timeRemaining / 60);
            const seconds = currentExpedition.timeRemaining % 60;
            currentExpeditionDiv.innerHTML = `
                <p>Expédition en cours : ${currentExpedition.name}</p>
                <p>Temps restant : ${minutes}:${seconds.toString().padStart(2, '0')}</p>
            `;
        } else {
            currentExpeditionDiv.innerHTML = '';
        }
    }
}

// Configuration du socket pour le mode multijoueur
let socket;

function initializeSocket() {
    socket = io();

    socket.on('connect', () => {
        console.log('Connecté au serveur');
    });

    socket.on('roomJoined', ({ roomId, players, messages }) => {
        currentRoom = roomId;
        updateWaitingAreaDisplay(players);
        messages.forEach(displayChatMessage);
    });

    socket.on('playerJoined', (players) => {
        updateWaitingAreaDisplay(players);
    });

    socket.on('gameReady', (players) => {
        console.log('La partie peut commencer', players);
    });

    socket.on('roomError', (message) => {
        alert(message);
    });

    socket.on('newMessage', (message) => {
        displayChatMessage(message);
    });

    socket.on('challengeReceived', handleChallengeReceived);

    socket.on('battleStart', startMultiplayerBattle);

    socket.on('opponentAction', handleOpponentAction);

    socket.on('tradeRequestReceived', handleTradeRequest);

    socket.on('tradeStart', startTradeSession);

    socket.on('itemOffered', ({ fromId, itemId }) => {
        console.log(`Joueur ${fromId} offre l'objet ${itemId}`);
    });

    socket.on('tradeConfirmed', ({ playerId }) => {
        console.log(`Échange confirmé par le joueur ${playerId}`);
    });

    socket.on('tradeCancelled', ({ playerId }) => {
        console.log(`Échange annulé par le joueur ${playerId}`);
        closeTradeInterface();
    });

    socket.on('playerLeft', (playerId) => {
        console.log(`Le joueur ${playerId} a quitté la salle`);
    });

    socket.on('disconnect', () => {
        console.log('Déconnecté du serveur');
    });
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

function updateWaitingAreaDisplay(players) {
    const waitingArea = document.getElementById('waiting-area');
    if (waitingArea) {
        waitingArea.innerHTML = '<h3>Joueurs dans la salle :</h3>';
        players.forEach(player => {
            waitingArea.innerHTML += `<p>${player.name} (Niveau ${player.level})</p>`;
        });
    }
}

function sendChatMessage() {
    const chatInput = document.getElementById('chat-input');
    const message = chatInput.value.trim();
    if (message && currentRoom) {
        socket.emit('chatMessage', { roomId: currentRoom, message: { sender: player.name, text: message } });
        chatInput.value = '';
    }
}

function displayChatMessage(message) {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        chatMessages.innerHTML += `<p><strong>${message.sender}:</strong> ${message.text}</p>`;
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

function challengePlayer() {
    if (currentRoom) {
        socket.emit('initiateChallenge', { roomId: currentRoom, challengerId: socket.id });
    }
}

function handleChallengeReceived({ challengerId }) {
    if (challengerId !== socket.id) {
        const accept = confirm("Vous avez été défié ! Acceptez-vous le combat ?");
        if (accept) {
            socket.emit('acceptChallenge', { roomId: currentRoom, challengerId, accepterId: socket.id });
        }
    }
}

function startMultiplayerBattle({ challengerId, accepterId }) {
    const opponent = getOpponentInfo(challengerId === socket.id ? accepterId : challengerId);
    if (opponent) {
        initializeCombat(player, companion, opponent);
        showGameArea('battle-area');
        console.log("Combat multijoueur commencé entre", challengerId, "et", accepterId);
    } else {
        console.error("Impossible de trouver les informations de l'adversaire");
    }
}

function handleOpponentAction(action) {
    // Implémenter la logique pour gérer l'action de l'adversaire
    console.log("Action de l'adversaire:", action);
}

function requestTrade() {
    if (currentRoom) {
        const otherPlayerId = getOtherPlayerId(); // Implémenter cette fonction
        socket.emit('initiateTradeRequest', { roomId: currentRoom, fromId: socket.id, toId: otherPlayerId });
    }
}

function handleTradeRequest({ fromId, toId }) {
    if (toId === socket.id) {
        const accept = confirm("Vous avez reçu une demande d'échange. Acceptez-vous ?");
        if (accept) {
            socket.emit('acceptTradeRequest', { roomId: currentRoom, fromId, toId });
        }
    }
}

function startTradeSession({ fromId, toId }) {
    console.log("Session d'échange démarrée entre", fromId, "et", toId);
    showTradeInterface();
}

function showTradeInterface() {
    const tradeInterface = document.createElement('div');
    tradeInterface.id = 'trade-interface';
    tradeInterface.innerHTML = `
        <h3>Échange d'objets</h3>
        <div id="player-trade-items"></div>
        <div id="opponent-trade-items"></div>
        <button id="confirm-trade">Confirmer l'échange</button>
        <button id="cancel-trade">Annuler l'échange</button>
    `;
    document.body.appendChild(tradeInterface);

    const playerTradeItems = document.getElementById('player-trade-items');
    player.inventory.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.innerHTML = `
            <span>${item.name}</span>
            <button onclick="offerTradeItem(${index})">Offrir</button>
        `;
        playerTradeItems.appendChild(itemElement);
    });

    document.getElementById('confirm-trade').addEventListener('click', confirmTrade);
    document.getElementById('cancel-trade').addEventListener('click', cancelTrade);
}

function offerTradeItem(index) {
    const item = player.inventory[index];
    socket.emit('offerTradeItem', { roomId: currentRoom, itemId: item.id });
}

function confirmTrade() {
    socket.emit('confirmTrade', { roomId: currentRoom });
    closeTradeInterface();
}

function cancelTrade() {
    socket.emit('cancelTrade', { roomId: currentRoom });
    closeTradeInterface();
}

function closeTradeInterface() {
    const tradeInterface = document.getElementById('trade-interface');
    if (tradeInterface) {
        tradeInterface.remove();
    }
}

// Initialisation du jeu
document.addEventListener('DOMContentLoaded', initGame);

// Exports
export {
    player,
    distributeSkillPoint,
    confirmLevelUp,
    showLevelUpModal
    companion,
    currentMission,
    currentExpedition,
    updatePlayerInfo,
    showGameArea,
    skills,
    initGame,
    chooseMission,
    startExpedition,
    cancelExpedition,
    startDonjon,
    nextDonjonEvent,
    exitDonjon,
    openCompanionsMenu,
    startMultiplayerMode,
    joinRoom,
    challengePlayer,
    requestTrade,
    showGameMessage,
    openInventory,
    equipItem,
    unequipItem,
    useItem,
    buyItem,
    sellItem,
};

// Rendre les fonctions accessibles globalement
window.player = player;
window.distributeSkillPoint = distributeSkillPoint;
window.confirmLevelUp = confirmLevelUp;
window.showLevelUpModal = showLevelUpModal;
window.updatePlayerInfo = updatePlayerInfo;
window.showGameMessage = showGameMessage;
window.showGameArea = showGameArea;
window.openInventory = openInventory;
window.equipItem = equipItem;
window.unequipItem = unequipItem;
window.useItem = useItem;
window.buyItem = buyItem;
window.sellItem = sellItem;
window.openShop = openShop;
window.startMission = startMission;
window.startExpedition = startExpedition;
window.cancelExpedition = cancelExpedition;
window.joinRoom = joinRoom;
window.sendChatMessage = sendChatMessage;
window.challengePlayer = challengePlayer;
window.requestTrade = requestTrade;
window.offerTradeItem = offerTradeItem;
window.confirmTrade = confirmTrade;
window.cancelTrade = cancelTrade;

console.log("Script game.js chargé");
