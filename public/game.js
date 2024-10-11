// game.js
import { Character, items, missions, dropRates, getRandomCompanion, getRandomItem, enemies } from './gameData.js';
import { expeditionEvents, getRandomExpeditionEvent } from './expedition.js';
import { initializeCombat, playerAttack, playerDefend, playerUseSpecial, updateBattleInfo, updateBattleLog } from './combat.js';

let player = null;
let companion = null;
let currentMission = null;
let currentExpedition = null;
let socket;
let currentRoom = null;

const FIXED_ROOM = 'fixed-room';

class Character {
    constructor(name, hp, attack, defense, energy = 100) {
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
        this.energy = energy;
        this.maxEnergy = energy;
        this.resources = { wood: 0, stone: 0, iron: 0 };
        this.companions = [];
        this.skillPoints = 0;
        this.skills = {
            strength: 0,
            agility: 0,
            intelligence: 0
        };
        this.statusEffects = [];
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

    regenerateEnergy() {
        if (this.energy < this.maxEnergy) {
            this.energy = Math.min(this.energy + 5, this.maxEnergy);
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
    }

    removeItemEffects(item) {
        if (item.attack) this.attack -= item.attack;
        if (item.defense) this.defense -= item.defense;
        if (item.maxHp) {
            this.maxHp -= item.maxHp;
            this.hp = Math.min(this.hp, this.maxHp);
        }
    }

    applySkills() {
        this.attack += this.skills.strength;
        this.defense += Math.floor(this.skills.agility / 2);
        this.maxHp += this.skills.intelligence * 5;
        this.hp = this.maxHp;
    }

    useSkill(skillName, target) {
        const skill = skills[skillName];
        if (!skill || this.energy < skill.energyCost) {
            console.log("Impossible d'utiliser cette compétence");
            return false;
        }
        
        this.energy -= skill.energyCost;
        
        if (skill.type === "offensive") {
            const damage = skill.damage(this);
            target.hp -= damage;
            console.log(`${this.name} utilise ${skill.name} et inflige ${damage} dégâts à ${target.name}`);
        } else if (skill.type === "defensive") {
            skill.effect(this);
            console.log(`${this.name} utilise ${skill.name}`);
        }
        
        return true;
    }

    applyStatusEffect(effectName) {
        const effect = statusEffects[effectName];
        if (effect) {
            this.statusEffects.push({...effect, remainingDuration: effect.duration});
            console.log(`${this.name} subit l'effet ${effect.name}`);
        }
    }

    handleStatusEffects() {
        if (this.statusEffects.length > 0) {
            this.statusEffects.forEach(effect => {
                effect.effect(this);
                effect.remainingDuration--;
            });
            this.statusEffects = this.statusEffects.filter(effect => effect.remainingDuration > 0);
        }
    }

    useItem(itemName) {
        const itemIndex = this.inventory.findIndex(item => item.name === itemName);
        if (itemIndex === -1) {
            console.log("Cet objet n'est pas dans l'inventaire");
            return false;
        }
        
        const item = this.inventory[itemIndex];
        if (itemEffects[item.id]) {
            itemEffects[item.id](this);
            this.inventory.splice(itemIndex, 1);
            return true;
        } else {
            console.log("Cet objet n'a pas d'effet défini");
            return false;
        }
    }
}

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

const statusEffects = {
    burn: {
        name: "Brûlure",
        effect: (character) => { character.hp -= character.maxHp * 0.05; },
        duration: 3
    },
    poison: {
        name: "Poison",
        effect: (character) => { character.hp -= 10; },
        duration: 5
    },
    stun: {
        name: "Étourdissement",
        effect: (character) => { character.canAct = false; },
        duration: 1
    }
};

const itemEffects = {
    healingPotion: (character) => {
        const healAmount = character.maxHp * 0.3;
        character.hp = Math.min(character.hp + healAmount, character.maxHp);
        console.log(`${character.name} se soigne de ${healAmount} PV`);
    },
    energyElixir: (character) => {
        const energyAmount = character.maxEnergy * 0.5;
        character.energy = Math.min(character.energy + energyAmount, character.maxEnergy);
        console.log(`${character.name} récupère ${energyAmount} points d'énergie`);
    },
    strengthBoost: (character) => {
        character.attack *= 1.5;
        console.log(`L'attaque de ${character.name} augmente temporairement`);
    }
};

function initGame() {
    console.log("Initializing game...");
    initializeSocket();
    setupEventListeners();
    showCreateHunterButton();
    setInterval(() => {
        if (player) {
            player.regenerateHP();
            player.regenerateEnergy();
        }
        if (currentExpedition) {
            updateExpedition();
        }
    }, 1000);
}

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

function showCreateHunterButton() {
    const mainMenu = document.getElementById('main-menu');
    const createHunterButton = document.createElement('button');
    createHunterButton.id = 'create-hunter-button';
    createHunterButton.textContent = 'Créer un Hunter';
    createHunterButton.addEventListener('click', showCharacterCreationArea);
    mainMenu.appendChild(createHunterButton);
}

function showCharacterCreationArea() {
    showGameArea('character-creation');
    const createHunterButton = document.getElementById('create-hunter-button');
    if (createHunterButton) {
        createHunterButton.style.display = 'none';
    }
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
    
    const createHunterButton = document.getElementById('create-hunter-button');
    if (createHunterButton) {
        createHunterButton.style.display = 'none';
    }
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

    // Combat event listeners
    document.getElementById('attack-button').addEventListener('click', playerAttack);
    document.getElementById('defend-button').addEventListener('click', playerDefend);
    document.getElementById('special-button').addEventListener('click', playerUseSpecial);
    // L'utilisation d'objets nécessite une logique supplémentaire
    // document.getElementById('use-item-button').addEventListener('click', handleUseItem);
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

    const createHunterButton = document.getElementById('create-hunter-button');
    if (createHunterButton) {
        createHunterButton.style.display = player ? 'none' : 'block';
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
    initializeCombat(player, index, chosenEnemy);
    showGameArea('battle-area');
    console.log("Mission commencée:", currentMission);
}

function selectEnemyForMission(mission) {
    const suitableEnemies = enemies.filter(enemy => 
        enemy.level >= mission.enemyLevel - 1 && 
        enemy.level <= mission.enemyLevel + 1
    );
    
    if (suitableEnemies.length > 0) {
        return suitableEnemies[Math.floor(Math.random() * suitableEnemies.length)];
    } else {
        return enemies[0];
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

    updateEquippedItems();
    updateInventoryItems();

    showGameArea('inventory-area');
    console.log("Inventaire ouvert");
}

function updateEquippedItems() {
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
}

function updateInventoryItems() {
    const inventoryItems = document.getElementById('inventory-items');
    inventoryItems.innerHTML = '';
    player.inventory.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'inventory-item';
        itemElement.innerHTML = createItemHTML(item, index, false);
        inventoryItems.appendChild(itemElement);
    });
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
                ? `<button onclick="useItem(${index})">Utiliser</button>`
                : isEquipped
                    ? `<button onclick="unequipItem('${item.type}')">Déséquiper</button>`
                    : `<button onclick="equipItem(${index})">Équiper</button>`
            }
            ${!isEquipped ? `<button onclick="sellItem(${index})">Vendre</button>` : ''}
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

function unequipItem(type) {
    const item = player.equippedItems[type];
    if (item) {
        player.unequipItem(item);
        player.inventory.push(item);
        updatePlayerInfo();
        openInventory();
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
            <button onclick="buyItem('${item.id}')">Acheter</button>
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
        initializeCombat(player, -1, opponent); // -1 indique un combat multijoueur
        showGameArea('battle-area');
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
        maxHp: 100,
        attack: 10,
        defense: 5
    };
}

function handleOpponentAction(action) {
    // Cette fonction devrait être implémentée dans combat.js
    // et appelée ici pour gérer les actions de l'adversaire en multijoueur
    console.log("Action de l'adversaire:", action);
    // Exemple : updateBattleInfo();
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
        try {
            const gameState = JSON.parse(savedState);
            
            player = new Character(
                gameState.player.name, 
                gameState.player.maxHp, 
                gameState.player.attack, 
                gameState.player.defense,
                gameState.player.energy
            );
            Object.assign(player, gameState.player);
            
            if (gameState.companion) {
                companion = new Character(
                    gameState.companion.name,
                    gameState.companion.maxHp,
                    gameState.companion.attack,
                    gameState.companion.defense,
                    gameState.companion.energy
                );
                Object.assign(companion, gameState.companion);
            } else {
                companion = null;
            }
            
            currentMission = gameState.currentMission;
            currentExpedition = gameState.currentExpedition;
            
            updatePlayerInfo();
            if (currentExpedition) {
                updateExpeditionDisplay();
            }
            
            showGameArea('adventure-menu');
            
            console.log('Partie chargée avec succès:', gameState);
            alert('Partie chargée avec succès !');
        } catch (error) {
            console.error('Erreur lors du chargement de la partie:', error);
            alert('Erreur lors du chargement de la partie. Veuillez réessayer.');
        }
    } else {
        alert('Aucune sauvegarde trouvée.');
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

// Initialisation du jeu
document.addEventListener('DOMContentLoaded', () => {
    initGame();
    
    document.getElementById('strength-button').addEventListener('click', () => distributeSkillPoint('strength'));
    document.getElementById('agility-button').addEventListener('click', () => distributeSkillPoint('agility'));
    document.getElementById('intelligence-button').addEventListener('click', () => distributeSkillPoint('intelligence'));
    document.getElementById('confirm-level-up').addEventListener('click', confirmLevelUp);
});

// Fonctions pour rendre accessibles globalement
window.createCharacter = createCharacter;
window.useItem = useItem;
window.equipItem = equipItem;
window.unequipItem = unequipItem;
window.sellItem = sellItem;
window.buyItem = buyItem;
window.offerTradeItem = offerTradeItem;
window.playerAttack = playerAttack;
window.playerDefend = playerDefend;
window.playerUseSpecial = playerUseSpecial;
window.startMission = startMission;

// Exports pour l'utilisation dans d'autres modules
export {
    player,
    companion,
    currentMission,
    currentExpedition,
    updatePlayerInfo,
    showGameArea,
    updateBattleLog
};

console.log("Script game.js chargé");
