// game.js
import { Character, items, missions, getAvailableBuildings, getAvailableMissions, createEnemyForMission, calculateDamage, generateRandomLoot, getRandomCompanion, generateDonjonEvent, generateDonjonBoss, generateBossReward, initializeLairBuildingSystem } from './gameData.js';
import * as inventoryModule from './inventory.js';
import { initializeCombat, updateBattleInfo, playerAttack, playerDefend, playerUseSpecial, isCombatActive } from './combat.js';
import { updatePlayerInfo, showGameMessage, showGameArea, formatTime, updateConstructionProgress } from './utilities.js';

let player;
let companion;
let currentRoom;
let socket;
let currentMission;
let currentDonjonLevel;
let regenerationInterval;

function initializePlayer(name) {
    return new Character(name, 100, 10, 5, 100);
}

function updatePlayerStats(player) {
    player.attack = player.baseAttack;
    player.defense = player.baseDefense;
    player.maxHp = player.baseMaxHp;

    for (const slot in player.equippedItems) {
        const item = player.equippedItems[slot];
        if (item) {
            if (item.attack) player.attack += item.attack;
            if (item.defense) player.defense += item.defense;
            if (item.maxHp) player.maxHp += item.maxHp;
        }
    }

    player.hp = Math.min(player.hp, player.maxHp);
    updatePlayerInfo(player);
}

function startRegeneration() {
    regenerationInterval = setInterval(() => {
        if (player) {
            player.hp = Math.min(player.hp + 1, player.maxHp);
            if (player.energy !== undefined) {
                player.energy = Math.min(player.energy + 2, player.maxEnergy);
            }
            updatePlayerInfo(player);
        }
    }, 5000);
}

function stopRegeneration() {
    clearInterval(regenerationInterval);
}

function initializeGame() {
    console.log("Initialisation du jeu...");
    initializeSocket();
    loadCharacter();
    initializePlayer();
    startRegeneration();
    initializeLairBuildingSystem();
    console.log("Initialisation du jeu terminée");
}

function initializeSocket() {
    console.log("Initialisation de Socket.IO...");
    try {
        socket = io();

        if (!socket) {
            console.error("Échec de l'initialisation de Socket.IO");
            return;
        }

        socket.on('connect', () => {
            console.log('Connecté au serveur');
            initializeAdditionalFeatures();
        });

        // ... Autres gestionnaires d'événements socket ...

        socket.on('disconnect', () => {
            console.log('Déconnecté du serveur');
            showGameMessage("Vous avez été déconnecté du serveur.");
        });

    } catch (error) {
        console.error("Erreur lors de l'initialisation de Socket.IO:", error);
    }
}

function loadCharacter() {
    console.log("Chargement du personnage...");
    const savedCharacter = localStorage.getItem('playerCharacter');
    if (savedCharacter) {
        const characterData = JSON.parse(savedCharacter);
        player = new Character(
            characterData.name,
            characterData.maxHp,
            characterData.attack,
            characterData.defense,
            characterData.energy
        );
        Object.assign(player, characterData);
        console.log("Personnage chargé :", player);
        updatePlayerInfo();
        showGameArea('main-menu');
    } else {
        console.log("Aucun personnage sauvegardé, affichage de la création de personnage");
        showGameArea('character-creation');
    }
    window.player = player;
}

function createCharacter() {
    console.log("Tentative de création de personnage");
    const nameInput = document.getElementById('hero-name');
    if (nameInput) {
        const name = nameInput.value.trim();
        if (name) {
            player = new Character(name, 100, 10, 5, 100);
            player.lair = { buildings: {}, currentConstruction: null };
            player.resources = { bois: 100, pierre: 50, fer: 20 };
            console.log("Nouveau personnage créé :", player);
            localStorage.setItem('playerCharacter', JSON.stringify(player));
            initializePlayer();
            updatePlayerInfo();
            showGameArea('main-menu');
        } else {
            console.log("Nom de personnage invalide");
            showGameMessage("Veuillez entrer un nom pour votre personnage.");
        }
    } else {
        console.error("Élément 'hero-name' non trouvé");
    }
    window.player = player;
}

function startAdventure() {
    if (!player) {
        showGameMessage("Veuillez d'abord créer un personnage.");
        return;
    }
    console.log("Démarrage du mode Aventure");
    const availableMissions = getAvailableMissions(player.level);
    displayMissionMenu(availableMissions);
}

function displayMissionMenu(missions) {
    const missionGrid = document.querySelector('#mission-area .mission-grid');
    missionGrid.innerHTML = '';
    missions.forEach((mission, index) => {
        const missionCard = document.createElement('div');
        missionCard.className = 'mission-card';
        missionCard.innerHTML = `
            <h3>${mission.name}</h3>
            <p>Difficulté: ${mission.difficulty}</p>
            <p>Récompense: ${mission.goldReward} or, ${mission.expReward} XP</p>
            <button onclick="window.gameActions.selectMission(${index})">Commencer la mission</button>
        `;
        missionGrid.appendChild(missionCard);
    });
}

function startDonjon() {
    console.log("Démarrage du mode Donjon");
    currentDonjonLevel = 1;
    showGameMessage("Vous entrez dans le donjon. Préparez-vous à affronter des défis !");
    nextDonjonEvent();
    showGameArea('donjon-area');
}

function nextDonjonEvent() {
    const event = generateDonjonEvent(currentDonjonLevel);
    console.log("Nouvel événement de donjon :", event);
    if (event.type === 'combat') {
        initializeCombat(player, companion, event.enemy, null);
        showGameArea('battle-area');
    } else if (event.type === 'treasure') {
        showGameMessage(`Vous avez trouvé un trésor : ${event.item.name}`);
        inventoryModule.addItemToInventory(player, event.item);
    } else if (event.type === 'trap') {
        const damage = event.damage;
        player.hp = Math.max(0, player.hp - damage);
        showGameMessage(`Vous avez déclenché un piège ! Vous subissez ${damage} points de dégâts.`);
        updatePlayerInfo();
    } else if (event.type === 'rest') {
        const healAmount = event.healAmount;
        player.hp = Math.min(player.maxHp, player.hp + healAmount);
        showGameMessage(`Vous trouvez un lieu de repos. Vous récupérez ${healAmount} points de vie.`);
        updatePlayerInfo();
    }
    currentDonjonLevel++;
}

function openMultiplayer() {
    console.log("Ouverture du mode Multijoueur");
    showGameArea('multiplayer-area');
}

function handleOpenShop() {
    console.log("Ouverture de la boutique");
    if (player) {
        inventoryModule.openShop(player);
        showGameArea('shop-area');
    } else {
        console.error("Impossible d'ouvrir la boutique : joueur non défini");
        showGameMessage("Vous devez d'abord créer un personnage.");
    }
}

function openInventory() {
    console.log("Ouverture de l'inventaire");
    inventoryModule.updateInventoryDisplay(player);
    showGameArea('inventory-area');
}

function manageCompanions() {
    console.log("Gestion des compagnons");
    updateCompanionsList();
    showGameArea('companions-area');
}

function updateCompanionsList() {
    console.log("Mise à jour de la liste des compagnons");
    const companionsArea = document.getElementById('companions-area');
    if (companionsArea && player && player.companions) {
        companionsArea.innerHTML = '<h2>Vos compagnons</h2>';
        player.companions.forEach((companion, index) => {
            const companionElement = document.createElement('div');
            companionElement.innerHTML = `
                <h3>${companion.name}</h3>
                <p>Niveau: ${companion.level}</p>
                <p>PV: ${companion.hp}/${companion.maxHp}</p>
                <button onclick="window.gameActions.equipCompanion(${index})">Équiper</button>
            `;
            companionsArea.appendChild(companionElement);
        });
    }
}

function openLairBuilding() {
    console.log("Ouverture du système de construction du repaire");
    
    showGameArea('lair-building-area');

    const lairBuildingArea = document.getElementById('lair-building-area');
    if (!lairBuildingArea) {
        console.error("Élément 'lair-building-area' non trouvé");
        return;
    }

    lairBuildingArea.innerHTML = '<h2>Construction du Repaire</h2>';

    const availableBuildings = getAvailableBuildings(player);
    displayBuildings(availableBuildings);

    displayPlayerResources();

    initializeBuildingEvents();
}

function displayBuildings(buildings) {
    const buildingList = document.createElement('div');
    buildingList.id = 'building-list';

    buildings.forEach(building => {
        const buildingElement = document.createElement('div');
        buildingElement.className = 'building';
        buildingElement.innerHTML = `
            <h3>${building.name} (Niveau ${building.level})</h3>
            <p>Matériaux nécessaires :</p>
            <ul>
                ${Object.entries(building.materials).map(([material, quantity]) => 
                    `<li>${material}: ${quantity}</li>`
                ).join('')}
            </ul>
            <p>Temps de construction : ${formatTime(building.time)}</p>
            <p>Avantages : ${building.benefits}</p>
            <button class="build-button" data-building-id="${building.id}">
                ${player.lair.buildings[building.id] ? 'Améliorer' : 'Construire'}
            </button>
        `;
        buildingList.appendChild(buildingElement);
    });

    document.getElementById('lair-building-area').appendChild(buildingList);
}

function displayPlayerResources() {
    const resourceDisplay = document.createElement('div');
    resourceDisplay.id = 'player-resources';
    resourceDisplay.innerHTML = `
        <h3>Vos ressources :</h3>
        <ul>
            ${Object.entries(player.resources).map(([resource, quantity]) => 
                `<li>${resource}: ${quantity}</li>`
            ).join('')}
        </ul>
    `;
    document.getElementById('lair-building-area').appendChild(resourceDisplay);
}

function initializeBuildingEvents() {
    const lairBuildingArea = document.getElementById('lair-building-area');
    lairBuildingArea.addEventListener('click', (e) => {
        if (e.target.classList.contains('build-button')) {
            const buildingId = parseInt(e.target.getAttribute('data-building-id'));
            startBuilding(buildingId);
        }
    });
}

function startBuilding(buildingId) {
    const building = getAvailableBuildings(player).find(b => b.id === buildingId);
    if (!building) {
        showGameMessage("Bâtiment non trouvé.");
        return;
    }

    const canBuild = Object.entries(building.materials).every(([material, quantity]) => 
        (player.resources[material] || 0) >= quantity
    );

    if (canBuild) {
        Object.entries(building.materials).forEach(([material, quantity]) => {
            player.resources[material] -= quantity;
        });

        player.lair.currentConstruction = {
            buildingId: buildingId,
            endTime: Date.now() + building.time * 1000
        };

        showGameMessage(`Construction de ${building.name} commencée. Temps estimé : ${formatTime(building.time)}`);
        updatePlayerInfo(player);
        displayPlayerResources();

        startConstructionTimer(building.time);
    } else {
        showGameMessage("Vous n'avez pas assez de ressources pour construire ce bâtiment.");
    }
}

function startConstructionTimer(duration) {
    const timer = setInterval(() => {
        const timeLeft = Math.max(0, (player.lair.currentConstruction.endTime - Date.now()) / 1000);
        updateConstructionProgress(timeLeft, duration);

        if (timeLeft <= 0) {
            clearInterval(timer);
            completeConstruction();
        }
    }, 1000);
}

function completeConstruction() {
    const buildingId = player.lair.currentConstruction.buildingId;
    const building = getAvailableBuildings(player).find(b => b.id === buildingId);

    if (building) {
        if (!player.lair.buildings[buildingId]) {
            player.lair.buildings[buildingId] = { level: 1 };
        } else {
            player.lair.buildings[buildingId].level++;
        }

        showGameMessage(`Construction de ${building.name} terminée !`);
        applyBuildingBenefits(building);
    }

    player.lair.currentConstruction = null;
    updatePlayerInfo(player);
    openLairBuilding(); // Rafraîchir l'affichage
}

function applyBuildingBenefits(building) {
    // Logique pour appliquer les avantages du bâtiment
    console.log(`Avantages appliqués pour ${building.name}`);
}

function saveGame() {
    console.log("Sauvegarde du jeu");
    localStorage.setItem('playerCharacter', JSON.stringify(player));
    showGameMessage("Jeu sauvegardé avec succès !");
}

function loadGame() {
    console.log("Chargement du jeu");
    loadCharacter();
}

function initializeEventListeners() {
    console.log("Initialisation des écouteurs d'événements");

    const buttonHandlers = {
        'start-adventure': startAdventure,
        'start-donjon': startDonjon,
        'open-multiplayer': openMultiplayer,
        'open-shop': handleOpenShop,
        'open-inventory': openInventory,
        'manage-companions': manageCompanions,
        'open-lair-building': openLairBuilding,
        'save-game': saveGame,
        'load-game': loadGame,
        'join-room': joinRoom,
        'send-message': sendChatMessage,
        'challenge-player': initiateChallenge,
        'accept-challenge': acceptChallenge,
        'trade-request': initiateTradeRequest,
        'accept-trade': acceptTradeRequest,
        'confirm-trade': confirmTrade,
        'cancel-trade': cancelTrade,
        'attack-button': () => window.gameActions.playerAttack(),
        'defend-button': () => window.gameActions.playerDefend(),
        'special-button': () => window.gameActions.playerUseSpecial(),
        'create-character': createCharacter,
        'next-donjon-event': nextDonjonEvent
    };

    for (const [id, handler] of Object.entries(buttonHandlers)) {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener('click', handler);
            console.log(`Écouteur ajouté pour ${id}`);
        } else {
            console.warn(`Bouton ${id} non trouvé`);
        }
    }

    const navHandlers = {
        'nav-home': () => showGameArea('main-menu'),
        'nav-adventure': () => {
            showGameArea('mission-area');
            startAdventure();
        },
        'nav-donjon': () => {
            showGameArea('donjon-area');
            startDonjon();
        },
        'nav-multiplayer': openMultiplayer,
        'nav-inventory': openInventory,
        'nav-shop': handleOpenShop,
        'nav-companions': manageCompanions,
        'nav-lair-building': openLairBuilding
    };

    for (const [id, handler] of Object.entries(navHandlers)) {
        const navItem = document.getElementById(id);
        if (navItem) {
            navItem.addEventListener('click', handler);
            console.log(`Écouteur de navigation ajouté pour ${id}`);
        } else {
            console.warn(`Élément de navigation ${id} non trouvé`);
        }
    }

    document.addEventListener('click', (e) => {
        console.log(`Clic détecté sur l'élément:`, e.target);
    });

    console.log("Initialisation des écouteurs d'événements terminée");
}

function joinRoom() {
    console.log("Tentative de rejoindre une salle");
    const roomIdInput = document.getElementById('room-id');
    if (roomIdInput && player) {
        const roomId = roomIdInput.value || 'fixed-room';
        console.log(`Rejoindre la salle : ${roomId}`);
        socket.emit('joinRoom', { roomId, playerInfo: { name: player.name, level: player.level } });
    } else {
        console.log("Impossible de rejoindre une salle : joueur non défini ou input non trouvé");
        showGameMessage("Veuillez d'abord créer un personnage.");
    }
}

function sendChatMessage() {
    console.log("Envoi d'un message");
    const messageInput = document.getElementById('chat-input');
    if (messageInput && currentRoom) {
        const message = messageInput.value.trim();
        if (message) {
            socket.emit('chatMessage', { roomId: currentRoom, message: { sender: player.name, content: message } });
            messageInput.value = '';
        }
    }
}

function initiateChallenge() {
    console.log("Initiation d'un défi");
    if (currentRoom && player) {
        socket.emit('initiateChallenge', { roomId: currentRoom, challengerId: player.id });
    } else {
        showGameMessage("Vous devez être dans une salle pour défier un joueur.");
    }
}

function acceptChallenge() {
    console.log("Acceptation d'un défi");
    if (currentRoom && player) {
        socket.emit('acceptChallenge', { roomId: currentRoom, challengerId: player.id, accepterId: player.id });
    } else {
        showGameMessage("Vous ne pouvez pas accepter le défi en ce moment.");
    }
}

function initiateTradeRequest() {
    console.log("Initiation d'une demande d'échange");
    const otherPlayerId = getOtherPlayerId();
    if (currentRoom && player && otherPlayerId) {
        socket.emit('initiateTradeRequest', { roomId: currentRoom, fromId: player.id, toId: otherPlayerId });
    } else {
        showGameMessage("Impossible d'initier l'échange en ce moment.");
    }
}

function acceptTradeRequest() {
    console.log("Acceptation d'une demande d'échange");
    const otherPlayerId = getOtherPlayerId();
    if (currentRoom && player && otherPlayerId) {
        socket.emit('acceptTradeRequest', { roomId: currentRoom, fromId: otherPlayerId, toId: player.id });
    } else {
        showGameMessage("Impossible d'accepter l'échange en ce moment.");
    }
}

function confirmTrade() {
    console.log("Confirmation de l'échange");
    if (currentRoom) {
        socket.emit('confirmTrade', { roomId: currentRoom });
    }
}

function cancelTrade() {
    console.log("Annulation de l'échange");
    if (currentRoom) {
        socket.emit('cancelTrade', { roomId: currentRoom });
    }
}

function getOtherPlayerId() {
    console.log("Récupération de l'ID de l'autre joueur");
    const playersList = document.getElementById('players-list');
    if (playersList && player) {
        const playerElements = Array.from(playersList.children);
        const otherPlayer = playerElements.find(el => el.dataset.playerId !== player.id);
        return otherPlayer ? otherPlayer.dataset.playerId : null;
    }
    return null;
}

// Objet gameActions pour les actions accessibles globalement
window.gameActions = {
    ...window.gameActions,
    ...inventoryModule,
    startAdventure,
    startDonjon,
    openMultiplayer,
    openShop: handleOpenShop,
    openInventory,
    manageCompanions,
    openLairBuilding,
    saveGame,
    loadGame,
    joinRoom,
    sendChatMessage,
    initiateChallenge,
    acceptChallenge,
    initiateTradeRequest,
    acceptTradeRequest,
    confirmTrade,
    cancelTrade,
    showGameArea,
    selectMission: (index) => {
        console.log("Tentative de sélection de la mission:", index);
        try {
            if (!player) {
                throw new Error("Joueur non initialisé");
            }
            const availableMissions = getAvailableMissions(player.level);
            const selectedMission = availableMissions[index];
            if (!selectedMission) {
                throw new Error("Mission non trouvée");
            }
            console.log("Mission sélectionnée:", selectedMission);
            const enemy = createEnemyForMission(selectedMission);
            console.log("Ennemi créé:", enemy);
            initializeCombat(player, null, enemy, selectedMission);
            console.log("Combat initialisé");
            showGameArea('battle-area');
        } catch (error) {
            console.error("Erreur lors de la sélection de la mission:", error);
            showGameMessage("Erreur: " + error.message);
        }
    },
    playerAttack: () => {
        if (isCombatActive()) {
            playerAttack();
        } else {
            showGameMessage("Vous n'êtes pas en combat.");
        }
    },
    playerDefend: () => {
        if (isCombatActive()) {
            playerDefend();
        } else {
            showGameMessage("Vous n'êtes pas en combat.");
        }
    },
    playerUseSpecial: () => {
        if (isCombatActive()) {
            playerUseSpecial();
        } else {
            showGameMessage("Vous n'êtes pas en combat.");
        }
    },
    equipCompanion: (index) => {
        if (player && player.companions) {
            companion = player.companions[index];
            showGameMessage(`${companion.name} est maintenant votre compagnon actif.`);
            updateCompanionsList();
        }
    }
};

// Initialisation du jeu au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM chargé, initialisation du jeu...");
    initializeGame();
    initializeEventListeners();
});

// Exports
export {
    initializeGame,
    createCharacter,
    startAdventure,
    startDonjon,
    openMultiplayer,
    handleOpenShop as openShop,
    openInventory,
    manageCompanions,
    openLairBuilding,
    saveGame,
    loadGame,
    joinRoom,
    sendChatMessage,
    initiateChallenge,
    acceptChallenge,
    initiateTradeRequest,
    acceptTradeRequest,
    confirmTrade,
    cancelTrade,
    showGameArea,
    showGameMessage,
    updatePlayerInfo,
    updateLeaderboard,
    initializeGroupQuests,
    initializeLairBuildingSystem,
    startWorldEvent
};

console.log("Module de jeu chargé");
