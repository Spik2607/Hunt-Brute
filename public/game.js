// game.js
import { Character, items, missions, getAvailableMissions, createEnemyForMission, calculateDamage, generateRandomLoot, getRandomCompanion, generateDonjonEvent, generateDonjonBoss, generateBossReward } from './gameData.js';
import { equipItem, unequipItem, useItem, updateInventoryDisplay, updateEquippedItemsDisplay, openShop, buyItem, sellItem, addItemToInventory } from './inventory.js';
import { initializeCombat, updateBattleInfo, playerAttack, playerDefend, playerUseSpecial, isCombatActive } from './combat.js';

let player;
let companion;
let currentRoom;
let socket;
let currentMission;
let currentDonjonLevel;

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM chargé, initialisation du jeu...");
    initializeGame();
    initializeEventListeners();
});

function initializeGame() {
    console.log("Initialisation du jeu...");
    initializeSocket();
    loadCharacter();
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

        socket.on('roomJoined', ({ roomId, players, messages }) => {
            currentRoom = roomId;
            updatePlayersList(players);
            updateChatMessages(messages);
            showGameArea('multiplayer-area');
        });

        socket.on('playerJoined', (players) => {
            updatePlayersList(players);
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

        socket.on('playerLeft', (playerId) => {
            showGameMessage(`Le joueur ${playerId} a quitté la partie.`);
            if (currentRoom) {
                socket.emit('getRoomPlayers', currentRoom);
            }
        });

        socket.on('disconnect', () => {
            console.log('Déconnecté du serveur');
            showGameMessage("Vous avez été déconnecté du serveur.");
        });

    } catch (error) {
        console.error("Erreur lors de l'initialisation de Socket.IO:", error);
    }
}

function initializeEventListeners() {
    console.log("Initialisation des écouteurs d'événements");
    const buttons = [
        { id: 'start-adventure', handler: startAdventure },
        { id: 'start-donjon', handler: startDonjon },
        { id: 'open-multiplayer', handler: openMultiplayer },
        { id: 'open-shop', handler: handleOpenShop },
        { id: 'open-inventory', handler: openInventory },
        { id: 'manage-companions', handler: manageCompanions },
        { id: 'open-guilds', handler: openGuilds },
        { id: 'open-crafting', handler: openCrafting },
        { id: 'save-game', handler: saveGame },
        { id: 'load-game', handler: loadGame },
        { id: 'join-room', handler: joinRoom },
        { id: 'send-message', handler: sendChatMessage },
        { id: 'challenge-player', handler: initiateChallenge },
        { id: 'accept-challenge', handler: acceptChallenge },
        { id: 'trade-request', handler: initiateTradeRequest },
        { id: 'accept-trade', handler: acceptTradeRequest },
        { id: 'confirm-trade', handler: confirmTrade },
        { id: 'cancel-trade', handler: cancelTrade },
        { id: 'attack-button', handler: playerAttack },
        { id: 'defend-button', handler: playerDefend },
        { id: 'special-button', handler: playerUseSpecial },
        { id: 'create-character', handler: createCharacter }
    ];

    buttons.forEach(({ id, handler }) => {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener('click', handler);
            console.log(`Écouteur ajouté pour ${id}`);
        } else {
            console.warn(`Bouton ${id} non trouvé`);
        }
    });
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
        showGameArea('multiplayer-area');
    } else {
        console.log("Aucun personnage sauvegardé, affichage de la création de personnage");
        showGameArea('character-creation');
    }
}

function createCharacter() {
    console.log("Tentative de création de personnage");
    const nameInput = document.getElementById('hero-name');
    if (nameInput) {
        const name = nameInput.value.trim();
        if (name) {
            player = new Character(name, 100, 10, 5, 100);
            console.log("Nouveau personnage créé :", player);
            localStorage.setItem('playerCharacter', JSON.stringify(player));
            updatePlayerInfo();
            showGameArea('multiplayer-area');
        } else {
            console.log("Nom de personnage invalide");
            showGameMessage("Veuillez entrer un nom pour votre personnage.");
        }
    } else {
        console.error("Élément 'hero-name' non trouvé");
    }
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
    const missionArea = document.getElementById('mission-area');
    if (!missionArea) {
        console.error("Élément 'mission-area' non trouvé");
        return;
    }

    missionArea.innerHTML = '<h2>Missions disponibles</h2>';
    missions.forEach((mission, index) => {
        const missionElement = document.createElement('div');
        missionElement.innerHTML = `
            <h3>${mission.name}</h3>
            <p>Difficulté: ${mission.difficulty}</p>
            <p>Récompense: ${mission.goldReward} or, ${mission.expReward} XP</p>
            <button onclick="window.gameActions.selectMission(${index})">Commencer la mission</button>
        `;
        missionArea.appendChild(missionElement);
    });
    showGameArea('mission-area');
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
    // Implémentation de la logique pour gérer l'événement du donjon
    // Par exemple :
    if (event.type === 'combat') {
        initializeCombat(player, companion, event.enemy, null);
        showGameArea('battle-area');
    } else if (event.type === 'treasure') {
        showGameMessage(`Vous avez trouvé un trésor : ${event.item.name}`);
        addItemToInventory(player, event.item);
    }
    // Ajouter d'autres types d'événements selon vos besoins
}

function openMultiplayer() {
    console.log("Ouverture du mode Multijoueur");
    showGameArea('multiplayer-area');
}

function handleOpenShop() {
    console.log("Ouverture de la boutique");
    if (player) {
        openShop(player);
        showGameArea('shop-area');
    } else {
        console.error("Impossible d'ouvrir la boutique : joueur non défini");
        showGameMessage("Vous devez d'abord créer un personnage.");
    }
}

function openInventory() {
    console.log("Ouverture de l'inventaire");
    updateInventoryDisplay(player);
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

function openGuilds() {
    console.log("Ouverture des guildes");
    updateGuildsList();
    showGameArea('guild-area');
}

function updateGuildsList() {
    console.log("Mise à jour de la liste des guildes");
    // Implémentation à faire
    // Par exemple :
    const guildArea = document.getElementById('guild-area');
    if (guildArea) {
        guildArea.innerHTML = '<h2>Guildes disponibles</h2>';
        // Ajouter la liste des guildes ici
    }
}

function openCrafting() {
    console.log("Ouverture de l'artisanat");
    updateCraftingRecipes();
    showGameArea('crafting-area');
}

function updateCraftingRecipes() {
    console.log("Mise à jour des recettes d'artisanat");
    // Implémentation à faire
    // Par exemple :
    const craftingArea = document.getElementById('crafting-area');
    if (craftingArea) {
        craftingArea.innerHTML = '<h2>Recettes disponibles</h2>';
        // Ajouter la liste des recettes ici
    }
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

function showGameArea(areaId) {
    console.log(`Affichage de la zone de jeu : ${areaId}`);
    const gameAreas = document.querySelectorAll('.game-area');
    gameAreas.forEach(area => {
        area.style.display = area.id === areaId ? 'block' : 'none';
    });
}

function showGameMessage(message) {
    console.log(`Message de jeu : ${message}`);
    const gameMessages = document.getElementById('game-messages');
    if (gameMessages) {
        const messageElement = document.createElement('div');
        messageElement.textContent = message;
        gameMessages.appendChild(messageElement);
        gameMessages.scrollTop = gameMessages.scrollHeight;
    }
}

function updatePlayerInfo() {
    if (!player) return;

    const elements = [
        { id: 'player-name', value: player.name },
        { id: 'player-level', value: player.level },
        { id: 'player-hp', value: player.hp },
        { id: 'player-max-hp', value: player.maxHp },
        { id: 'player-attack', value: player.attack },
        { id: 'player-defense', value: player.defense },
        { id: 'player-gold', value: player.gold },
        { id: 'player-exp', value: player.experience },
        { id: 'player-next-level-exp', value: player.level * 100 }
    ];

    elements.forEach(({ id, value }) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });

    const expPercentage = (player.experience / (player.level * 100)) * 100;
    const expFill = document.querySelector('.experience-fill');
    if (expFill) expFill.style.width = `${expPercentage}%`;
}

function initializeAdditionalFeatures() {
    console.log("Initialisation des fonctionnalités supplémentaires");
    updateLeaderboard();
    initializeGroupQuests();
    updateGuildsList();
    initializeCraftingSystem();
    setTimeout(startWorldEvent, 3600000); // Premier événement après 1 heure
}

function updateLeaderboard() {
    console.log("Mise à jour du classement");
    // Implémentation à faire
    // Par exemple :
    const leaderboardArea = document.getElementById('leaderboard-area');
    if (leaderboardArea) {
        leaderboardArea.innerHTML = '<h2>Classement</h2>';
        // Ajouter la logique pour récupérer et afficher le classement
    }
}

function initializeGroupQuests() {
    console.log("Initialisation des quêtes de groupe");
    // Implémentation à faire
    // Par exemple :
    const groupQuestsArea = document.getElementById('group-quests-area');
    if (groupQuestsArea) {
        groupQuestsArea.innerHTML = '<h2>Quêtes de groupe disponibles</h2>';
        // Ajouter la logique pour générer et afficher les quêtes de groupe
    }
}

function startWorldEvent() {
    console.log("Démarrage d'un événement mondial");
    // Implémentation à faire
    // Par exemple :
    const eventName = "Invasion de dragons";
    showGameMessage(`Un événement mondial a commencé : ${eventName}`);
    // Ajouter la logique pour l'événement mondial
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

function startTrade(fromId, toId) {
    console.log("Début d'un échange");
    showGameArea('trade-area');
    displayTradeInventory();
}

function displayTradeInventory() {
    console.log("Affichage de l'inventaire d'échange");
    const tradeInventoryArea = document.getElementById('trade-inventory');
    if (tradeInventoryArea && player) {
        tradeInventoryArea.innerHTML = '<h3>Votre inventaire</h3>';
        player.inventory.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.innerHTML = `
                <span>${item.name}</span>
                <button onclick="window.gameActions.offerItem(${index})">Offrir</button>
            `;
            tradeInventoryArea.appendChild(itemElement);
        });
    }
}

function showOfferedItem(itemId) {
    console.log("Affichage d'un objet offert");
    const item = items.find(i => i.id === itemId);
    if (item) {
        const offeredItemsElement = document.getElementById('offered-items');
        if (offeredItemsElement) {
            const itemElement = document.createElement('div');
            itemElement.textContent = item.name;
            offeredItemsElement.appendChild(itemElement);
        }
    }
}

function closeTrade() {
    console.log("Fermeture de l'échange");
    showGameArea('multiplayer-area');
}

function initializeCraftingSystem() {
    console.log("Initialisation du système d'artisanat");
    // Implémentation à faire
    // Par exemple :
    const craftingArea = document.getElementById('crafting-area');
    if (craftingArea) {
        craftingArea.innerHTML = '<h2>Système d'artisanat</h2>';
        // Ajouter ici la logique pour initialiser le système d'artisanat
    }
}

// Objet gameActions pour les actions accessibles globalement
window.gameActions = {
    startAdventure: startAdventure,
    startDonjon: startDonjon,
    openMultiplayer: openMultiplayer,
    openShop: handleOpenShop,
    openInventory: openInventory,
    manageCompanions: manageCompanions,
    openGuilds: openGuilds,
    openCrafting: openCrafting,
    saveGame: saveGame,
    loadGame: loadGame,
    joinRoom: joinRoom,
    sendChatMessage: sendChatMessage,
    initiateChallenge: initiateChallenge,
    acceptChallenge: acceptChallenge,
    initiateTradeRequest: initiateTradeRequest,
    acceptTradeRequest: acceptTradeRequest,
    confirmTrade: confirmTrade,
    cancelTrade: cancelTrade,
    selectMission: (index) => {
        if (!player) {
            console.error("Player not initialized");
            showGameMessage("Erreur : Personnage non initialisé. Veuillez créer un personnage.");
            return;
        }
        const availableMissions = getAvailableMissions(player.level);
        const selectedMission = availableMissions[index];
        if (selectedMission) {
            const enemy = createEnemyForMission(selectedMission);
            initializeCombat(player, null, enemy, selectedMission);
            showGameArea('battle-area');
        } else {
            console.error("Mission non trouvée");
            showGameMessage("Erreur : Mission non trouvée.");
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
    equipItem: (index) => {
        if (player) {
            equipItem(player, index);
        } else {
            showGameMessage("Vous devez d'abord créer un personnage.");
        }
    },
    useItem: (index) => {
        if (player) {
            useItem(player, index);
        } else {
            showGameMessage("Vous devez d'abord créer un personnage.");
        }
    },
    sellItem: (index) => {
        if (player) {
            sellItem(player, index);
        } else {
            showGameMessage("Vous devez d'abord créer un personnage.");
        }
    },
    buyItem: (itemId) => {
        if (player) {
            buyItem(player, itemId);
        } else {
            showGameMessage("Vous devez d'abord créer un personnage.");
        }
    },
    offerItem: (index) => {
        if (player && currentRoom) {
            const item = player.inventory[index];
            if (item) {
                socket.emit('offerItem', { roomId: currentRoom, itemId: item.id });
            }
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
    openGuilds,
    openCrafting,
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
    updateGuildsList,
    initializeCraftingSystem,
    startWorldEvent
};

console.log("Module de jeu chargé");
