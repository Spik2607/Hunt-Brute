// game.js
import { items, missions, dropRates, getRandomCompanionName, getItemStats } from './gameData.js';
import { expeditionEvents, getRandomExpeditionEvent } from './expedition.js';

let player = null;
let enemy = null;
let currentMission = null;
let currentExpedition = null;
let companion = null;
let socket;
let currentRoom = null;

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
        this.equippedItems = {
            weapon: null,
            armor: null,
            accessory: null
        };
        this.energy = 100;
        this.maxEnergy = 100;
        this.resources = { wood: 0, stone: 0, iron: 0 };
        this.companions = [];
        this.skillPoints = 0;
        this.skills = {
            strength: 0,
            agility: 0,
            intelligence: 0
        };
    }

    levelUp() {
        this.level++;
        this.maxHp += 10;
        this.hp = this.maxHp;
        this.attack += 2;
        this.defense += 1;
        this.experience = this.experience - (this.level - 1) * 100;
        this.energy = this.maxEnergy;
        this.skillPoints += 3;
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

    equipItem(item) {
        if (item.type === 'weapon' || item.type === 'armor' || item.type === 'accessory') {
            const currentEquipped = this.equippedItems[item.type];
            if (currentEquipped) {
                this.inventory.push(currentEquipped);
                this.unequipItem(currentEquipped);
            }
            this.equippedItems[item.type] = item;
            this.applyItemEffects(item);
        }
    }

    unequipItem(item) {
        if (item.type === 'weapon' || item.type === 'armor' || item.type === 'accessory') {
            this.equippedItems[item.type] = null;
            this.removeItemEffects(item);
        }
    }

    applyItemEffects(item) {
        if (item.attack) this.attack += item.attack;
        if (item.defense) this.defense += item.defense;
        if (item.maxHp) {
            this.maxHp += item.maxHp;
            this.hp += item.maxHp;
        }
        // Ajouter d'autres effets selon les propriétés de l'item
    }

    removeItemEffects(item) {
        if (item.attack) this.attack -= item.attack;
        if (item.defense) this.defense -= item.defense;
        if (item.maxHp) {
            this.maxHp -= item.maxHp;
            this.hp = Math.min(this.hp, this.maxHp);
        }
        // Retirer d'autres effets selon les propriétés de l'item
    }

    applySkills() {
        this.attack += this.skills.strength;
        this.defense += Math.floor(this.skills.agility / 2);
        this.maxHp += this.skills.intelligence * 5;
        this.hp = this.maxHp; // Restaure les PV au maximum après l'application des compétences
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
        if (currentExpedition) {
            updateExpedition();
        }
    }, 1000); // Mise à jour toutes les secondes
}

function initializeSocket() {
    socket = io('https://hunt-brute-server.onrender.com');
    socket.on('connect', () => {
        console.log('Connected to server');
    });
    socket.on('roomJoined', ({ roomId, players }) => {
        console.log(`Joined room: ${roomId}`, players);
        currentRoom = roomId;
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
    socket.on('newMessage', displayChatMessage);
    socket.on('challengeReceived', handleChallengeReceived);
    socket.on('battleStart', startMultiplayerBattle);
    socket.on('tradeRequestReceived', handleTradeRequest);
    socket.on('tradeStart', startTradeSession);
    socket.on('itemTraded', handleItemTraded);
}

function setupEventListeners() {
    const listeners = [
        { id: 'start-adventure', event: 'click', handler: () => showGameArea('adventure-menu') },
        { id: 'create-character', event: 'click', handler: createCharacter },
        { id: 'start-mission', event: 'click', handler: chooseMission },
        { id: 'start-expedition', event: 'click', handler: startExpedition },
        { id: 'cancel-expedition', event: 'click', handler: cancelExpedition },
        { id: 'open-shop', event: 'click', handler: openShop },
        { id: 'open-inventory', event: 'click', handler: openInventory },
        { id: 'manage-companions', event: 'click', handler: openCompanionsMenu },
        { id: 'join-fixed-room', event: 'click', handler: () => joinRoom(FIXED_ROOM) },
        { id: 'save-game', event: 'click', handler: saveGame },
        { id: 'load-game', event: 'click', handler: loadGame },
        { id: 'back-to-main', event: 'click', handler: () => showGameArea('main-menu') },
        { id: 'close-inventory', event: 'click', handler: () => showGameArea('main-menu') },
        { id: 'leave-shop', event: 'click', handler: () => showGameArea('main-menu') },
        { id: 'open-multiplayer', event: 'click', handler: startMultiplayerMode },
        { id: 'send-message', event: 'click', handler: sendChatMessage },
        { id: 'challenge-player', event: 'click', handler: challengePlayer },
        { id: 'trade-request', event: 'click', handler: requestTrade }
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
    enemy.name = currentMission.name; // Assurez-vous que le nom de l'ennemi est correctement défini
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

function playerAttack() {
    if (!player || !enemy) return;
    const damage = Math.max(player.attack - enemy.defense, 0);
    enemy.hp -= damage;
    updateBattleLog(`${player.name} inflige ${damage} dégâts à ${enemy.name}.`);
    checkBattleEnd();
}

function playerDefend() {
    player.defending = true;
    updateBattleLog(`${player.name} se met en position défensive.`);
    enemyTurn();
}

function playerUseSpecial() {
    if (!player || !enemy) return;
    const specialDamage = Math.max(player.attack * 1.5 - enemy.defense, 0);
    enemy.hp -= specialDamage;
    updateBattleLog(`${player.name} utilise une attaque spéciale et inflige ${specialDamage} dégâts à ${enemy.name}.`);
    checkBattleEnd();
}

function playerUseItem() {
    // Implémenter la logique pour utiliser un objet en combat
    console.log("Fonction pour utiliser un objet à implémenter");
    // Vous pourriez ouvrir un menu pour choisir un objet à utiliser ici
}

function enemyTurn() {
    if (!player || !enemy) return;
    let damage = Math.max(enemy.attack - player.defense, 0);
    if (player.defending) {
        damage = Math.floor(damage / 2);
        player.defending = false;
    }
    player.hp -= damage;
    updateBattleLog(`${enemy.name} inflige ${damage} dégâts à ${player.name}.`);
    checkBattleEnd();
}

function checkBattleEnd() {
    if (enemy.hp <= 0) {
        endCombat(true);
    } else if (player.hp <= 0) {
        endCombat(false);
    } else {
        updateBattleInfo();
    }
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
    const inventoryArea = document.getElementById('inventory-area');
    if (!inventoryArea) {
        console.error("L'élément 'inventory-area' n'a pas été trouvé");
        return;
    }

    // Créer la structure de l'inventaire
    inventoryArea.innerHTML = `
        <h2>Inventaire</h2>
        <div id="equipped-items">
            <h3>Équipement porté</h3>
            <div id="equipped-weapon"></div>
            <div id="equipped-armor"></div>
            <div id="equipped-accessory"></div>
        </div>
        <div id="inventory-items">
            <h3>Objets en stock</h3>
        </div>
    `;

    // Afficher l'équipement porté
    const equippedWeapon = document.getElementById('equipped-weapon');
    const equippedArmor = document.getElementById('equipped-armor');
    const equippedAccessory = document.getElementById('equipped-accessory');

    if (player.equippedItems.weapon) {
        equippedWeapon.innerHTML = createItemHTML(player.equippedItems.weapon, -1, true);
    } else {
        equippedWeapon.innerHTML = '<p>Aucune arme équipée</p>';
    }

    if (player.equippedItems.armor) {
        equippedArmor.innerHTML = createItemHTML(player.equippedItems.armor, -1, true);
    } else {
        equippedArmor.innerHTML = '<p>Aucune armure équipée</p>';
    }

    if (player.equippedItems.accessory) {
        equippedAccessory.innerHTML = createItemHTML(player.equippedItems.accessory, -1, true);
    } else {
        equippedAccessory.innerHTML = '<p>Aucun accessoire équipé</p>';
    }

    // Afficher les objets en stock
    const inventoryItems = document.getElementById('inventory-items');
    player.inventory.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'inventory-item';
        itemElement.innerHTML = createItemHTML(item, index, false);
        inventoryItems.appendChild(itemElement);
    });

    showGameArea('inventory-area');
    console.log("Inventaire ouvert");
}

function createItemHTML(item, index, isEquipped) {
    const rarityColors = {
        common: '#ffffff',
        uncommon: '#1eff00',
        rare: '#0070dd',
        epic: '#a335ee',
        legendary: '#ff8000'
    };

    const itemColor = rarityColors[item.rarity] || '#ffffff';

    return `
        <div class="item ${isEquipped ? 'equipped-item' : ''}" style="color: ${itemColor}; ${isEquipped ? 'font-weight: bold;' : ''}">
            <span>${item.name}</span>
            <div class="item-stats">${getItemStats(item)}</div>
            ${item.type === 'consumable' 
                ? `<button onclick="window.useItem(${index})">Utiliser</button>`
                : isEquipped
                    ? `<button onclick="window.unequipItem('${item.type}')">Déséquiper</button>`
                    : `<button onclick="window.equipItem(${index})">Équiper</button>`
            }
            ${!isEquipped ? `<button onclick="window.sellItem(${index})">Vendre</button>` : ''}
        </div>
    `;
}

function useItem(index) {
    if (!player || !player.inventory[index]) return;
    const item = player.inventory[index];
    if (item.type === 'consumable') {
        if (item.effect === 'heal') {
            const healAmount = item.value;
            player.hp = Math.min(player.hp + healAmount, player.maxHp);
            updateBattleLog(`Vous utilisez ${item.name} et récupérez ${healAmount} PV.`);
        } else if (item.effect === 'energy') {
            player.energy = Math.min(player.energy + item.value, player.maxEnergy);
            updateBattleLog(`Vous utilisez ${item.name} et récupérez ${item.value} points d'énergie.`);
        }
        player.inventory.splice(index, 1);
        updatePlayerInfo();
        openInventory();
    }
}

function unequipItem(slot) {
    const item = player.equippedItems[slot];
    if (item) {
        player.unequipItem(item);
        player.inventory.push(item);
        updatePlayerInfo();
        openInventory();
    }
}

function equipItem(index) {
    if (!player || !player.inventory[index]) return;
    const item = player.inventory[index];
    if (item.type === 'weapon' || item.type === 'armor' || item.type === 'accessory') {
        player.equipItem(item);
        player.inventory.splice(index, 1);
        updatePlayerInfo();
        openInventory();
        console.log("Objet équipé:", item);
    }
}

function sellItem(index) {
    if (!player || !player.inventory[index]) return;
    const item = player.inventory[index];
    const sellPrice = Math.floor(item.cost * 0.5);
    player.gold += sellPrice;
    player.inventory.splice(index, 1);
    updatePlayerInfo();
    openInventory();
    alert(`Vous avez vendu ${item.name} pour ${sellPrice} or.`);
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
            <button onclick="window.buyItem('${item.id}')">Acheter</button>
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

    // Mise à jour des boutons d'action en combat
    const actionButtons = document.getElementById('action-buttons');
    if (actionButtons) {
        actionButtons.innerHTML = `
            <button onclick="playerAttack()">Attaque normale</button>
            <button onclick="playerDefend()">Se défendre</button>
            <button onclick="playerUseSpecial()">Attaque spéciale</button>
            <button onclick="playerUseItem()">Utiliser un objet</button>
        `;
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

// Fonctions pour le mode multijoueur
function startMultiplayerMode() {
    showGameArea('multiplayer-area');
    console.log("Mode multijoueur activé");
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
        enemy = new Character(opponent.name, opponent.hp, opponent.attack, opponent.defense);
        showGameArea('battle-area');
        updateBattleInfo();
        console.log("Combat multijoueur commencé entre", challengerId, "et", accepterId);
    } else {
        console.error("Impossible de trouver les informations de l'adversaire");
    }
}

function getOpponentInfo(opponentId) {
    // Cette fonction devrait récupérer les informations de l'adversaire depuis le serveur
    // Pour l'instant, nous utiliserons des données factices
    return {
        name: "Adversaire",
        hp: 100,
        attack: 10,
        defense: 5
    };
}

function requestTrade() {
    if (currentRoom) {
        const otherPlayerId = socket.id; // À remplacer par l'ID réel de l'autre joueur
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

function handleItemTraded({ fromId, toId, item }) {
    if (fromId === socket.id) {
        const itemIndex = player.inventory.findIndex(i => i.id === item.id);
        if (itemIndex !== -1) {
            player.inventory.splice(itemIndex, 1);
        }
    } else {
        player.inventory.push(item);
    }
    updateInventoryDisplay();
    updateTradeInterface();
}

function updateTradeInterface() {
    const playerTradeItems = document.getElementById('player-trade-items');
    if (playerTradeItems) {
        playerTradeItems.innerHTML = '';
        player.inventory.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.innerHTML = `
                <span>${item.name}</span>
                <button onclick="offerTradeItem(${index})">Offrir</button>
            `;
            playerTradeItems.appendChild(itemElement);
        });
    }
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

// Initialisation du jeu
document.addEventListener('DOMContentLoaded', () => {
    initGame();
    initializeMultiplayerChat();
    
    // Ajout des gestionnaires d'événements pour la distribution des points de compétence
    document.getElementById('strength-button').addEventListener('click', () => distributeSkillPoint('strength'));
    document.getElementById('agility-button').addEventListener('click', () => distributeSkillPoint('agility'));
    document.getElementById('intelligence-button').addEventListener('click', () => distributeSkillPoint('intelligence'));
    document.getElementById('confirm-level-up').addEventListener('click', confirmLevelUp);
});

// Fonctions pour rendre accessibles globalement
window.useItem = useItem;
window.equipItem = equipItem;
window.sellItem = sellItem;
window.buyItem = buyItem;
window.offerTradeItem = offerTradeItem;
window.playerAttack = playerAttack;
window.playerDefend = playerDefend;
window.playerUseSpecial = playerUseSpecial;
window.playerUseItem = playerUseItem;

console.log("Script game.js chargé");
