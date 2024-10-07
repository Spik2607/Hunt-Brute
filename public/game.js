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
}

class Item {
    constructor(name, cost, statBoost, statValue) {
        this.name = name;
        this.cost = cost;
        this.statBoost = statBoost;
        this.statValue = statValue;
    }

    apply(character) {
        character[this.statBoost] += this.statValue;
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
    inventory: document.getElementById('inventory'),
    waitingArea: document.getElementById('waiting-area')
};

const shopItems = [
    new Item("Épée en fer", 50, "attack", 5),
    new Item("Armure en cuir", 50, "defense", 5),
    new Item("Potion de vie", 30, "maxHp", 20),
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
document.getElementById('open-inventory').addEventListener('click', openInventory);
document.getElementById('leave-shop').addEventListener('click', () => showGameArea('soloMenu'));
document.getElementById('leave-inventory').addEventListener('click', () => showGameArea('soloMenu'));

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
        <p>PV: ${player.hp}/${player.maxHp}</p>
        <div class="progress-bar">
            <div class="progress-bar-fill" style="width: ${(player.hp / player.maxHp) * 100}%;"></div>
        </div>
        <p>Attaque: ${player.attack}</p>
        <p>Défense: ${player.defense}</p>
        <p>Expérience: ${player.experience}/${player.level * 100}</p>
        <div class="progress-bar">
            <div class="progress-bar-fill" style="width: ${(player.experience / (player.level * 100)) * 100}%;"></div>
        </div>
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
        const itemElement = document.createElement('div');
        itemElement.className = 'shop-item';
        itemElement.innerHTML = `
            <h3>${item.name}</h3>
            <p>Coût: ${item.cost} or</p>
            <p>${item.statBoost}: +${item.statValue}</p>
            <button onclick="buyItem(${shopItems.indexOf(item)})">Acheter</button>
        `;
        shopItemsDiv.appendChild(itemElement);
    });
}

function openInventory() {
    showGameArea('inventory');
    const inventoryItemsDiv = document.getElementById('inventory-items');
    inventoryItemsDiv.innerHTML = '';
    player.inventory.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'inventory-item';
        itemElement.innerHTML = `
            <h3>${item.name}</h3>
            <p>${item.statBoost}: +${item.statValue}</p>
        `;
        inventoryItemsDiv.appendChild(itemElement);
    });
}

function buyItem(index) {
    const item = shopItems[index];
    if (player.buyItem(item)) {
        log(`Vous avez acheté ${item.name} pour ${item.cost} or.`);
        openShop(); // Rafraîchir l'affichage de la boutique
    } else {
        log("Vous n'avez pas assez d'or pour cet objet.");
    }
}

// Fonctions de combat
function playerAttack() {
    if (player.isDefeated() || enemy.isDefeated()) return;

    const damage = player.attackEnemy(enemy);
    log(`${player.name} inflige ${damage} dégâts à ${enemy.name}`);
    animateAttack('player-character', 'enemy-character');

    if (enemy.isDefeated()) {
        endMission(true);
    } else {
        setTimeo
