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
    initializeEventListeners();
});

function initializeGame() {
    console.log("Initializing game...");
    initializeSocket();
    loadCharacter();
}

function initializeSocket() {
    try {
        socket = io();

        if (!socket) {
            console.error("Failed to initialize Socket.IO");
            return;
        }

        socket.on('connect', () => {
            console.log('Connected to server');
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
            console.log('Disconnected from server');
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

    } catch (error) {
        console.error("Error initializing Socket.IO:", error);
    }
}

function initializeEventListeners() {
    document.getElementById('create-character').addEventListener('click', createCharacter);
    document.getElementById('join-room').addEventListener('click', joinRoom);
    document.getElementById('send-message').addEventListener('click', sendChatMessage);
    document.getElementById('challenge-player').addEventListener('click', initiateChallenge);
    document.getElementById('accept-challenge').addEventListener('click', acceptChallenge);
    document.getElementById('trade-request').addEventListener('click', initiateTradeRequest);
    document.getElementById('accept-trade').addEventListener('click', acceptTradeRequest);
    document.getElementById('confirm-trade').addEventListener('click', confirmTrade);
    document.getElementById('cancel-trade').addEventListener('click', cancelTrade);
    document.getElementById('attack-button').addEventListener('click', playerAttack);
    document.getElementById('defend-button').addEventListener('click', playerDefend);
    document.getElementById('special-button').addEventListener('click', playerUseSpecial);
}

function loadCharacter() {
    const savedCharacter = localStorage.getItem('playerCharacter');
    if (savedCharacter) {
        player = JSON.parse(savedCharacter);
        updatePlayerInfo();
        showGameArea('multiplayer-area');
    } else {
        showGameArea('character-creation');
    }
}

function createCharacter() {
    const nameInput = document.getElementById('hero-name');
    if (nameInput) {
        const name = nameInput.value.trim();
        if (name) {
            player = new Character(name, 100, 10, 5);
            localStorage.setItem('playerCharacter', JSON.stringify(player));
            updatePlayerInfo();
            showGameArea('multiplayer-area');
        } else {
            showGameMessage("Veuillez entrer un nom pour votre personnage.");
        }
    }
}

function joinRoom() {
    const roomIdInput = document.getElementById('room-id');
    if (roomIdInput && player) {
        const roomId = roomIdInput.value || 'fixed-room';
        socket.emit('joinRoom', { roomId, playerInfo: { name: player.name, level: player.level } });
    } else {
        showGameMessage("Veuillez d'abord créer un personnage.");
    }
}

function updatePlayersList(players) {
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
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        const messageElement = document.createElement('div');
        messageElement.textContent = `${message.sender}: ${message.content}`;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

function initiateChallenge() {
    if (currentRoom && player) {
        socket.emit('initiateChallenge', { roomId: currentRoom, challengerId: player.id });
    } else {
        showGameMessage("Vous devez être dans une salle pour défier un joueur.");
    }
}

function acceptChallenge() {
    if (currentRoom && player) {
        socket.emit('acceptChallenge', { roomId: currentRoom, challengerId: player.id, accepterId: player.id });
    } else {
        showGameMessage("Vous ne pouvez pas accepter le défi en ce moment.");
    }
}

function startMultiplayerBattle(challengerId, accepterId) {
    showGameArea('battle-area');
    initializeCombat(player, null, { name: "Adversaire", hp: 100, attack: 10, defense: 5 }, null);
    updateBattleInfo();
}

function handleOpponentAction(action) {
    if (action.type === 'attack' && player) {
        const damage = calculateDamage(action.attacker, player);
        player.hp -= damage;
        showGameMessage(`L'adversaire vous inflige ${damage} dégâts.`);
        updateBattleInfo();
    }
}

function initiateTradeRequest() {
    const otherPlayerId = getOtherPlayerId();
    if (currentRoom && player && otherPlayerId) {
        socket.emit('initiateTradeRequest', { roomId: currentRoom, fromId: player.id, toId: otherPlayerId });
    } else {
        showGameMessage("Impossible d'initier l'échange en ce moment.");
    }
}

function acceptTradeRequest() {
    const otherPlayerId = getOtherPlayerId();
    if (currentRoom && player && otherPlayerId) {
        socket.emit('acceptTradeRequest', { roomId: currentRoom, fromId: otherPlayerId, toId: player.id });
    } else {
        showGameMessage("Impossible d'accepter l'échange en ce moment.");
    }
}

function startTrade(fromId, toId) {
    showGameArea('trade-area');
    displayTradeInventory();
}

function displayTradeInventory() {
    // Implémentation de l'affichage de l'inventaire pour l'échange
}

function showOfferedItem(itemId) {
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
    if (currentRoom) {
        socket.emit('confirmTrade', { roomId: currentRoom });
    }
}

function cancelTrade() {
    if (currentRoom) {
        socket.emit('cancelTrade', { roomId: currentRoom });
    }
}

function closeTrade() {
    showGameArea('multiplayer-area');
}

function getOtherPlayerId() {
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
    const gameAreas = document.querySelectorAll('.game-area');
    gameAreas.forEach(area => {
        area.style.display = area.id === areaId ? 'block' : 'none';
    });
}

function showGameMessage(message) {
    const gameMessages = document.getElementById('game-messages');
    if (gameMessages) {
        const messageElement = document.createElement('div');
        messageElement.textContent = message;
        gameMessages.appendChild(messageElement);
        gameMessages.scrollTop = gameMessages.scrollHeight;
    }
}

function updatePlayerInfo() {
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
    updateLeaderboard();
    initializeGroupQuests();
    updateGuildsList();
    initializeCraftingSystem();
    setTimeout(startWorldEvent, 3600000); // Premier événement après 1 heure
}

function updateLeaderboard() {
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
                <button onclick="joinGroupQuest(${quest.id})">Rejoindre</button>
            `;
            groupQuestsElement.appendChild(questElement);
        });
    }
}

function joinGroupQuest(questId) {
    if (socket && currentRoom && player) {
        socket.emit('joinGroupQuest', { roomId: currentRoom, questId, playerId: player.id });
        showGameMessage(`Vous avez rejoint la quête de groupe ${questId}. En attente d'autres joueurs...`);
    } else {
        showGameMessage("Impossible de rejoindre la quête pour le moment.");
    }
}

function updateGuildsList() {
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
                <button onclick="joinGuild(${guild.id})">Rejoindre</button>
            `;
            guildsListElement.appendChild(guildElement);
        });
    }
}

function createGuild() {
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
}

function joinGuild(guildId) {
    if (socket && player) {
        socket.emit('joinGuild', { guildId, playerId: player.id });
        showGameMessage(`Demande d'adhésion à la guilde envoyée.`);
    } else {
        showGameMessage("Impossible de rejoindre la guilde pour le moment.");
    }
}

function updatePlayerGuildInfo() {
    if (player && player.guild) {
        const guildInfoElement = document.getElementById('player-guild-info');
        if (guildInfoElement) {
            guildInfoElement.innerHTML = `
                <h3>Votre Guilde</h3>
                <p>Nom: ${player.guild.name}</p>
                <p>Rang: ${player.guild.rank}</p>
            `;
        }
    }
}

function initializeCraftingSystem() {
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
                <button onclick="craftItem(${recipe.id})">Fabriquer</button>
            `;
            craftingElement.appendChild(recipeElement);
        });
    }
}

function craftItem(recipeId) {
    // Cette fonction devrait vérifier si le joueur a les matériaux nécessaires
    // et créer l'objet s'il en a. Pour l'instant, on simule juste le processus.
    showGameMessage(`Tentative de fabrication de l'objet avec la recette ${recipeId}.`);
    // Exemple: addItemToInventory(player, { id: 'craftedSword', name: 'Épée fabriquée', type: 'weapon', attack: 15 });
}

function startWorldEvent() {
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
    joinGroupQuest,
    createGuild,
    joinGuild,
    craftItem
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
    joinGroupQuest,
    createGuild,
    joinGuild,
    craftItem
};

console.log("Module de jeu multijoueur chargé");
