// game.js
import { Character, items, missions, getRandomMission, createEnemyForMission, calculateDamage, generateRandomLoot } from './gameData.js';
import { equipItem, unequipItem, useItem, updateInventoryDisplay, updateEquippedItemsDisplay, openShop, buyItem, sellItem, addItemToInventory } from './inventory.js';
import { initializeCombat, updateBattleInfo, playerAttack, playerDefend, playerUseSpecial, isCombatActive } from './combat.js';
import { generateDonjonEvent, generateDonjonBoss, generateBossReward } from './donjon.js';

let player;
let currentRoom;
let socket;

document.addEventListener('DOMContentLoaded', () => {
    initializeGame();
});

function initializeGame() {
    socket = io();

    socket.on('roomJoined', ({ roomId, players, messages }) => {
        currentRoom = roomId;
        updatePlayersList(players);
        updateChatMessages(messages);
        showGameArea('multiplayer-area');
    });

    socket.on('playerJoined', (players) => {
        updatePlayersList(players);
    });

    socket.on('gameReady', (players) => {
        showGameMessage("La partie peut commencer !");
    });

    socket.on('newMessage', (message) => {
        addChatMessage(message);
    });

    socket.on('challengeReceived', ({ challengerId }) => {
        if (challengerId !== player.id) {
            showGameMessage(`${challengerId} vous défie en duel !`);
            document.getElementById('accept-challenge').style.display = 'block';
        }
    });

    socket.on('battleStart', ({ challengerId, accepterId }) => {
        if (player.id === challengerId || player.id === accepterId) {
            startMultiplayerBattle(challengerId, accepterId);
        }
    });

    socket.on('opponentAction', (action) => {
        handleOpponentAction(action);
    });

    socket.on('tradeRequestReceived', ({ fromId, toId }) => {
        if (player.id === toId) {
            showGameMessage(`${fromId} vous propose un échange !`);
            document.getElementById('accept-trade').style.display = 'block';
        }
    });

    socket.on('tradeStart', ({ fromId, toId }) => {
        if (player.id === fromId || player.id === toId) {
            startTrade(fromId, toId);
        }
    });

    socket.on('itemOffered', ({ fromId, itemId }) => {
        if (fromId !== player.id) {
            showOfferedItem(itemId);
        }
    });

    socket.on('tradeConfirmed', ({ playerId }) => {
        if (playerId !== player.id) {
            showGameMessage("L'autre joueur a confirmé l'échange.");
        }
    });

    socket.on('tradeCancelled', ({ playerId }) => {
        showGameMessage("L'échange a été annulé.");
        closeTrade();
    });

    socket.on('playerLeft', (playerId) => {
        showGameMessage(`Le joueur ${playerId} a quitté la partie.`);
        updatePlayersList(players.filter(p => p.id !== playerId));
    });

    document.getElementById('create-character').addEventListener('click', createCharacter);
    document.getElementById('join-room').addEventListener('click', joinRoom);
    document.getElementById('send-message').addEventListener('click', sendChatMessage);
    document.getElementById('challenge-player').addEventListener('click', initiateChallenge);
    document.getElementById('accept-challenge').addEventListener('click', acceptChallenge);
    document.getElementById('trade-request').addEventListener('click', initiateTradeRequest);
    document.getElementById('accept-trade').addEventListener('click', acceptTradeRequest);
    document.getElementById('confirm-trade').addEventListener('click', confirmTrade);
    document.getElementById('cancel-trade').addEventListener('click', cancelTrade);
}

function createCharacter() {
    const name = document.getElementById('hero-name').value;
    player = new Character(name, 100, 10, 5);
    showGameArea('multiplayer-area');
}

function joinRoom() {
    const roomId = document.getElementById('room-id').value || 'fixed-room';
    socket.emit('joinRoom', { roomId, playerInfo: { name: player.name, level: player.level } });
}

function updatePlayersList(players) {
    const playersList = document.getElementById('players-list');
    playersList.innerHTML = '';
    players.forEach(p => {
        const playerElement = document.createElement('div');
        playerElement.textContent = `${p.name} (Niveau ${p.level})`;
        playersList.appendChild(playerElement);
    });
}

function sendChatMessage() {
    const messageInput = document.getElementById('chat-input');
    const message = messageInput.value;
    if (message) {
        socket.emit('chatMessage', { roomId: currentRoom, message: { sender: player.name, content: message } });
        messageInput.value = '';
    }
}

function addChatMessage(message) {
    const chatMessages = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.textContent = `${message.sender}: ${message.content}`;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function initiateChallenge() {
    socket.emit('initiateChallenge', { roomId: currentRoom, challengerId: player.id });
}

function acceptChallenge() {
    socket.emit('acceptChallenge', { roomId: currentRoom, challengerId: player.id, accepterId: player.id });
}

function startMultiplayerBattle(challengerId, accepterId) {
    // Initialiser le combat multijoueur
    showGameArea('battle-area');
    initializeCombat(player, null, { name: "Adversaire", hp: 100, attack: 10, defense: 5 }, null);
    updateBattleInfo();
}

function handleOpponentAction(action) {
    // Gérer l'action de l'adversaire dans le combat
    if (action.type === 'attack') {
        const damage = calculateDamage(action.attacker, player);
        player.hp -= damage;
        showGameMessage(`L'adversaire vous inflige ${damage} dégâts.`);
    }
    updateBattleInfo();
}

function initiateTradeRequest() {
    const otherPlayerId = getOtherPlayerId();
    socket.emit('initiateTradeRequest', { roomId: currentRoom, fromId: player.id, toId: otherPlayerId });
}

function acceptTradeRequest() {
    const otherPlayerId = getOtherPlayerId();
    socket.emit('acceptTradeRequest', { roomId: currentRoom, fromId: otherPlayerId, toId: player.id });
}

function startTrade(fromId, toId) {
    showGameArea('trade-area');
    // Afficher les inventaires pour l'échange
    displayTradeInventory();
}

function offerTradeItem(itemId) {
    socket.emit('offerTradeItem', { roomId: currentRoom, itemId });
}

function showOfferedItem(itemId) {
    // Afficher l'objet offert par l'autre joueur
    const item = items.find(i => i.id === itemId);
    if (item) {
        const offeredItemsElement = document.getElementById('offered-items');
        const itemElement = document.createElement('div');
        itemElement.textContent = item.name;
        offeredItemsElement.appendChild(itemElement);
    }
}

function confirmTrade() {
    socket.emit('confirmTrade', { roomId: currentRoom });
}

function cancelTrade() {
    socket.emit('cancelTrade', { roomId: currentRoom });
}

function closeTrade() {
    showGameArea('multiplayer-area');
}

function getOtherPlayerId() {
    // Logique pour obtenir l'ID de l'autre joueur dans la salle
    const players = document.getElementById('players-list').children;
    for (let playerElement of players) {
        const playerId = playerElement.dataset.playerId;
        if (playerId !== player.id) {
            return playerId;
        }
    }
    return null;
}

function showGameArea(areaId) {
    const gameAreas = document.querySelectorAll('.game-area');
    gameAreas.forEach(area => area.style.display = 'none');
    document.getElementById(areaId).style.display = 'block';
}

function showGameMessage(message) {
    const gameMessages = document.getElementById('game-messages');
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    gameMessages.appendChild(messageElement);
    gameMessages.scrollTop = gameMessages.scrollHeight;
}

function updatePlayerInfo() {
    const playerInfoElement = document.getElementById('player-info');
    playerInfoElement.innerHTML = `
        <p>Nom: ${player.name}</p>
        <p>Niveau: ${player.level}</p>
        <p>PV: ${player.hp}/${player.maxHp}</p>
        <p>Attaque: ${player.attack}</p>
        <p>Défense: ${player.defense}</p>
        <p>Or: ${player.gold}</p>
    `;
}

// Exposer les fonctions nécessaires globalement
window.player = player;
window.equipItem = equipItem;
window.unequipItem = unequipItem;
window.useItem = useItem;
window.updateInventoryDisplay = updateInventoryDisplay;
window.updateEquippedItemsDisplay = updateEquippedItemsDisplay;
window.openShop = openShop;
window.buyItem = buyItem;
window.sellItem = sellItem;
window.addItemToInventory = addItemToInventory;
window.playerAttack = playerAttack;
window.playerDefend = playerDefend;
window.playerUseSpecial = playerUseSpecial;
window.updatePlayerInfo = updatePlayerInfo;
window.showGameMessage = showGameMessage;
window.showGameArea = showGameArea;

console.log("Module de jeu multijoueur chargé");

console.log("Module de jeu multijoueur chargé");

// Fonctions pour le système de classement
function updateLeaderboard() {
    // Simuler une requête au serveur pour obtenir le classement
    const leaderboardData = [
        { name: "Joueur1", level: 10, score: 1000 },
        { name: "Joueur2", level: 9, score: 950 },
        { name: "Joueur3", level: 8, score: 900 },
    ];

    const leaderboardElement = document.getElementById('leaderboard');
    leaderboardElement.innerHTML = '<h3>Classement</h3>';
    leaderboardData.forEach((player, index) => {
        const playerElement = document.createElement('div');
        playerElement.textContent = `${index + 1}. ${player.name} (Niveau ${player.level}) - Score: ${player.score}`;
        leaderboardElement.appendChild(playerElement);
    });
}

// Fonctions pour les quêtes de groupe
function initializeGroupQuests() {
    const groupQuestsElement = document.getElementById('group-quests');
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
            <button onclick="joinGroupQuest(${quest.id})">Rejoindre</button>
        `;
        groupQuestsElement.appendChild(questElement);
    });
}

function joinGroupQuest(questId) {
    socket.emit('joinGroupQuest', { roomId: currentRoom, questId, playerId: player.id });
    showGameMessage(`Vous avez rejoint la quête de groupe ${questId}. En attente d'autres joueurs...`);
}

// Gestion des événements de quête de groupe
socket.on('groupQuestReady', ({ questId, players }) => {
    showGameMessage(`La quête de groupe ${questId} est prête à commencer avec ${players.length} joueurs !`);
    // Ici, vous pouvez ajouter la logique pour démarrer la quête de groupe
});

// Fonctions pour le système de guildes
function createGuild() {
    const guildName = document.getElementById('guild-name-input').value;
    if (guildName) {
        socket.emit('createGuild', { name: guildName, founderId: player.id });
        showGameMessage(`Vous avez créé la guilde "${guildName}".`);
    } else {
        showGameMessage("Veuillez entrer un nom de guilde valide.");
    }
}

function joinGuild(guildId) {
    socket.emit('joinGuild', { guildId, playerId: player.id });
    showGameMessage(`Demande d'adhésion à la guilde envoyée.`);
}

// Gestion des événements de guilde
socket.on('guildCreated', ({ guildId, name }) => {
    showGameMessage(`La guilde "${name}" a été créée avec succès.`);
    updateGuildsList();
});

socket.on('guildJoined', ({ guildId, name }) => {
    showGameMessage(`Vous avez rejoint la guilde "${name}".`);
    updatePlayerGuildInfo();
});

function updateGuildsList() {
    // Simuler une requête au serveur pour obtenir la liste des guildes
    const guilds = [
        { id: 1, name: "Les Chevaliers de l'Aube", members: 10 },
        { id: 2, name: "La Confrérie des Ombres", members: 8 },
        { id: 3, name: "Les Gardiens de la Nature", members: 12 }
    ];

    const guildsListElement = document.getElementById('guilds-list');
    guildsListElement.innerHTML = '<h3>Guildes</h3>';
    guilds.forEach(guild => {
        const guildElement = document.createElement('div');
        guildElement.innerHTML = `
            <h4>${guild.name}</h4>
            <p>Membres: ${guild.members}</p>
            <button onclick="joinGuild(${guild.id})">Rejoindre</button>
        `;
        guildsListElement.appendChild(guildElement);
    });
}

function updatePlayerGuildInfo() {
    // Mettre à jour les informations de guilde du joueur
    if (player.guild) {
        const guildInfoElement = document.getElementById('player-guild-info');
        guildInfoElement.innerHTML = `
            <h3>Votre Guilde</h3>
            <p>Nom: ${player.guild.name}</p>
            <p>Rang: ${player.guild.rank}</p>
        `;
    }
}

// Fonctions pour le système de craft
function initializeCraftingSystem() {
    const craftingRecipes = [
        { id: 1, name: "Épée en acier", materials: { iron: 5, wood: 2 }, result: "sword" },
        { id: 2, name: "Potion de soin", materials: { herb: 3, water: 1 }, result: "healingPotion" },
        { id: 3, name: "Arc elfique", materials: { wood: 4, magicEssence: 2 }, result: "elfBow" }
    ];

    const craftingElement = document.getElementById('crafting-recipes');
    craftingRecipes.forEach(recipe => {
        const recipeElement = document.createElement('div');
        recipeElement.innerHTML = `
            <h4>${recipe.name}</h4>
            <p>Matériaux requis: ${Object.entries(recipe.materials).map(([item, count]) => `${count} ${item}`).join(', ')}</p>
            <button onclick="craftItem(${recipe.id})">Fabriquer</button>
        `;
        craftingElement.appendChild(recipeElement);
    });
}

function craftItem(recipeId) {
    // Vérifier si le joueur a les matériaux nécessaires
    // Si oui, créer l'objet et l'ajouter à l'inventaire
    // Sinon, afficher un message d'erreur
    showGameMessage(`Tentative de fabrication de l'objet avec la recette ${recipeId}.`);
    // Exemple: addItemToInventory(player, { id: 'craftedSword', name: 'Épée fabriquée', type: 'weapon', attack: 15 });
}

// Fonctions pour les événements mondiaux
function startWorldEvent() {
    const worldEvents = [
        { id: 1, name: "Invasion de démons", duration: 3600, reward: "Équipement démoniaque" },
        { id: 2, name: "Festival de la moisson", duration: 7200, reward: "Potions de buff rares" },
        { id: 3, name: "Chasse au trésor royale", duration: 5400, reward: "Or et objets précieux" }
    ];

    const event = worldEvents[Math.floor(Math.random() * worldEvents.length)];
    socket.emit('startWorldEvent', event);
}

socket.on('worldEventStarted', (event) => {
    showGameMessage(`Un événement mondial a commencé: ${event.name}. Durée: ${event.duration / 60} minutes. Récompense: ${event.reward}`);
    // Ajouter la logique pour afficher un compte à rebours et les détails de l'événement
});

// Initialisation des nouvelles fonctionnalités
function initializeAdditionalFeatures() {
    updateLeaderboard();
    initializeGroupQuests();
    updateGuildsList();
    initializeCraftingSystem();
    // Mettre en place un intervalle pour vérifier et démarrer des événements mondiaux
    setInterval(startWorldEvent, 3600000); // Vérifier toutes les heures
}

// Appeler cette fonction après la connexion du joueur
initializeAdditionalFeatures();

// Exposer les nouvelles fonctions globalement si nécessaire
window.joinGroupQuest = joinGroupQuest;
window.createGuild = createGuild;
window.joinGuild = joinGuild;
window.craftItem = craftItem;
