// game.js
import { Character, items, missions, getRandomMission, createEnemyForMission, calculateDamage, generateRandomLoot } from './gameData.js';
import { equipItem, unequipItem, useItem, updateInventoryDisplay, updateEquippedItemsDisplay, openShop, buyItem, sellItem, addItemToInventory } from './inventory.js';
import { initializeCombat, updateBattleInfo, playerAttack, playerDefend, playerUseSpecial, isCombatActive } from './combat.js';
import { generateDonjonEvent, generateDonjonBoss, generateBossReward } from './donjon.js';

let player;
let currentRoom;
let socket;

document.addEventListener('DOMContentLoaded', initializeGame);

function initializeGame() {
    console.log("Initializing game...");
    initializeSocket();
    initializeEventListeners();
    loadCharacter();
}


function initializeGame() {
    console.log("Initializing game...");
    initializeSocket();
    initializeEventListeners();
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
                const acceptChallengeButton = document.getElementById('accept-challenge');
                if (acceptChallengeButton) {
                    acceptChallengeButton.style.display = 'block';
                }
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
                const acceptTradeButton = document.getElementById('accept-trade');
                if (acceptTradeButton) {
                    acceptTradeButton.style.display = 'block';
                }
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

        // Nouvelles fonctionnalités
        socket.on('groupQuestReady', ({ questId, players }) => {
            showGameMessage(`La quête de groupe ${questId} est prête à commencer avec ${players.length} joueurs !`);
            // Logique pour démarrer la quête de groupe
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
            // Logique pour afficher un compte à rebours et les détails de l'événement
        });

    } catch (error) {
        console.error("Error initializing Socket.IO:", error);
    }
}

function initializeEventListeners() {
    const createCharacterButton = document.getElementById('create-character');
    if (createCharacterButton) {
        createCharacterButton.addEventListener('click', createCharacter);
    }

    const joinRoomButton = document.getElementById('join-room');
    if (joinRoomButton) {
        joinRoomButton.addEventListener('click', joinRoom);
    }

    const sendMessageButton = document.getElementById('send-message');
    if (sendMessageButton) {
        sendMessageButton.addEventListener('click', sendChatMessage);
    }

    const challengePlayerButton = document.getElementById('challenge-player');
    if (challengePlayerButton) {
        challengePlayerButton.addEventListener('click', initiateChallenge);
    }

    const acceptChallengeButton = document.getElementById('accept-challenge');
    if (acceptChallengeButton) {
        acceptChallengeButton.addEventListener('click', acceptChallenge);
    }

    const tradeRequestButton = document.getElementById('trade-request');
    if (tradeRequestButton) {
        tradeRequestButton.addEventListener('click', initiateTradeRequest);
    }

    const acceptTradeButton = document.getElementById('accept-trade');
    if (acceptTradeButton) {
        acceptTradeButton.addEventListener('click', acceptTradeRequest);
    }

    const confirmTradeButton = document.getElementById('confirm-trade');
    if (confirmTradeButton) {
        confirmTradeButton.addEventListener('click', confirmTrade);
    }

    const cancelTradeButton = document.getElementById('cancel-trade');
    if (cancelTradeButton) {
        cancelTradeButton.addEventListener('click', cancelTrade);
    }
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
    } else {
        console.error("L'élément 'hero-name' n'a pas été trouvé.");
    }
}

function joinRoom() {
    const roomIdInput = document.getElementById('room-id');
    if (roomIdInput) {
        const roomId = roomIdInput.value || 'fixed-room';
        if (player) {
            socket.emit('joinRoom', { roomId, playerInfo: { name: player.name, level: player.level } });
        } else {
            showGameMessage("Veuillez d'abord créer un personnage.");
        }
    } else {
        console.error("L'élément 'room-id' n'a pas été trouvé.");
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
    } else {
        console.error("L'élément 'players-list' n'a pas été trouvé.");
    }
}

function sendChatMessage() {
    const messageInput = document.getElementById('chat-input');
    if (messageInput) {
        const message = messageInput.value.trim();
        if (message && currentRoom) {
            socket.emit('chatMessage', { roomId: currentRoom, message: { sender: player.name, content: message } });
            messageInput.value = '';
        }
    } else {
        console.error("L'élément 'chat-input' n'a pas été trouvé.");
    }
}

function addChatMessage(message) {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        const messageElement = document.createElement('div');
        messageElement.textContent = `${message.sender}: ${message.content}`;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } else {
        console.error("L'élément 'chat-messages' n'a pas été trouvé.");
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

function offerTradeItem(itemId) {
    if (currentRoom) {
        socket.emit('offerTradeItem', { roomId: currentRoom, itemId });
    }
}

function showOfferedItem(itemId) {
    const item = items.find(i => i.id === itemId);
    if (item) {
        const offeredItemsElement = document.getElementById('offered-items');
        if (offeredItemsElement) {
            const itemElement = document.createElement('div');
            itemElement.textContent = item.name;
            offeredItemsElement.appendChild(itemElement);
        } else {
            console.error("L'élément 'offered-items' n'a pas été trouvé.");
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
        if (area.id === areaId) {
            area.style.display = 'block';
        } else {
            area.style.display = 'none';
        }
    });
}

function showGameMessage(message) {
    const gameMessages = document.getElementById('game-messages');
    if (gameMessages) {
        const messageElement = document.createElement('div');
        messageElement.textContent = message;
        gameMessages.appendChild(messageElement);
        gameMessages.scrollTop = gameMessages.scrollHeight;
    } else {
        console.error("L'élément 'game-messages' n'a pas été trouvé.");
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
    } else {
        console.error("L'élément 'player-info' n'a pas été trouvé ou le joueur n'est pas défini.");
    }
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
