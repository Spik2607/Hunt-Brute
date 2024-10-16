// game.js
import { Character, items, missions, getRandomMission, createEnemyForMission, calculateDamage, generateRandomLoot, getAvailableMissions  } from './gameData.js';
import { equipItem, unequipItem, useItem, updateInventoryDisplay, updateEquippedItemsDisplay, openShop, buyItem, sellItem, addItemToInventory } from './inventory.js';
import { initializeCombat, updateBattleInfo, playerAttack, playerDefend, playerUseSpecial, isCombatActive } from './combat.js';
import { generateDonjonEvent, generateDonjonBoss, generateBossReward } from './donjon.js';

let player;
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

// Fonction de test pour le bouton de test
function testButtonClick() {
    console.log("Bouton de test cliqué");
    alert("Le bouton de test fonctionne !");
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
            console.log(`Salle rejointe : ${roomId}`);
            currentRoom = roomId;
            updatePlayersList(players);
            updateChatMessages(messages);
            showGameArea('multiplayer-area');
        });

        socket.on('playerJoined', (players) => {
            console.log("Nouveau joueur rejoint");
            updatePlayersList(players);
        });

        socket.on('gameReady', (players) => {
            showGameMessage("La partie peut commencer !");
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

        socket.on('groupQuestReady', ({ questId, players }) => {
            showGameMessage(`La quête de groupe ${questId} est prête à commencer avec ${players.length} joueurs !`);
        });

        socket.on('guildCreated', ({ guildId, name }) => {
            showGameMessage(`La guilde "${name}" a été créée avec succès.`);
            updateGuildsList();
        });

        socket.on('guildJoined', ({ guildId, name }) => {
            showGameMessage(`Vous avez rejoint la guilde "${name}".`);
            updatePlayerGuildInfo();
        });

        socket.on('worldEventStarted', (event) => {
            showGameMessage(`Un événement mondial a commencé: ${event.name}. Durée: ${event.duration / 60} minutes. Récompense: ${event.reward}`);
        });

socket.on('connect', () => {
    console.log('Connecté au serveur');
    initializeAdditionalFeatures();
    console.log("Fonctionnalités supplémentaires initialisées après connexion");
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
        { id: 'open-shop', handler: openShop },
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
            button.addEventListener('click', () => {
                console.log(`Bouton ${id} cliqué`);
                handler();
            });
            console.log(`Écouteur ajouté pour ${id}`);
        } else {
            console.warn(`Bouton ${id} non trouvé`);
        }
    });

    // Ajout d'un écouteur global pour les clics
    document.addEventListener('click', (e) => {
        console.log(`Clic détecté sur l'élément:`, e.target);
    });
}

function loadCharacter() {
    console.log("Chargement du personnage...");
    const savedCharacter = localStorage.getItem('playerCharacter');
    if (savedCharacter) {
        player = JSON.parse(savedCharacter);
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
            player = new Character(name, 100, 10, 5);
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
    console.log("Démarrage du mode Aventure");
    const availableMissions = getAvailableMissions(); // Fonction à créer dans gameData.js
    displayMissionMenu(availableMissions); // Nouvelle fonction à créer
}

function startAdventure() {
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
    missions.forEach(mission => {
        const missionElement = document.createElement('div');
        missionElement.innerHTML = `
            <h3>${mission.name}</h3>
            <p>Difficulté: ${mission.difficulty}</p>
            <p>Récompense: ${mission.goldReward} or, ${mission.expReward} XP</p>
            <button onclick="selectMission(${missions.indexOf(mission)})">Commencer la mission</button>
        `;
        missionArea.appendChild(missionElement);
    });
    showGameArea('mission-area');
}

function selectMission(missionIndex) {
    const availableMissions = getAvailableMissions(player.level);
    const selectedMission = availableMissions[missionIndex];
    if (selectedMission) {
        const enemy = createEnemyForMission(selectedMission);
        initializeCombat(player, null, enemy, selectedMission);
        showGameArea('battle-area');
    } else {
        console.error("Mission non trouvée");
    }

function startDonjon() {
    console.log("Démarrage du mode Donjon");
    currentDonjonLevel = 1;
    showGameMessage("Vous entrez dans le donjon. Préparez-vous à affronter des défis !");
    nextDonjonEvent();
    showGameArea('donjon-area');
}

function openMultiplayer() {
    console.log("Ouverture du mode Multijoueur");
    showGameArea('multiplayer-area');
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

function openGuilds() {
    console.log("Ouverture des guildes");
    updateGuildsList();
    showGameArea('guild-area');
}

function openCrafting() {
    console.log("Ouverture de l'artisanat");
    updateCraftingRecipes();
    showGameArea('crafting-area');
}

function saveGame() {
    console.log("Sauvegarde du jeu");
    localStorage.setItem('playerCharacter', JSON.stringify(player));
    showGameMessage("Jeu sauvegardé avec succès !");
}

function loadGame() {
    console.log("Chargement du jeu");
    const savedCharacter = localStorage.getItem('playerCharacter');
    if (savedCharacter) {
        player = JSON.parse(savedCharacter);
        updatePlayerInfo();
        showGameMessage("Jeu chargé avec succès !");
    } else {
        showGameMessage("Aucune sauvegarde trouvée.");
    }
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

function updateShopInventory() {
    console.log("Mise à jour de l'inventaire de la boutique");
    // Implémentez cette fonction pour mettre à jour l'inventaire de la boutique
}

function updateCompanionsList() {
    console.log("Mise à jour de la liste des compagnons");
    // Implémentez cette fonction pour mettre à jour la liste des compagnons
}

function updateCraftingRecipes() {
    console.log("Mise à jour des recettes d'artisanat");
    // Implémentez cette fonction pour mettre à jour les recettes d'artisanat
}

function nextDonjonEvent() {
    const event = generateDonjonEvent(currentDonjonLevel);
    console.log("Nouvel événement de donjon :", event);
    // Implémentez la logique pour gérer l'événement du donjon
}

function showGameArea(areaId) {
    console.log(`Affichage de la zone de jeu : ${areaId}`);
    const gameAreas = document.querySelectorAll('.game-area');
    gameAreas.forEach(area => {
        if (area.id === areaId) {
            area.style.display = 'block';
            console.log(`Zone ${areaId} affichée`);
        } else {
            area.style.display = 'none';
            console.log(`Zone ${area.id} masquée`);
        }
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
    console.log("Mise à jour des informations du joueur");
    const playerInfoElement = document.getElementById('player-info');
    if (playerInfoElement && player) {
        playerInfoElement.innerHTML = `
            <p>Nom: ${player.name}</p>
            <p>Niveau: ${player.level}</p>
            <p>PV: ${player.hp}/${player.maxHp}</p>
            <p>Attaque: ${player.attack}</p>
            <p>Défense: ${player.defense}</p>
            <p>Or: ${player.gold}</p>
        `;
    }
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
    // Implémentez cette fonction pour mettre à jour le classement
}

function initializeGroupQuests() {
    console.log("Initialisation des quêtes de groupe");
    // Implémentez cette fonction pour initialiser les quêtes de groupe
}

function updateGuildsList() {
    console.log("Mise à jour de la liste des guildes");
    // Implémentez cette fonction pour mettre à jour la liste des guildes
}

function initializeCraftingSystem() {
    console.log("Initialisation du système d'artisanat");
    // Implémentez cette fonction pour initialiser le système d'artisanat
}

function startWorldEvent() {
    console.log("Démarrage d'un événement mondial");
    // Implémentez cette fonction pour démarrer un événement mondial
}

function getOtherPlayerId() {
    console.log("Récupération de l'ID de l'autre joueur");
    const playersList = document.getElementById('players-list');
    if (playersList && player) {
        const playerElements = playersList.children;
        for (let playerElement of playerElements) {
            const playerId = playerElement.dataset.playerId;
            if (playerId && playerId !== player.id) {
                return playerId;
            }
        }
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
    // Implémentation de l'affichage de l'inventaire pour l'échange
    // Cette fonction doit être implémentée en fonction de votre logique de jeu
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

function updateChatMessages(messages) {
    console.log("Mise à jour des messages du chat");
    const chatMessagesElement = document.getElementById('chat-messages');
    if (chatMessagesElement) {
        // Vider le contenu actuel
        chatMessagesElement.innerHTML = '';
        
        // Ajouter chaque message
        messages.forEach(message => {
            const messageElement = document.createElement('div');
            messageElement.className = 'chat-message';
            messageElement.innerHTML = `<strong>${message.sender}:</strong> ${message.content}`;
            chatMessagesElement.appendChild(messageElement);
        });

        // Faire défiler jusqu'au dernier message
        chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight;
    } else {
        console.error("Élément 'chat-messages' non trouvé");
    }
}

// Rendre certaines fonctions disponibles globalement si nécessaire
window.gameActions = {
    createCharacter,
    joinRoom,
    sendChatMessage,
    initiateChallenge,
    acceptChallenge,
    initiateTradeRequest,
    acceptTradeRequest,
    confirmTrade,
    cancelTrade,
    startAdventure,
    startDonjon,
    openMultiplayer,
    openShop,
    openInventory,
    manageCompanions,
    openGuilds,
    openCrafting,
    saveGame,
    loadGame
};

// Initialisation des écouteurs d'événements socket
function initializeSocketListeners() {
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
}

// Appel de la fonction d'initialisation des écouteurs socket
initializeSocketListeners();

console.log("Module de jeu multijoueur chargé");

// Exportations
export {
    initializeGame,
    createCharacter,
    startAdventure,
    startDonjon,
    openMultiplayer,
    openShop,
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
    playerAttack,
    playerDefend,
    playerUseSpecial,
    showGameArea,
    showGameMessage,
    updatePlayerInfo,
    updateLeaderboard,
    initializeGroupQuests,
    updateGuildsList,
    initializeCraftingSystem,
    startWorldEvent
};
