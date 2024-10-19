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

function resetGame() {
    console.log("Réinitialisation du jeu");
    localStorage.removeItem('playerCharacter');
    player = null;
    showGameArea('character-creation');
    showGameMessage("Le jeu a été réinitialisé. Créez un nouveau personnage.");
}

// Ajoutez ceci à vos gestionnaires d'événements
document.getElementById('reset-game').addEventListener('click', resetGame);

// Ajoutez ceci à window.gameActions
window.gameActions.resetGame = resetGame;

function initializePlayer(name) {
    return new Character(name, 100, 10, 5, 100);
}

function updatePlayerStats(player) {
    // Calculer les stats basées sur le niveau
    const levelBonus = player.level - 1; // Bonus pour chaque niveau au-dessus de 1
    player.attack = player.baseAttack + (2 * levelBonus); // 2 points d'attaque par niveau
    player.defense = player.baseDefense + levelBonus; // 1 point de défense par niveau
    player.maxHp = player.baseMaxHp + (10 * levelBonus); // 10 points de vie par niveau

    // Appliquer les effets des objets équipés
    for (const slot in player.equippedItems) {
        const item = player.equippedItems[slot];
        if (item) {
            if (item.attack) player.attack += item.attack;
            if (item.defense) player.defense += item.defense;
            if (item.maxHp) player.maxHp += item.maxHp;
        }
    }

    // S'assurer que les HP actuels ne dépassent pas le nouveau maxHp
    player.hp = Math.min(player.hp, player.maxHp);

    // Mettre à jour l'affichage
    updatePlayerInfo(player);
    console.log("Stats mises à jour:", player);
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

        socket.on('disconnect', () => {
            console.log('Déconnecté du serveur');
            showGameMessage("Vous avez été déconnecté du serveur.");
        });

        socket.on('roomJoined', ({ roomId, players, messages }) => {
            currentRoom = roomId;
            updatePlayersList(players);
            updateChatMessages(messages);
            showGameArea('multiplayer-area');
        });

        socket.on('playerJoined', (players) => {
            updatePlayersList(players);
        });

        socket.on('playerLeft', (playerId) => {
            showGameMessage(`Le joueur ${playerId} a quitté la partie.`);
            if (currentRoom) {
                socket.emit('getRoomPlayers', currentRoom);
            }
        });

        socket.on('newMessage', (message) => {
            addChatMessage(message);
        });

        socket.on('challengeReceived', ({ challengerId }) => {
            if (player && challengerId !== player.id) {
                showGameMessage(`${challengerId} vous défie en duel !`);
                document.getElementById('accept-challenge').style.display = 'block';
            }
        });

        socket.on('battleStart', ({ challengerId, accepterId }) => {
            if (player && (player.id === challengerId || player.id === accepterId)) {
                startMultiplayerBattle(challengerId, accepterId);
            }
        });

        socket.on('opponentAction', (action) => {
            handleOpponentAction(action);
        });

        socket.on('tradeRequestReceived', ({ fromId, toId }) => {
            if (player && player.id === toId) {
                showGameMessage(`${fromId} vous propose un échange !`);
                document.getElementById('accept-trade').style.display = 'block';
            }
        });

        socket.on('tradeStart', ({ fromId, toId }) => {
            if (player && (player.id === fromId || player.id === toId)) {
                startTrade(fromId, toId);
            }
        });

        socket.on('itemOffered', ({ fromId, itemId }) => {
            if (player && fromId !== player.id) {
                showOfferedItem(itemId);
            }
        });

        socket.on('tradeConfirmed', ({ playerId }) => {
            if (player && playerId !== player.id) {
                showGameMessage("L'autre joueur a confirmé l'échange.");
            }
        });

        socket.on('tradeCancelled', ({ playerId }) => {
            showGameMessage("L'échange a été annulé.");
            closeTrade();
        });

        socket.on('worldEvent', (eventData) => {
            handleWorldEvent(eventData);
        });

        socket.on('leaderboardUpdate', (leaderboardData) => {
            updateLeaderboard(leaderboardData);
        });

        socket.on('groupQuestUpdate', (questData) => {
            updateGroupQuests(questData);
        });

        socket.on('error', (error) => {
            console.error("Erreur Socket.IO:", error);
            showGameMessage("Une erreur de connexion s'est produite.");
        });

    } catch (error) {
        console.error("Erreur lors de l'initialisation de Socket.IO:", error);
        showGameMessage("Impossible de se connecter au serveur. Veuillez réessayer plus tard.");
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

function initializeAdditionalFeatures() {
    console.log("Initialisation des fonctionnalités supplémentaires");
    updateLeaderboard();
    initializeGroupQuests();
    updateGuildsList();
    initializeLairBuildingSystem();
    setTimeout(startWorldEvent, 3600000); // Premier événement après 1 heure
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

function updatePlayersList(players) {
    console.log("Mise à jour de la liste des joueurs");
    const playersList = document.getElementById('players-list');
    if (playersList) {
        playersList.innerHTML = '';
        players.forEach(p => {
            const playerElement = document.createElement('div');
            playerElement.textContent = `${p.name} (Niveau ${p.level})`;
            playerElement.dataset.playerId = p.id;
            playersList.appendChild(playerElement);
        });
    }
}

function updateChatMessages(messages) {
    console.log("Mise à jour des messages du chat");
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        chatMessages.innerHTML = '';
        messages.forEach(message => {
            addChatMessage(message);
        });
    }
}

function addChatMessage(message) {
    console.log("Ajout d'un message au chat");
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        const messageElement = document.createElement('div');
        messageElement.textContent = `${message.sender}: ${message.content}`;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

function startMultiplayerBattle(challengerId, accepterId) {
    console.log("Début d'un combat multijoueur");
    showGameArea('battle-area');
    initializeCombat(player, null, { name: "Adversaire", hp: 100, attack: 10, defense: 5 }, null);
    updateBattleInfo();
}

function handleOpponentAction(action) {
    console.log("Gestion de l'action de l'adversaire");
    if (action.type === 'attack' && player) {
        const damage = calculateDamage(action.attacker, player);
        player.hp -= damage;
        showGameMessage(`L'adversaire vous inflige ${damage} dégâts.`);
        updateBattleInfo();
    }
}

function updateLeaderboard() {
    console.log("Mise à jour du classement");
    const leaderboardArea = document.getElementById('leaderboard-area');
    if (leaderboardArea) {
        leaderboardArea.innerHTML = '<h2>Classement</h2>';
        // Vous devrez implémenter la logique pour récupérer et afficher le classement réel ici
        // Par exemple :
        // getLeaderboardData().then(data => {
        //     data.forEach((player, index) => {
        //         const playerElement = document.createElement('div');
        //         playerElement.textContent = `${index + 1}. ${player.name} - Niveau ${player.level}`;
        //         leaderboardArea.appendChild(playerElement);
        //     });
        // });
    }
}

function initializeGroupQuests() {
    console.log("Initialisation des quêtes de groupe");
    const groupQuestsArea = document.getElementById('group-quests-area');
    if (groupQuestsArea) {
        groupQuestsArea.innerHTML = '<h2>Quêtes de groupe disponibles</h2>';
        // Implémentez ici la logique pour générer et afficher les quêtes de groupe
        // Par exemple :
        // const groupQuests = getAvailableGroupQuests();
        // groupQuests.forEach(quest => {
        //     const questElement = document.createElement('div');
        //     questElement.innerHTML = `
        //         <h3>${quest.name}</h3>
        //         <p>${quest.description}</p>
        //         <button onclick="joinGroupQuest(${quest.id})">Rejoindre</button>
        //     `;
        //     groupQuestsArea.appendChild(questElement);
        // });
    }
}

function startWorldEvent() {
    console.log("Démarrage d'un événement mondial");
    const eventName = "Invasion de dragons";
    showGameMessage(`Un événement mondial a commencé : ${eventName}`);
    // Implémentez ici la logique pour l'événement mondial
}


// Objet gameActions pour les actions accessibles globalement
window.gameActions = {
    ...window.gameActions,
    ...inventoryModule,
    resetGame,
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
    },
    startBuilding: (buildingId) => {
        const building = getAvailableBuildings(player).find(b => b.id === buildingId);
        if (building) {
            startBuilding(buildingId);
        } else {
            showGameMessage("Bâtiment non disponible.");
        }
    },
    updatePlayersList,
    updateChatMessages,
    addChatMessage,
    startMultiplayerBattle,
    handleOpponentAction,
    updateLeaderboard,
    initializeGroupQuests,
    startWorldEvent,
    createCharacter
};

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
    startWorldEvent,
    updatePlayersList,
    updateChatMessages,
    addChatMessage,
    startMultiplayerBattle,
    handleOpponentAction
};

// Initialisation du jeu au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM chargé, initialisation du jeu...");
    initializeGame();
    initializeEventListeners();
});

console.log("Module de jeu chargé");
