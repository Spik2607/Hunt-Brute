// game.js
console.log("Chargement du module de jeu multijoueur...");

import { Character, items, missions, getRandomMission, createEnemyForMission, calculateDamage, generateRandomLoot } from './gameData.js';
import { equipItem, unequipItem, useItem, updateInventoryDisplay, updateEquippedItemsDisplay, openShop, buyItem, sellItem, addItemToInventory } from './inventory.js';
import { initializeCombat, updateBattleInfo, playerAttack, playerDefend, playerUseSpecial, isCombatActive } from './combat.js';
import { generateDonjonEvent, generateDonjonBoss, generateBossReward } from './donjon.js';

let player;
let currentRoom;
let socket;

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM chargé, initialisation du jeu...");
    initializeGame();
    initializeEventListeners();
    console.log("Initialisation terminée, tentative de lancement du jeu");
    launchGame();  // Ajoutez cette fonction
});

function launchGame() {
    console.log("Tentative de lancement du jeu");
    // Ajoutez ici le code pour lancer effectivement votre jeu
    showGameArea('character-creation');  // ou 'multiplayer-area' selon votre logique
    console.log("Zone de jeu affichée");
}

function initializeGame() {
    console.log("Initialisation du jeu...");
    initializeSocket();
    loadCharacter();
    console.log("Initialisation du jeu terminée");
}

function initializeEventListeners() {
    console.log("Initialisation des écouteurs d'événements...");
    const buttons = [
        { id: 'create-character', handler: createCharacter },
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
        { id: 'special-button', handler: playerUseSpecial }
        const testButton = document.getElementById('test-button');
if (testButton) {
    testButton.addEventListener('click', () => {
        console.log("Bouton de test cliqué");
        alert("Le bouton de test fonctionne !");
    });
}
    ];

    buttons.forEach(({ id, handler }) => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('click', handler);
            console.log(`Écouteur d'événement ajouté à ${id}`);
        } else {
            console.warn(`Élément avec l'id '${id}' non trouvé`);
        }
    });
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

function updatePlayersList(players) {
    console.log("Mise à jour de la liste des joueurs");
    const playersList = document.getElementById('players-list');
    if (playersList) {
        playersList.innerHTML = '';
        players.forEach(p => {
            const playerElement = document.createElement('div');
            playerElement.textContent = `${p.name} (Niveau ${p.level})`;
            playersList.appendChild(playerElement);
        });
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

function startTrade(fromId, toId) {
    console.log("Début d'un échange");
    showGameArea('trade-area');
    displayTradeInventory();
}

function displayTradeInventory() {
    console.log("Affichage de l'inventaire d'échange");
    // Implémentation de l'affichage de l'inventaire pour l'échange
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

function closeTrade() {
    console.log("Fermeture de l'échange");
    showGameArea('multiplayer-area');
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

function showGameArea(areaId) {
    console.log(`Tentative d'affichage de la zone : ${areaId}`);
    const gameAreas = document.querySelectorAll('.game-area');
    gameAreas.forEach(area => {
        if (area.id === areaId) {
            area.style.display = 'block';
            console.log(`Zone ${areaId} affichée`);
        } else {
            area.style.display = 'none';
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
    const leaderboardData = [
        { name: "Joueur1", level: 10, score: 1000 },
        { name: "Joueur2", level: 9, score: 950 },
        { name: "Joueur3", level: 8, score: 900 },
    ];

    const leaderboardElement = document.getElementById('leaderboard');
    if (leaderboardElement) {
        leaderboardElement.innerHTML = '<h3>Classement</h3>';
        leaderboardData.forEach((player, index) => {
            const playerElement = document.createElement('div');
            playerElement.textContent = `${index + 1}. ${player.name} (Niveau ${player.level}) - Score: ${player.score}`;
            leaderboardElement.appendChild(playerElement);
        });
    }
}

function initializeGroupQuests() {
    console.log("Initialisation des quêtes de groupe");
    const groupQuestsElement = document.getElementById('group-quests');
    if (groupQuestsElement) {
        const quests = [
            { id: 1, name: "Vaincre le dragon ancien", minPlayers: 3, reward: "1000 or et une arme légendaire" },
            { id: 2, name: "Explorer le donjon maudit", minPlayers: 2, reward: "500 or et un grimoire rare" },
            { id: 3, name: "Défendre le village contre une horde de gobelins", minPlayers: 4, reward: "750 or et une armure d'élite" }
        ];

        quests.forEach(quest => {
            const questElement = document.createElement('div');
            questElement.innerHTML = `
                <h4>${quest.name}</h4>
                <p>Joueurs requis: ${quest.minPlayers}</p>
                <p>Récompense: ${quest.reward}</p>
                <button onclick="window.gameActions.joinGroupQuest(${quest.id})">Rejoindre</button>
            `;
            groupQuestsElement.appendChild(questElement);
        });
    }
}

function updateGuildsList() {
    console.log("Mise à jour de la liste des guildes");
    const guilds = [
        { id: 1, name: "Les Chevaliers de l'Aube", members: 10 },
        { id: 2, name: "La Confrérie des Ombres", members: 8 },
        { id: 3, name: "Les Gardiens de la Nature", members: 12 }
    ];

    const guildsListElement = document.getElementById('guilds-list');
    if (guildsListElement) {
        guildsListElement.innerHTML = '<h3>Guildes</h3>';
        guilds.forEach(guild => {
            const guildElement = document.createElement('div');
            guildElement.innerHTML = `
                <h4>${guild.name}</h4>
                <p>Membres: ${guild.members}</p>
                <button onclick="window.gameActions.joinGuild(${guild.id})">Rejoindre</button>
            `;
            guildsListElement.appendChild(guildElement);
        });
    }
}

function initializeCraftingSystem() {
    console.log("Initialisation du système d'artisanat");
    const craftingRecipes = [
        { id: 1, name: "Épée en acier", materials: { iron: 5, wood: 2 }, result: "sword" },
        { id: 2, name: "Potion de soin", materials: { herb: 3, water: 1 }, result: "healingPotion" },
        { id: 3, name: "Arc elfique", materials: { wood: 4, magicEssence: 2 }, result: "elfBow" }
    ];

    const craftingElement = document.getElementById('crafting-recipes');
    if (craftingElement) {
        craftingRecipes.forEach(recipe => {
            const recipeElement = document.createElement('div');
            recipeElement.innerHTML = `
                <h4>${recipe.name}</h4>
                <p>Matériaux requis: ${Object.entries(recipe.materials).map(([item, count]) => `${count} ${item}`).join(', ')}</p>
                <button onclick="window.gameActions.craftItem(${recipe.id})">Fabriquer</button>
            `;
            craftingElement.appendChild(recipeElement);
        });
    }
}

function startWorldEvent() {
    console.log("Démarrage d'un événement mondial");
    const worldEvents = [
        { id: 1, name: "Invasion de démons", duration: 3600, reward: "Équipement démoniaque" },
        { id: 2, name: "Festival de la moisson", duration: 7200, reward: "Potions de buff rares" },
        { id: 3, name: "Chasse au trésor royale", duration: 5400, reward: "Or et objets précieux" }
    ];

    const event = worldEvents[Math.floor(Math.random() * worldEvents.length)];
    if (socket) {
        socket.emit('startWorldEvent', event);
    }
}

// Fonctions exportées pour être utilisées dans le HTML
export {
    playerAttack,
    playerDefend,
    playerUseSpecial,
    equipItem,
    unequipItem,
    useItem,
    buyItem,
    sellItem,
    joinRoom,
    sendChatMessage,
    initiateChallenge,
    acceptChallenge,
    initiateTradeRequest,
    acceptTradeRequest,
    confirmTrade,
    cancelTrade
};

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
    joinGroupQuest: (questId) => {
        console.log(`Rejoindre la quête de groupe ${questId}`);
        if (socket && currentRoom && player) {
            socket.emit('joinGroupQuest', { roomId: currentRoom, questId, playerId: player.id });
            showGameMessage(`Vous avez rejoint la quête de groupe ${questId}. En attente d'autres joueurs...`);
        } else {
            showGameMessage("Impossible de rejoindre la quête pour le moment.");
        }
    },
    createGuild: () => {
        console.log("Créer une guilde");
        const guildNameInput = document.getElementById('guild-name-input');
        if (guildNameInput && socket && player) {
            const guildName = guildNameInput.value.trim();
            if (guildName) {
                socket.emit('createGuild', { name: guildName, founderId: player.id });
                showGameMessage(`Vous avez créé la guilde "${guildName}".`);
            } else {
                showGameMessage("Veuillez entrer un nom de guilde valide.");
            }
        } else {
            console.error("Éléments nécessaires pour créer une guilde non trouvés.");
        }
    },
    joinGuild: (guildId) => {
        console.log(`Rejoindre la guilde ${guildId}`);
        if (socket && player) {
            socket.emit('joinGuild', { guildId, playerId: player.id });
            showGameMessage(`Demande d'adhésion à la guilde envoyée.`);
        } else {
            showGameMessage("Impossible de rejoindre la guilde pour le moment.");
        }
    },
    craftItem: (recipeId) => {
        console.log(`Fabriquer l'objet avec la recette ${recipeId}`);
        showGameMessage(`Tentative de fabrication de l'objet avec la recette ${recipeId}.`);
        // Ici, vous pouvez ajouter la logique réelle de fabrication
    }
};

console.log("Module de jeu multijoueur chargé");
