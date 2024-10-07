const socket = io('https://hunt-brute-server.onrender.com');

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
    }

    attackEnemy(enemy) {
        const damage = Math.max(this.attack - enemy.defense, 0);
        enemy.takeDamage(damage);
        return damage;
    }

    takeDamage(damage) {
        this.hp = Math.max(this.hp - damage, 0);
    }

    isDefeated() {
        return this.hp <= 0;
    }

    gainExperience(amount) {
        this.experience += amount;
        if (this.experience >= this.level * 100) {
            this.levelUp();
        }
    }

    levelUp() {
        this.level++;
        this.maxHp += 10;
        this.hp = this.maxHp;
        this.attack += 2;
        this.defense += 1;
        this.experience = 0;
        log(`${this.name} est monté au niveau ${this.level}!`);
    }

    gainGold(amount) {
        this.gold += amount;
        updatePlayerInfo();
    }

    buyItem(item) {
        if (this.gold >= item.cost) {
            this.gold -= item.cost;
            this.inventory.push(item);
            item.apply(this);
            updatePlayerInfo();
            return true;
        }
        return false;
    }

    useItem(itemIndex) {
        if (itemIndex >= 0 && itemIndex < this.inventory.length) {
            const item = this.inventory[itemIndex];
            item.apply(this);
            if (item.isConsumable) {
                this.inventory.splice(itemIndex, 1);
            }
            updateInventory();
            updatePlayerInfo();
            log(`Vous avez utilisé ${item.name}.`);
        }
    }
}

class Item {
    constructor(name, cost, statBoost, statValue, isConsumable = false) {
        this.name = name;
        this.cost = cost;
        this.statBoost = statBoost;
        this.statValue = statValue;
        this.isConsumable = isConsumable;
    }

    apply(character) {
        character[this.statBoost] += this.statValue;
        if (this.statBoost === 'maxHp') {
            character.hp = Math.min(character.hp + this.statValue, character.maxHp);
        }
    }
}

class Mission {
    constructor(description, enemyLevel, goldReward, expReward) {
        this.description = description;
        this.enemyLevel = enemyLevel;
        this.goldReward = goldReward;
        this.expReward = expReward;
    }
}

let player, enemy;
let currentMission;
let gameMode = 'solo';
let roomId = null;

const gameAreas = {
    mainMenu: document.getElementById('main-menu'),
    characterCreation: document.getElementById('character-creation'),
    soloMenu: document.getElementById('solo-menu'),
    missionArea: document.getElementById('mission-area'),
    shop: document.getElementById('shop'),
    waitingArea: document.getElementById('waiting-area'),
    inventoryArea: document.getElementById('inventory-area'),
};

const shopItems = [
    new Item("Épée en fer", 50, "attack", 5),
    new Item("Armure en cuir", 50, "defense", 5),
    new Item("Potion de vie", 30, "maxHp", 20, true),
];

const missions = [
    new Mission("Éliminer les gobelins", 1, 20, 30),
    new Mission("Chasser le loup géant", 2, 40, 50),
    new Mission("Vaincre le bandit", 3, 60, 70),
];

// Événements pour la création de personnage
document.getElementById('create-character').addEventListener('click', createCharacter);
document.querySelectorAll('#character-creation input[type="number"]').forEach(input => {
    input.addEventListener('change', updateAvailablePoints);
});

// Événements pour le menu solo
document.getElementById('start-mission').addEventListener('click', startRandomMission);
document.getElementById('open-shop').addEventListener('click', openShop);
document.getElementById('leave-shop').addEventListener('click', () => showGameArea('soloMenu'));
document.getElementById('open-inventory').addEventListener('click', openInventory);
document.getElementById('close-inventory').addEventListener('click', () => showGameArea('soloMenu'));

// Événements pour le combat
document.getElementById('attack-button').addEventListener('click', playerAttack);

// Fonctions pour la création de personnage
function updateAvailablePoints() {
    const totalPoints = 15;
    const usedPoints = ['hp', 'attack', 'defense'].reduce((sum, stat) => {
        return sum + parseInt(document.getElementById(`stat-${stat}`).value || 0);
    }, 0);
    document.getElementById('available-points').textContent = totalPoints - usedPoints;
}

function createCharacter() {
    const name = document.getElementById('hero-name').value;
    const hp = parseInt(document.getElementById('stat-hp').value) * 10 + 100;
    const attack = parseInt(document.getElementById('stat-attack').value) + 10;
    const defense = parseInt(document.getElementById('stat-defense').value) + 5;

    if (name && hp && attack && defense) {
        player = new Character(name, hp, attack, defense);
        showGameArea('soloMenu');
        updatePlayerInfo();
    } else {
        alert("Veuillez remplir tous les champs correctement.");
    }
}

// Fonctions pour le menu solo
function updatePlayerInfo() {
    const playerInfo = document.getElementById('player-info');
    playerInfo.innerHTML = `
        <h3>${player.name}</h3>
        <p>Niveau: ${player.level}</p>
        <div class="progress-bar">
            <div class="progress-bar-fill" style="width: ${(player.hp / player.maxHp) * 100}%"></div>
        </div>
        <p>PV: ${player.hp}/${player.maxHp}</p>
        <p>Attaque: ${player.attack}</p>
        <p>Défense: ${player.defense}</p>
        <div class="progress-bar">
            <div class="progress-bar-fill" style="width: ${(player.experience / (player.level * 100)) * 100}%"></div>
        </div>
        <p>Expérience: ${player.experience}/${player.level * 100}</p>
        <p>Or: ${player.gold}</p>
    `;
}

function startRandomMission() {
    currentMission = missions[Math.floor(Math.random() * missions.length)];
    enemy = new Character("Ennemi", 
        currentMission.enemyLevel * 50, 
        currentMission.enemyLevel * 5, 
        currentMission.enemyLevel * 2
    );
    showGameArea('missionArea');
    document.getElementById('mission-description').textContent = currentMission.description;
    updateStats();
    log(`Vous commencez la mission: ${currentMission.description}`);
}

function openShop() {
    showGameArea('shop');
    const shopItemsDiv = document.getElementById('shop-items');
    shopItemsDiv.innerHTML = '';
    shopItems.forEach(item => {
        const itemButton = document.createElement('button');
        itemButton.textContent = `${item.name} - ${item.cost} or`;
        itemButton.onclick = () => buyItem(item);
        shopItemsDiv.appendChild(itemButton);
    });
}

function buyItem(item) {
    if (player.buyItem(item)) {
        log(`Vous avez acheté ${item.name} pour ${item.cost} or.`);
    } else {
        log("Vous n'avez pas assez d'or pour cet objet.");
    }
}

function openInventory() {
    showGameArea('inventoryArea');
    updateInventory();
}

function updateInventory() {
    const inventoryDiv = document.getElementById('inventory');
    inventoryDiv.innerHTML = '';
    player.inventory.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'inventory-item';
        itemDiv.textContent = item.name;
        if (item.isConsumable) {
            const useButton = document.createElement('button');
            useButton.textContent = 'Utiliser';
            useButton.onclick = () => player.useItem(index);
            itemDiv.appendChild(useButton);
        }
        inventoryDiv.appendChild(itemDiv);
    });
}

// Fonctions de combat
function playerAttack() {
    if (player.isDefeated() || enemy.isDefeated()) return;

    const damage = player.attackEnemy(enemy);
    log(`${player.name} inflige ${damage} dégâts à ${enemy.name}`);

    // Animation d'attaque
    const enemyStats = document.getElementById('enemy-stats');
    enemyStats.style.animation = 'shake 0.5s';
    setTimeout(() => {
        enemyStats.style.animation = '';
    }, 500);

    if (enemy.isDefeated()) {
        endMission(true);
    } else {
        setTimeout(enemyAttack, 1000);
    }

    updateStats();
}

function enemyAttack() {
    const damage = enemy.attackEnemy(player);
    log(`${enemy.name} inflige ${damage} dégâts à ${player.name}`);

    // Animation d'attaque
    const playerStats = document.getElementById('player-stats');
    playerStats.style.animation = 'shake 0.5s';
    setTimeout(() => {
        playerStats.style.animation = '';
    }, 500);

    if (player.isDefeated()) {
        endMission(false);
    }

    updateStats();
}

function endMission(playerWon) {
    if (playerWon) {
        log(`Vous avez vaincu ${enemy.name}! Mission accomplie!`);
        player.gainExperience(currentMission.expReward);
        player.gainGold(currentMission.goldReward);
        log(`Vous gagnez ${currentMission.expReward} points d'expérience et ${currentMission.goldReward} or.`);
    } else {
        log("Vous avez été vaincu... La mission est un échec.");
    }
    setTimeout(() => showGameArea('soloMenu'), 3000);
}

// Fonctions utilitaires
function showGameArea(areaName) {
    Object.values(gameAreas).forEach(area => area.style.display = 'none');
    gameAreas[areaName].style.display = 'block';
}

function updateStats() {
    document.getElementById('player-stats').innerHTML = `
        ${player.name} (Niveau ${player.level})<br>
        <div class="progress-bar">
            <div class="progress-bar-fill" style="width: ${(player.hp / player.maxHp) * 100}%"></div>
        </div>
        PV: ${player.hp}/${player.maxHp}<br>
        ATT: ${player.attack} | DEF: ${player.defense}
    `;
    document.getElementById('enemy-stats').innerHTML = `
        ${enemy.name}<br>
        <div class="progress-bar">
            <div class="progress-bar-fill" style="width: ${(enemy.hp / enemy.maxHp) * 100}%"></div>
        </div>
        PV: ${enemy.hp}/${enemy.maxHp}<br>
        ATT: ${enemy.attack} | DEF: ${enemy.defense}
    `;
}

function log(message) {
    const battleLog = document.getElementById('battle-log');
    battleLog.innerHTML += `<p>${message}</p>`;
    battleLog.scrollTop = battleLog.scrollHeight;
}

// Initialisation
document.getElementById('start-solo').addEventListener('click', () => {
    gameMode = 'solo';
    showGameArea('characterCreation');
});

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    showGameArea('mainMenu');
});

// Ajout d'une animation de shake
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0% { transform: translate(1px, 1px) rotate(0deg); }
        10% { transform: translate(-1px, -2px) rotate(-1deg); }
        20% { transform: translate(-3px, 0px) rotate(1deg); }
        30% { transform: translate(3px, 2px) rotate(0deg); }
        40% { transform: translate(1px, -1px) rotate(1deg); }
        50% { transform: translate(-1px, 2px) rotate(-1deg); }
        60% { transform: translate(-3px, 1px) rotate(0deg); }
        70% { transform: translate(3px, 1px) rotate(-1deg); }
        80% { transform: translate(-1px, -1px) rotate(1deg); }
        90% { transform: translate(1px, 2px) rotate(0deg); }
        100% { transform: translate(1px, -2px) rotate(-1deg); }
    }
`;
document.head.appendChild(style);

// Code pour le mode multijoueur (à conserver si vous souhaitez garder cette fonctionnalité)
createRoomBtn.addEventListener('click', () => {
    roomId = roomIdInput.value;
    socket.emit('createRoom', roomId);
});

joinRoomBtn.addEventListener('click', () => {
    roomId = roomIdInput.value;
    socket.emit('joinRoom', roomId);
});

socket.on('roomCreated', (createdRoomId) => {
    console.log(`Salle créée: ${createdRoomId}`);
    gameMode = 'multi';
    gameArea.style.display = 'none';
    waitingArea.style.display = 'block';
});

socket.on('roomJoined', (joinedRoomId) => {
    console.log(`Salle rejointe: ${joinedRoomId}`);
    gameMode = 'multi';
    gameArea.style.display = 'none';
    waitingArea.style.display = 'block';
});

socket.on('roomError', (error) => {
    alert(error);
});

socket.on('gameReady', () => {
    socket.emit('playerReady', roomId);
});

socket.on('startGame', () => {
    initGame();
});

socket.on('enemyAttack', (attackType) => {
    const damage = enemy.attackEnemy(player);
    log(`L'ennemi utilise une attaque ${attackType} et inflige ${damage} dégâts.`);
    updateStats();
    checkGameOver();
});

socket.on('playerDisconnected', () => {
    alert("L'autre joueur s'est déconnecté. La partie est terminée.");
    resetGame();
});

function resetGame() {
    gameMode = 'solo';
    roomId = null;
    gameArea.style.display = 'block';
    waitingArea.style.display = 'none';
    battleArea.style.display = 'none';
    battleLog.innerHTML = '';
}

// Fonction pour initialiser le jeu en mode multijoueur
function initMultiplayerGame() {
    player = new Character("Joueur", 100, 10, 5);
    enemy = new Character("Adversaire", 100, 10, 5);
    showGameArea('missionArea');
    updateStats();
    log("La partie multijoueur commence !");
}

// Fonction pour vérifier la fin du jeu
function checkGameOver() {
    if (player.isDefeated()) {
        log("Vous avez été vaincu. Fin de la partie.");
        endGame(false);
    } else if (enemy.isDefeated()) {
        log("Vous avez vaincu votre adversaire. Victoire !");
        endGame(true);
    }
}

// Fonction pour terminer le jeu
function endGame(playerWon) {
    if (gameMode === 'multi') {
        socket.emit('gameOver', { roomId, playerWon });
    }
    disableAttackButton();
    setTimeout(() => {
        alert(playerWon ? "Vous avez gagné !" : "Vous avez perdu.");
        resetGame();
    }, 1000);
}

// Fonction pour désactiver le bouton d'attaque
function disableAttackButton() {
    document.getElementById('attack-button').disabled = true;
}

// Fonction pour activer le bouton d'attaque
function enableAttackButton() {
    document.getElementById('attack-button').disabled = false;
}

// Gestion des événements socket pour le mode multijoueur
socket.on('gameOver', (data) => {
    const playerWon = data.winner === socket.id;
    endGame(playerWon);
});

// Fonction pour sauvegarder la progression du joueur
function saveGame() {
    const gameData = {
        player: player,
        inventory: player.inventory,
        gold: player.gold,
        experience: player.experience,
        level: player.level
    };
    localStorage.setItem('huntBruteSaveGame', JSON.stringify(gameData));
    alert("Partie sauvegardée !");
}

// Fonction pour charger la progression du joueur
function loadGame() {
    const savedGame = localStorage.getItem('huntBruteSaveGame');
    if (savedGame) {
        const gameData = JSON.parse(savedGame);
        player = new Character(
            gameData.player.name,
            gameData.player.maxHp,
            gameData.player.attack,
            gameData.player.defense
        );
        player.inventory = gameData.inventory;
        player.gold = gameData.gold;
        player.experience = gameData.experience;
        player.level = gameData.level;
        updatePlayerInfo();
        showGameArea('soloMenu');
        alert("Partie chargée !");
    } else {
        alert("Aucune sauvegarde trouvée.");
    }
}

// Ajout des boutons de sauvegarde et de chargement
const saveButton = document.createElement('button');
saveButton.textContent = 'Sauvegarder la partie';
saveButton.addEventListener('click', saveGame);
document.getElementById('solo-menu').appendChild(saveButton);

const loadButton = document.createElement('button');
loadButton.textContent = 'Charger la partie';
loadButton.addEventListener('click', loadGame);
document.getElementById('solo-menu').appendChild(loadButton);

// Fonction pour ajouter de nouvelles missions
function addNewMission(description, enemyLevel, goldReward, expReward) {
    missions.push(new Mission(description, enemyLevel, goldReward, expReward));
}

// Exemple d'ajout de nouvelles missions
addNewMission("Explorer la grotte mystérieuse", 4, 80, 90);
addNewMission("Vaincre le dragon ancien", 5, 100, 120);

// Fonction pour ajouter de nouveaux objets à la boutique
function addNewShopItem(name, cost, statBoost, statValue, isConsumable = false) {
    shopItems.push(new Item(name, cost, statBoost, statValue, isConsumable));
}

// Exemple d'ajout de nouveaux objets
addNewShopItem("Épée magique", 100, "attack", 10);
addNewShopItem("Potion de force", 50, "attack", 5, true);

// Système de quêtes journalières
const dailyQuests = [
    { description: "Vaincre 3 ennemis", reward: 50, progress: 0, goal: 3 },
    { description: "Gagner 100 or", reward: 20, progress: 0, goal: 100 },
    { description: "Utiliser 2 objets", reward: 30, progress: 0, goal: 2 }
];

function updateDailyQuests() {
    const questsList = document.getElementById('daily-quests');
    questsList.innerHTML = '';
    dailyQuests.forEach((quest, index) => {
        const questItem = document.createElement('li');
        questItem.textContent = `${quest.description} - Progrès: ${quest.progress}/${quest.goal}`;
        if (quest.progress >= quest.goal) {
            const claimButton = document.createElement('button');
            claimButton.textContent = 'Réclamer';
            claimButton.onclick = () => claimQuestReward(index);
            questItem.appendChild(claimButton);
        }
        questsList.appendChild(questItem);
    });
}

function claimQuestReward(questIndex) {
    const quest = dailyQuests[questIndex];
    if (quest.progress >= quest.goal) {
        player.gainGold(quest.reward);
        log(`Vous avez reçu ${quest.reward} or pour avoir accompli la quête: ${quest.description}`);
        quest.progress = 0;
        updateDailyQuests();
    }
}

// Mise à jour des quêtes après chaque action pertinente
function updateQuestProgress(questType, amount = 1) {
    switch (questType) {
        case 'defeat':
            dailyQuests[0].progress += amount;
            break;
        case 'gold':
            dailyQuests[1].progress += amount;
            break;
        case 'useItem':
            dailyQuests[2].progress += amount;
            break;
    }
    updateDailyQuests();
}

// Appel initial pour afficher les quêtes
updateDailyQuests();

// Ajout d'un bouton pour réinitialiser les quêtes journalières (à des fins de test)
const resetQuestsButton = document.createElement('button');
resetQuestsButton.textContent = 'Réinitialiser les quêtes';
resetQuestsButton.addEventListener('click', () => {
    dailyQuests.forEach(quest => quest.progress = 0);
    updateDailyQuests();
});
document.getElementById('solo-menu').appendChild(resetQuestsButton);
