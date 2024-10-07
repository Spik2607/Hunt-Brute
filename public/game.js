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
document.getElementById('leave-shop').addEventListener('click', () => showGameArea('soloMenu'));

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
        <p>Attaque: ${player.attack}</p>
        <p>Défense: ${player.defense}</p>
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

// Fonctions de combat
function playerAttack() {
    if (player.isDefeated() || enemy.isDefeated()) return;

    const damage = player.attackEnemy(enemy);
    log(`${player.name} inflige ${damage} dégâts à ${enemy.name}`);

    if (enemy.isDefeated()) {
        endMission(true);
    } else {
        enemyAttack();
    }

    updateStats();
}

function enemyAttack() {
    const damage = enemy.attackEnemy(player);
    log(`${enemy.name} inflige ${damage} dégâts à ${player.name}`);

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
        PV: ${player.hp}/${player.maxHp}<br>
        ATT: ${player.attack} | DEF: ${player.defense}
    `;
    document.getElementById('enemy-stats').innerHTML = `
        ${enemy.name}<br>
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

// ... (garder le code existant pour le mode multijoueur)
