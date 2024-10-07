const socket = io('https://hunt-brute-server.onrender.com');

class Character {
    constructor(name, hp, attack, defense) {
        this.name = name;
        this.level = 1;
        this.maxhp = hp;
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

    takeDamage(damage) {
        this.hp = Math.max(this.hp - Math.max(damage - this.defense, 0), 0);
        return this.hp <= 0;
    }

    heal(amount) {
        this.hp = Math.min(this.hp + amount, this.maxhp);
    }

    gainExperience(amount) {
        this.experience += amount;
        if (this.experience >= this.level * 100) {
            this.levelUp();
        }
    }

    levelUp() {
        this.level++;
        this.maxhp += 10;
        this.hp = this.maxhp;
        this.attack += 2;
        this.defense += 1;
        this.experience -= this.level * 100;
        this.energy = this.maxEnergy;
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
}

class Mission {
    constructor(description, enemyLevel, goldReward, expReward, difficulty) {
        this.description = description;
        this.enemyLevel = enemyLevel;
        this.goldReward = goldReward;
        this.expReward = expReward;
        this.difficulty = difficulty;
    }
}

const missions = [
    new Mission("Éliminer des gobelins", 1, 20, 30, 'Facile'),
    new Mission("Chasser un loup géant", 2, 40, 50, 'Moyenne'),
    new Mission("Vaincre un bandit", 3, 60, 70, 'Moyenne'),
    new Mission("Affronter un ogre", 4, 100, 100, 'Difficile'),
    new Mission("Explorer une grotte hantée", 5, 150, 150, 'Difficile')
];

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

let player, enemy;
let currentMission;
let gameMode = 'solo';
let roomId = null;

// Initialisation du jeu
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('start-solo').addEventListener('click', () => {
        gameMode = 'solo';
        showGameArea('character-creation');
    });
    document.getElementById('create-character').addEventListener('click', createCharacter);
    document.getElementById('start-mission').addEventListener('click', startRandomMission);
    document.getElementById('attack-button').addEventListener('click', playerAttack);
    document.getElementById('open-shop').addEventListener('click', openShop);
    document.getElementById('open-inventory').addEventListener('click', openInventory);
    document.getElementById('open-multiplayer').addEventListener('click', () => showGameArea('multiplayer-options'));
    document.getElementById('create-room').addEventListener('click', createRoom);
    document.getElementById('join-room').addEventListener('click', joinRoom);
    document.getElementById('back-to-solo').addEventListener('click', () => showGameArea('solo-menu'));
    
    setupLevelUpListeners();
    setupMultiplayerListeners();
});

function createCharacter() {
    const name = document.getElementById('hero-name').value;
    const hp = parseInt(document.getElementById('stat-hp').value) * 10 + 100;
    const attack = parseInt(document.getElementById('stat-attack').value) + 10;
    const defense = parseInt(document.getElementById('stat-defense').value) + 5;

    if (name && hp && attack && defense) {
        player = new Character(name, hp, attack, defense);
        showGameArea('solo-menu');
        updatePlayerInfo();
    } else {
        alert("Veuillez remplir tous les champs correctement.");
    }
}

function startRandomMission() {
    const availableMissions = missions.filter(m => m.enemyLevel <= player.level + 2);
    currentMission = availableMissions[Math.floor(Math.random() * availableMissions.length)];
    enemy = new Character("Ennemi", currentMission.enemyLevel * 50, currentMission.enemyLevel * 5, currentMission.enemyLevel * 2);
    showGameArea('mission-area');
    updateBattleInfo();
}

function playerAttack() {
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
    const damage = Math.max(enemy.attack - player.defense, 0);
    const playerDefeated = player.takeDamage(damage);
    updateBattleLog(`L'ennemi inflige ${damage} dégâts à ${player.name}.`);
    
    if (playerDefeated) {
        endMission(false);
    }
    
    updateBattleInfo();
}

function endMission(victory) {
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

function updateBattleInfo() {
    document.getElementById('player-stats').innerHTML = `
        ${player.name} - Niveau ${player.level}<br>
        PV: ${player.hp}/${player.maxHp}<br>
        Énergie: ${player.energy}/${player.maxEnergy}<br>
        Attaque: ${player.attack} | Défense: ${player.defense}
    `;
    
    document.getElementById('enemy-stats').innerHTML = `
        Ennemi - Niveau ${enemy.level}<br>
        PV: ${enemy.hp}/${enemy.maxHp}<br>
        Attaque: ${enemy.attack} | Défense: ${enemy.defense}
    `;
}

function updateBattleLog(message) {
    const battleLog = document.getElementById('battle-log');
    battleLog.innerHTML += `<p>${message}</p>`;
    battleLog.scrollTop = battleLog.scrollHeight;
}

function updatePlayerInfo() {
    if (!player) return; // Ajoutez cette vérification
    document.getElementById('player-info').innerHTML = `
        ${player.name} - Niveau ${player.level}<br>
        PV: ${player.hp}/${player.maxHp}<br>
        Attaque: ${player.attack} | Défense: ${player.defense}<br>
        XP: ${player.experience}/${player.level * 100}<br>
        Or: ${player.gold}
    `;
}

function showGameArea(areaId) {
    document.querySelectorAll('.game-area').forEach(area => area.style.display = 'none');
    document.getElementById(areaId).style.display = 'block';
}

function showLevelUpModal() {
    if (!player) return; // Ajoutez cette vérification
    document.getElementById('new-level').textContent = player.level;
    document.getElementById('stat-points').textContent = '5';
    document.getElementById('level-up-modal').style.display = 'block';
}

function setupLevelUpListeners() {
    document.getElementById('confirm-level-up').addEventListener('click', () => {
        const hpPoints = parseInt(document.getElementById('level-up-hp').value) || 0;
        const attackPoints = parseInt(document.getElementById('level-up-attack').value) || 0;
        const defensePoints = parseInt(document.getElementById('level-up-defense').value) || 0;
        
        if (hpPoints + attackPoints + defensePoints === 5) {
            player.maxhp += hpPoints * 10;
            player.attack += attackPoints;
            player.defense += defensePoints;
            document.getElementById('level-up-modal').style.display = 'none';
            updatePlayerInfo();
        } else {
            alert("Veuillez distribuer exactement 5 points.");
        }
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

// Fonctions pour la boutique et l'inventaire à implémenter
function openShop() {
    // Implémentation de la boutique
}

function openInventory() {
    // Implémentation de l'inventaire
}
// ... (le code précédent reste inchangé)

// Définition des objets du jeu
const items = [
    { id: 'sword', name: 'Épée en fer', type: 'weapon', attack: 5, cost: 50 },
    { id: 'shield', name: 'Bouclier en bois', type: 'armor', defense: 3, cost: 40 },
    { id: 'potion', name: 'Potion de soin', type: 'consumable', heal: 30, cost: 20 }
];

// Fonctions pour la boutique
function openShop() {
    const shopItems = document.getElementById('shop-items');
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
    const item = items.find(i => i.id === itemId);
    if (player.gold >= item.cost) {
        player.gold -= item.cost;
        player.inventory.push(item);
        updatePlayerInfo();
        alert(`Vous avez acheté ${item.name}`);
    } else {
        alert("Vous n'avez pas assez d'or !");
    }
}

// Fonctions pour l'inventaire
function openInventory() {
    const inventoryItems = document.getElementById('inventory');
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
    const item = player.inventory[index];
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

// Amélioration du système de combat
function playerAttack() {
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

function useAbility(abilityIndex) {
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

// Amélioration du système de mission
function startRandomMission() {
    const availableMissions = missions.filter(m => m.enemyLevel <= player.level + 2);
    const missionChoices = availableMissions.slice(0, 3);
    
    const missionChoiceArea = document.getElementById('mission-choices');
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

// Système de sauvegarde et chargement
function saveGame() {
    const gameState = {
        player: player,
        inventory: player.inventory,
        abilities: player.abilities,
        gold: player.gold,
        level: player.level,
        experience: player.experience
    };
    localStorage.setItem('huntBruteGameState', JSON.stringify(gameState));
    alert('Partie sauvegardée !');
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
        player.inventory = gameState.inventory;
        player.abilities = gameState.abilities;
        updatePlayerInfo();
        showGameArea('solo-menu');
        alert('Partie chargée !');
    } else {
        alert('Aucune sauvegarde trouvée.');
    }
}

// Ajout des écouteurs d'événements pour la sauvegarde et le chargement
document.getElementById('save-game').addEventListener('click', saveGame);
document.getElementById('load-game').addEventListener('click', loadGame);

// Mise à jour de l'interface utilisateur
function updateBattleInfo() {
    document.getElementById('player-stats').innerHTML = `
        ${player.name} - Niveau ${player.level}<br>
        PV: ${player.hp}/${player.maxHp}<br>
        Énergie: ${player.energy}/${player.maxEnergy}<br>
        Attaque: ${player.attack} | Défense: ${player.defense}
    `;
    
    document.getElementById('enemy-stats').innerHTML = `
        ${enemy.name} - Niveau ${enemy.level}<br>
        PV: ${enemy.hp}/${enemy.maxHp}<br>
        Attaque: ${enemy.attack} | Défense: ${enemy.defense}
    `;

    // Mise à jour des boutons de capacités
    const abilitiesContainer = document.getElementById('player-abilities');
    abilitiesContainer.innerHTML = '';
    player.abilities.forEach((ability, index) => {
        const abilityButton = document.createElement('button');
        abilityButton.textContent = `${ability.name} (${ability.energyCost} énergie)`;
        abilityButton.onclick = () => useAbility(index);
        abilitiesContainer.appendChild(abilityButton);
    });
}

// Initialisation du jeu
document.addEventListener('DOMContentLoaded', () => {
    // ... (les écouteurs d'événements existants restent inchangés)
    
    document.getElementById('leave-shop').addEventListener('click', () => showGameArea('solo-menu'));
    document.getElementById('close-inventory').addEventListener('click', () => showGameArea('solo-menu'));
});

// ... (le reste du code existant reste inchangé)
