// Connexion au serveur socket
const socket = io('https://hunt-brute-server.onrender.com');

// Variables globales
let player = null;
let enemy = null;
let currentMission = null;
let gameMode = 'solo';
let roomId = null;
const totalPoints = 15;

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

// Fonction d'initialisation principale
function initGame() {
    console.log("Initializing game...");
    showGameArea('main-menu');
    setupEventListeners();
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
    document.getElementById('start-solo').addEventListener('click', () => showGameArea('character-creation'));
    document.getElementById('open-multiplayer').addEventListener('click', setupMultiplayerMode);
    document.getElementById('create-character').addEventListener('click', createCharacter);
    document.getElementById('start-mission').addEventListener('click', startRandomMission);
    document.getElementById('attack-button').addEventListener('click', playerAttack);
    document.getElementById('open-shop').addEventListener('click', openShop);
    document.getElementById('open-inventory').addEventListener('click', openInventory);
    document.getElementById('save-game').addEventListener('click', saveGame);
    document.getElementById('load-game').addEventListener('click', loadGame);
    document.getElementById('create-room').addEventListener('click', createRoom);
    document.getElementById('join-room').addEventListener('click', joinRoom);
}

function createCharacter() {
    const name = document.getElementById('hero-name').value.trim();
    const hp = parseInt(document.getElementById('stat-hp').value) || 0;
    const attack = parseInt(document.getElementById('stat-attack').value) || 0;
    const defense = parseInt(document.getElementById('stat-defense').value) || 0;
    
    const totalAssignedPoints = hp + attack + defense;
    
    if (!name || totalAssignedPoints !== totalPoints) {
        alert(`Veuillez remplir tous les champs et utiliser exactement ${totalPoints} points.`);
        return;
    }
    
    player = new Character(name, hp * 10 + 100, attack + 10, defense + 5);
    console.log("Personnage créé:", player);
    
    updateAbilityButtons();
    updatePlayerInfo();
    showGameArea('solo-menu');
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
        Or: ${player.gold}<br>
        Énergie: ${player.energy}/${player.maxEnergy}
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

function setupMultiplayerMode() {
    showGameArea('multiplayer');
    // Ajoutez ici la logique pour initialiser le mode multijoueur
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

// Initialisation du jeu
document.addEventListener('DOMContentLoaded', initGame);

// Sauvegarde automatique
setInterval(saveGame, 60000); // Sauvegarde toutes les minutes
