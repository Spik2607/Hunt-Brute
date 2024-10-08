// Connexion au serveur socket
const socket = io('https://hunt-brute-server.onrender.com');

// Variables globales
let player = null;
let enemy = null;
let currentMission = null;
let gameMode = 'solo';
let roomId = null;
let totalPoints = 15; // Points disponibles pour la création du personnage

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

// Fonction d'initialisation principale
function initGame() {
    console.log("Initializing game...");
    showGameArea('main-menu');
    setupEventListeners();
    setupMultiplayerListeners();
    document.getElementById('stat-hp').addEventListener('input', updateRemainingPoints);
    document.getElementById('stat-attack').addEventListener('input', updateRemainingPoints);
    document.getElementById('stat-defense').addEventListener('input', updateRemainingPoints);
    updateRemainingPoints();
}

// Fonction pour afficher une zone de jeu spécifique
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

// Configuration des écouteurs d'événements
function setupEventListeners() {
    console.log("Setting up event listeners");

    addSafeEventListener('start-solo', 'click', () => {
        console.log("Mode Solo clicked");
        showGameArea('character-creation');
    });

    addSafeEventListener('create-character', 'click', createCharacter);
    addSafeEventListener('start-mission', 'click', startRandomMission);
    addSafeEventListener('attack-button', 'click', playerAttack);
    addSafeEventListener('open-shop', 'click', openShop);
    addSafeEventListener('open-inventory', 'click', openInventory);
    addSafeEventListener('save-game', 'click', saveGame);
    addSafeEventListener('load-game', 'click', loadGame);
    addSafeEventListener('back-to-main', 'click', () => showGameArea('main-menu'));
    addSafeEventListener('create-room', 'click', createRoom);
    addSafeEventListener('join-room', 'click', joinRoom);
    addSafeEventListener('leave-shop', 'click', () => showGameArea('solo-menu'));
    addSafeEventListener('close-inventory', 'click', () => showGameArea('solo-menu'));

    setupLevelUpListeners();
}

function addSafeEventListener(id, event, callback) {
    const element = document.getElementById(id);
    if (element) {
        element.addEventListener(event, callback);
    } else {
        console.warn(`Element with id '${id}' not found`);
    }
}

function createCharacter() {
    const name = document.getElementById('hero-name').value;
    const hp = parseInt(document.getElementById('stat-hp').value) || 0;
    const attack = parseInt(document.getElementById('stat-attack').value) || 0;
    const defense = parseInt(document.getElementById('stat-defense').value) || 0;

    if (name && (hp + attack + defense) <= totalPoints) {
        player = new Character(name, hp * 10 + 100, attack + 10, defense + 5);
        console.log("Personnage créé:", player);
        updateAbilityButtons();
        showGameArea('solo-menu');
        updatePlayerInfo();
    } else {
        alert("Veuillez remplir tous les champs correctement et ne pas dépasser " + totalPoints + " points au total.");
    }
}

function updateRemainingPoints() {
    const hp = parseInt(document.getElementById('stat-hp').value) || 0;
    const attack = parseInt(document.getElementById('stat-attack').value) || 0;
    const defense = parseInt(document.getElementById('stat-defense').value) || 0;
    const remainingPoints = totalPoints - (hp + attack + defense);
    document.getElementById('remaining-points').textContent = remainingPoints;
}

function startRandomMission() {
    if (!player) {
        console.error("Player not initialized");
        return;
    }
    const availableMissions = missions.filter(m => m.enemyLevel <= player.level + 2);
    currentMission = availableMissions[Math.floor(Math.random() * availableMissions.length)];
    enemy = new Character("Ennemi", currentMission.enemyLevel * 50, currentMission.enemyLevel * 5, currentMission.enemyLevel * 2);
    showGameArea('mission-area');
    updateBattleInfo();
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

function updateBattleLog(message) {
    const battleLog = document.getElementById('battle-log');
    if (battleLog) {
        battleLog.innerHTML += `<p>${message}</p>`;
        battleLog.scrollTop = battleLog.scrollHeight;
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
        abilityButton.classList.add('ability-button');
        abilitiesContainer.appendChild(abilityButton);
    });
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
            <button onclick="buyItem('${item.id}')" class="buy-button">Acheter</button>
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
            <button onclick="useItem(${index})" class="use-button">Utiliser</button>
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

function setupLevelUpListeners() {
    addSafeEventListener('confirm-level-up', 'click', () => {
        const hpPoints = parseInt(document.getElementById('level-up-hp').value) || 0;
        const attackPoints = parseInt(document.getElementById('level-up-attack').value) || 0;
        const defensePoints = parseInt(document.getElementById('level-up-defense').value) || 0;

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

function saveGame() {
    if (!player) {
        alert('Aucun personnage à sauvegarder. Créez d'abord un personnage.');
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

function createRoom() {
    const roomId = document.getElementById('room-id').value;
    if (roomId) {
        socket.emit('createRoom', roomId);
    } else {
        alert("Veuillez entrer un ID de salle valide.");
    }
}

function joinRoom() {
    const roomId = document.getElementById('room-id').value;
    if (roomId) {
        socket.emit('joinRoom', roomId);
    } else {
        alert("Veuillez entrer un ID de salle valide.");
    }
}

function setupMultiplayerListeners() {
    socket.on('roomCreated', (createdRoomId) => {
        console.log(`Salle créée: ${createdRoomId}`);
        showGameArea('waiting-area');
        document.getElementById('room-id-display').textContent = createdRoomId;
    });

    socket.on('roomJoined', (joinedRoomId) => {
        console.log(`Salle rejointe: ${joinedRoomId}`);
        showGameArea('waiting-area');
        document.getElementById('room-id-display').textContent = joinedRoomId;
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

// Initialisation du jeu
document.addEventListener('DOMContentLoaded', initGame);

// Sauvegarde automatique
setInterval(saveGame, 60000); // Sauvegarde toutes les minutes
