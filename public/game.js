// Connexion au serveur socket
const socket = io('https://hunt-brute-server.onrender.com');

// Variables globales
let player = null;
let enemy = null;
let currentMission = null;
let gameMode = 'solo';
let roomId = null;
let availablePoints = null;

// Classe Character
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
        this.energy = 100;
        this.maxEnergy = 100;
        this.abilities = [];
    }

    levelUp() {
        this.level++;
        this.maxHp += 10;
        this.hp = this.maxHp;
        this.attack += 2;
        this.defense += 1;
        this.experience -= this.level * 100;
        this.energy = this.maxEnergy;
        learnRandomAbility(this);
        console.log("Level up:", this);
        showLevelUpModal();
    }
    let availablePoints = 5;

    function updateAvailablePoints() {
    const hpPoints = parseInt(document.getElementById('stat-hp').value) || 0;
    const attackPoints = parseInt(document.getElementById('stat-attack').value) || 0;
    const defensePoints = parseInt(document.getElementById('stat-defense').value) || 0;
    
    const usedPoints = hpPoints + attackPoints + defensePoints;
    const remainingPoints = availablePoints - usedPoints;
    
    document.getElementById('available-points').textContent = remainingPoints;
}

function setupCharacterCreation() {
    const statInputs = ['stat-hp', 'stat-attack', 'stat-defense'];
    statInputs.forEach(id => {
        document.getElementById(id).addEventListener('input', updateAvailablePoints);
    });
}
    useAbility(abilityIndex, target) {
        const ability = this.abilities[abilityIndex];
        if (this.energy >= ability.energyCost) {
            this.energy -= ability.energyCost;
            return ability.use(this, target);
        }
        return 0;
    }

    takeDamage(damage) {
        this.hp = Math.max(this.hp - Math.max(damage - this.defense, 0), 0);
        return this.hp <= 0;
    }

    heal(amount) {
        this.hp = Math.min(this.hp + amount, this.maxHp);
    }

    gainExperience(amount) {
        this.experience += amount;
        if (this.experience >= this.level * 100) {
            this.levelUp();
        }
    }
}

// Classe Mission
class Mission {
    constructor(description, enemyLevel, goldReward, expReward, difficulty) {
        this.description = description;
        this.enemyLevel = enemyLevel;
        this.goldReward = goldReward;
        this.expReward = expReward;
        this.difficulty = difficulty;
    }
}

// Définition des missions
const missions = [
    new Mission("Éliminer des gobelins", 1, 20, 30, 'Facile'),
    new Mission("Chasser un loup géant", 2, 40, 50, 'Moyenne'),
    new Mission("Vaincre un bandit", 3, 60, 70, 'Moyenne'),
    new Mission("Affronter un ogre", 4, 100, 100, 'Difficile'),
    new Mission("Explorer une grotte hantée", 5, 150, 150, 'Difficile')
];

// Définition des capacités
const abilities = [
    {
        name: "Frappe puissante",
        energyCost: 20,
        use: (user, target) => {
            const damage = user.attack * 1.5;
            target.takeDamage(damage);
            return damage;
        }
    },
    {
        name: "Bouclier énergétique",
        energyCost: 15,
        use: (user, target) => {
            user.defense += 5;
            return 0;
        }
    },
    {
        name: "Drain de vie",
        energyCost: 25,
        use: (user, target) => {
            const damage = user.attack * 0.8;
            target.takeDamage(damage);
            user.heal(damage / 2);
            return damage;
        }
    }
];

// Définition des objets du jeu
const items = [
    { id: 'sword', name: 'Épée en fer', type: 'weapon', attack: 5, cost: 50 },
    { id: 'shield', name: 'Bouclier en bois', type: 'armor', defense: 3, cost: 40 },
    { id: 'potion', name: 'Potion de soin', type: 'consumable', heal: 30, cost: 20 }
];

// Fonctions utilitaires
function showGameArea(areaId) {
    console.log(`Attempting to show area: ${areaId}`);
    document.querySelectorAll('.game-area').forEach(area => {
        area.style.display = 'none';
    });
    const areaToShow = document.getElementById(areaId);
    if (areaToShow) {
        areaToShow.style.display = 'block';
        console.log(`Area ${areaId} shown successfully`);
    } else {
        console.error(`Area ${areaId} not found`);
    }
}

function addSafeEventListener(id, eventType, callback) {
    const element = document.getElementById(id);
    if (element) {
        element.addEventListener(eventType, callback);
    } else {
        console.warn(`Element with id '${id}' not found`);
    }
}

function updateBattleLog(message) {
    const battleLog = document.getElementById('battle-log');
    if (battleLog) {
        battleLog.innerHTML += `<p>${message}</p>`;
        battleLog.scrollTop = battleLog.scrollHeight;
    } else {
        console.warn("Battle log element not found");
    }
}

// Fonctions de jeu principales
function createCharacter() {
    const name = document.getElementById('hero-name').value;
    const hp = parseInt(document.getElementById('stat-hp').value) * 10 + 100;
    const attack = parseInt(document.getElementById('stat-attack').value) + 10;
    const defense = parseInt(document.getElementById('stat-defense').value) + 5;

    if (name && !isNaN(hp) && !isNaN(attack) && !isNaN(defense)) {
        player = new Character(name, hp, attack, defense);
        player.abilities = []; // Initialisation explicite des capacités
        console.log("Personnage créé:", player);
        updateAbilityButtons();
        showGameArea('solo-menu');
        updatePlayerInfo();
    } else {
        alert("Veuillez remplir tous les champs correctement.");
    }
}

function startRandomMission() {
    console.log("Démarrage d'une mission aléatoire");
    const availableMissions = missions.filter(m => m.enemyLevel <= player.level + 2);
    if (availableMissions.length === 0) {
        alert("Aucune mission disponible pour votre niveau.");
        return;
    }
    const missionChoices = availableMissions.slice(0, 3);
    
    const missionChoiceArea = document.getElementById('mission-choices');
    if (!missionChoiceArea) {
        console.error("Zone de choix de mission non trouvée");
        missionChoiceArea = document.createElement('div');
        missionChoiceArea.id = 'mission-choices';
        document.getElementById('solo-menu').appendChild(missionChoiceArea);
    }
    missionChoiceArea.innerHTML = '';
    missionChoices.forEach((mission, index) => {
        const missionButton = document.createElement('button');
        missionButton.textContent = `${mission.description} (${mission.difficulty})`;
        missionButton.onclick = () => selectMission(index);
        missionChoiceArea.appendChild(missionButton);
    });
    
    showGameArea('mission-choice-area');
}

function selectMission(index) {
    currentMission = missions[index];
    enemy = new Character("Ennemi", currentMission.enemyLevel * 50, currentMission.enemyLevel * 5, currentMission.enemyLevel * 2);
    showGameArea('mission-area');
    updateBattleInfo();
    updateBattleLog(`Vous commencez la mission : ${currentMission.description}`);
}

function playerAttack() {
    if (!player || !enemy) {
        console.error("Player or enemy not initialized");
        return;
    }
    if (player.energy < 10) {
        alert("Pas assez d'énergie pour attaquer !");
        return;
    }
    player.energy -= 10;
    const damage = Math.max(player.attack - enemy.defense, 0);
    const enemyDefeated = enemy.takeDamage(damage);
    updateBattleLog(`${player.name} inflige ${damage} dégâts à l'ennemi.`);
    
    if (enemyDefeated) {
        endMission(true);
    } else {
        enemyAttack();
    }
    
    updateBattleInfo();
}

function enemyAttack() {
    if (!player || !enemy) {
        console.error("Player or enemy not initialized");
        return;
    }
    const damage = Math.max(enemy.attack - player.defense, 0);
    const playerDefeated = player.takeDamage(damage);
    updateBattleLog(`L'ennemi inflige ${damage} dégâts à ${player.name}.`);
    
    if (playerDefeated) {
        endMission(false);
    }
    
    updateBattleInfo();
}

function endMission(victory) {
    if (!player || !currentMission) {
        console.error("Player or current mission not initialized");
        return;
    }
    if (victory) {
        player.gainExperience(currentMission.expReward);
        player.gold += currentMission.goldReward;
        updateBattleLog(`Mission accomplie ! Vous gagnez ${currentMission.expReward} XP et ${currentMission.goldReward} or.`);
    } else {
        updateBattleLog("Vous avez été vaincu. Mission échouée.");
    }
    
    setTimeout(() => {
        showGameArea('solo-menu');
        updatePlayerInfo();
    }, 3000);
}

function useAbility(abilityIndex) {
    if (!player || !enemy) {
        console.error("Player or enemy not initialized");
        return;
    }
    const ability = player.abilities[abilityIndex];
    if (player.energy >= ability.energyCost) {
        const damage = player.useAbility(abilityIndex, enemy);
        updateBattleLog(`${player.name} utilise ${ability.name} et inflige ${damage} dégâts à l'ennemi.`);
        if (enemy.hp <= 0) {
            endMission(true);
        } else {
            enemyAttack();
        }
    } else {
        alert("Pas assez d'énergie pour utiliser cette capacité !");
    }
    updateBattleInfo();
}

// Fonctions de mise à jour de l'interface
function updatePlayerInfo() {
    if (!player) return;
    const playerInfoElement = document.getElementById('player-info');
    if (!playerInfoElement) return;
    
    playerInfoElement.innerHTML = `
        ${player.name} - Niveau ${player.level}<br>
        PV: ${player.hp}/${player.maxHp}<br>
        Attaque: ${player.attack} | Défense: ${player.defense}<br>
        XP: ${player.experience}/${player.level * 100}<br>
        Or: ${player.gold}
    `;
}

function updateBattleInfo() {
    if (!player || !enemy) return;
    const playerStatsElement = document.getElementById('player-stats');
    const enemyStatsElement = document.getElementById('enemy-stats');
    
    if (playerStatsElement) {
        playerStatsElement.innerHTML = `
            ${player.name} - Niveau ${player.level}<br>
            PV: ${player.hp}/${player.maxHp}<br>
            Énergie: ${player.energy}/${player.maxEnergy}<br>
            Attaque: ${player.attack} | Défense: ${player.defense}
        `;
    }
    
    if (enemyStatsElement) {
        enemyStatsElement.innerHTML = `
            Ennemi - Niveau ${enemy.level}<br>
            PV: ${enemy.hp}/${enemy.maxHp}<br>
            Attaque: ${enemy.attack} | Défense: ${enemy.defense}
        `;
    }
}

function updateAbilityButtons() {
    if (!player || !player.abilities) {
        console.log("Player or player abilities not initialized");
        return;
    }
    const abilitiesContainer = document.getElementById('player-abilities');
    if (!abilitiesContainer) {
        console.log("Abilities container not found");
        return;
    }
    abilitiesContainer.innerHTML = '';
    player.abilities.forEach((ability, index) => {
        const abilityButton = document.createElement('button');
        abilityButton.textContent = `${ability.name} (${ability.energyCost} énergie)`;
        abilityButton.onclick = () => useAbility(index);
        abilitiesContainer.appendChild(abilityButton);
    });
}

// Fonctions de sauvegarde et chargement
function saveGame() {
    if (!player) {
        alert('Aucun personnage à sauvegarder. Créez dabord un personnage.');
        return;
    }
    const gameState = {
        player: player,
        inventory: player.inventory,
        abilities: player.abilities,
        gold: player.gold,
        level: player.level,
        experience: player.experience
    };
    localStorage.setItem('huntBruteGameState', JSON.stringify(gameState));
    alert('Partie sauvegardée avec succès !');
    console.log('Partie sauvegardée:', gameState);
}

function loadGame() {
    const savedState = localStorage.getItem('huntBruteGameState');
    if (savedState) {
        const gameState = JSON.parse(savedState);
        player = new Character(
            gameState.player.name, 
            gameState.player.maxHp, 
            gameState.player.attack, 
            gameState.player.defense
        );
        player.level = gameState.level;
        player.experience = gameState.experience;
        player.gold = gameState.gold;
        player.inventory = gameState.inventory || [];
        player.abilities = gameState.abilities || [];
        player.energy = gameState.player.energy || player.maxEnergy;
        updateAbilityButtons();
        updatePlayerInfo();
        showGameArea('solo-menu');
        alert('Partie chargée avec succès !');
        console.log('Partie chargée:', player);
    } else {
        alert('Aucune sauvegarde trouvée.');
    }
}

// Initialisation du jeu
function initGame() {
    console.log("Initializing game...");
    showGameArea('main-menu');
    setupEventListeners();
    setupMultiplayerListeners();
}

function setupEventListeners() {
    addSafeEventListener('start-solo', 'click', () => {
        gameMode = 'solo';
        showGameArea('character-creation');
    addSafeEventListener('back-to-solo', 'click', () => showGameArea('main-menu'));
    addSafeEventListener('leave-shop', 'click', () => showGameArea('solo-menu'));
    addSafeEventListener('close-inventory', 'click', () => showGameArea('solo-menu'));{
    
    });
    addSafeEventListener('create-character', 'click', createCharacter);
    addSafeEventListener('start-mission', 'click', startRandomMission);
    addSafeEventListener('attack-button', 'click', playerAttack);
    addSafeEventListener('open-shop', 'click', openShop);
    addSafeEventListener('open-inventory', 'click', openInventory);
    addSafeEventListener('create-room', 'click', createRoom);
    addSafeEventListener('join-room', 'click', joinRoom);
    addSafeEventListener('back-to-solo', 'click', () => showGameArea('solo-menu'));
    addSafeEventListener('save-game', 'click', saveGame);
    addSafeEventListener('load-game', 'click', loadGame);

    setupLevelUpListeners();
}

function setupLevelUpListeners() {
    addSafeEventListener('confirm-level-up', 'click', () => {
        const hpPoints = parseInt(document.getElementById('level-up-hp').value) || 0;
        const attackPoints = parseInt(document.getElementById('level-up-attack').value) || 0;
        const defensePoints = parseInt(document.getElementById('level-up-defense').value) || 0;

        if (!player) {
            console.error("Player is not initialized");
            return;
        }

        if (hpPoints + attackPoints + defensePoints <= 5) {
            player.maxHp += hpPoints * 10;
            player.attack += attackPoints;
            player.defense += defensePoints;
            document.getElementById('level-up-modal').style.display = 'none';
            updatePlayerInfo();
        } else {
            alert("Vous avez attribué trop de points. Veuillez en redistribuer.");
        }
    });
}

function setupMultiplayerListeners() {
    socket.on('roomCreated', (createdRoomId) => {
        console.log(`Salle créée: ${createdRoomId}`);
        showGameArea('waiting-area');
    });

    socket.on('roomJoined', (joinedRoomId) => {
        console.log(`Salle rejointe: ${joinedRoomId}`);
        showGameArea('waiting-area');
    });

    socket.on('gameReady', () => {
        console.log('La partie est prête à commencer');
        // Initialiser la partie multijoueur ici
    });

    socket.on('playerMove', (move) => {
        // Gérer le mouvement de l'adversaire ici
    });

    socket.on('roomError', (error) => {
        alert(error);
    });
}

function createRoom() {
    roomId = document.getElementById('room-id').value;
    socket.emit('createRoom', roomId);
}

function joinRoom() {
    roomId = document.getElementById('room-id').value;
    socket.emit('joinRoom', roomId);
}

function openShop() {
    const shopItems = document.getElementById('shop-items');
    if (!shopItems) {
        console.error("Shop items container not found");
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
    showGameArea('shop');
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
        alert(`Vous avez acheté ${item.name}`);
    } else {
        alert("Vous n'avez pas assez d'or !");
    }
}

function openInventory() {
    if (!player) {
        console.error("Player not initialized");
        return;
    }
    const inventoryItems = document.getElementById('inventory');
    if (!inventoryItems) {
        console.error("Inventory container not found");
        return;
    }
    inventoryItems.innerHTML = '';
    player.inventory.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'inventory-item';
        itemElement.innerHTML = `
            <span>${item.name}</span>
            <button onclick="useItem(${index})">Utiliser</button>
        `;
        inventoryItems.appendChild(itemElement);
    });
    showGameArea('inventory-area');
}

function useItem(index) {
    if (!player) {
        console.error("Player not initialized");
        return;
    }
    const item = player.inventory[index];
    if (!item) {
        console.error("Item not found in inventory");
        return;
    }
    switch(item.type) {
        case 'weapon':
            player.attack += item.attack;
            break;
        case 'armor':
            player.defense += item.defense;
            break;
        case 'consumable':
            player.heal(item.heal);
            break;
    }
    player.inventory.splice(index, 1);
    updatePlayerInfo();
    openInventory();
    alert(`Vous avez utilisé ${item.name}`);
}

function learnRandomAbility(character) {
    const newAbility = abilities[Math.floor(Math.random() * abilities.length)];
    if (!character.abilities.some(a => a.name === newAbility.name)) {
        character.abilities.push(newAbility);
        console.log(`${character.name} a appris une nouvelle capacité : ${newAbility.name}!`);
    }
}

function showLevelUpModal() {
    if (!player) {
        console.error("Player is not initialized");
        return;
    }
    const levelUpModal = document.getElementById('level-up-modal');
    if (!levelUpModal) {
        console.error("Level up modal not found");
        return;
    }
    document.getElementById('new-level').textContent = player.level;
    document.getElementById('stat-points').textContent = '5';
    levelUpModal.style.display = 'block';
}

// Fonction d'initialisation principale
document.addEventListener('DOMContentLoaded', initGame);

// Sauvegarde automatique
setInterval(saveGame, 60000); // Sauvegarde toutes les minutes
