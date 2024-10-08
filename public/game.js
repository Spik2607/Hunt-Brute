// game.js
import { items, missions, dropRates } from './gameData.js';

let socket;
let player = null;
let enemy = null;
let currentMission = null;
let gameMode = 'solo';
let roomId = null;
let totalPoints = 15;

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
        this.equippedItems = [];
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

function initGame() {
    console.log("Initializing game...");
    showGameArea('main-menu');
    setupEventListeners();
    initializeSocket();
    setupMultiplayerListeners();
    document.getElementById('stat-hp').addEventListener('input', updateRemainingPoints);
    document.getElementById('stat-attack').addEventListener('input', updateRemainingPoints);
    document.getElementById('stat-defense').addEventListener('input', updateRemainingPoints);
    updateRemainingPoints();
}

function initializeSocket() {
    socket = io('https://hunt-brute-server.onrender.com');
    socket.on('connect', () => {
        console.log('Connected to server');
    });
    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
    });
}

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

    const backButton = document.getElementById('back-to-main');
    if (areaId === 'main-menu' || areaId === 'character-creation') {
        backButton.style.display = 'none';
    } else {
        backButton.style.display = 'block';
    }
}

function setupEventListeners() {
    addSafeEventListener('start-solo', 'click', () => showGameArea('character-creation'));
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
    addSafeEventListener('open-multiplayer', 'click', () => showGameArea('multiplayer'));
    addSafeEventListener('load-existing-game', 'click', loadExistingGame);

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
    const name = document.getElementById('hero-name').value.trim();
    const hp = parseInt(document.getElementById('stat-hp').value) || 0;
    const attack = parseInt(document.getElementById('stat-attack').value) || 0;
    const defense = parseInt(document.getElementById('stat-defense').value) || 0;
    
    const totalAssignedPoints = hp + attack + defense;
    
    if (!name) {
        alert("Veuillez entrer un nom pour votre personnage.");
        return;
    }
    
    if (totalAssignedPoints > totalPoints) {
        alert(`Vous avez attribué trop de points. Maximum autorisé : ${totalPoints}`);
        return;
    }
    
    if (totalAssignedPoints < totalPoints) {
        const confirmCreate = confirm(`Vous n'avez pas utilisé tous vos points (${totalPoints - totalAssignedPoints} restants). Voulez-vous quand même créer le personnage ?`);
        if (!confirmCreate) return;
    }
    
    player = new Character(name, hp * 10 + 100, attack + 10, defense + 5);
    console.log("Personnage créé:", player);
    
    updateAbilityButtons();
    updatePlayerInfo();
    
    saveGame();
    
    showGameArea('solo-menu');
    prepareMission();
    
    alert(`${player.name} a été créé avec succès ! Vous pouvez maintenant commencer votre aventure.`);
}

function prepareMission() {
    const soloMenu = document.getElementById('solo-menu');
    if (!soloMenu) {
        console.error("L'élément 'solo-menu' n'a pas été trouvé");
        return;
    }
    
    const oldButton = document.getElementById('start-mission');
    if (oldButton) {
        oldButton.remove();
    }
    
    const missionButton = document.createElement('button');
    missionButton.id = 'start-mission';
    missionButton.textContent = 'Commencer une mission';
    missionButton.onclick = startRandomMission;
    
    soloMenu.appendChild(missionButton);
}

function startRandomMission() {
    if (!player) {
        console.error("Player not initialized");
        return;
    }
    const availableMissions = missions.filter(m => m.enemyLevel <= player.level + 2);
    currentMission = availableMissions[Math.floor(Math.random() * availableMissions.length)];
    enemy = new Character(currentMission.name, currentMission.enemyLevel * 50, currentMission.enemyLevel * 5, currentMission.enemyLevel * 2);
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
        
        if (Math.random() < dropRates[currentMission.difficulty]) {
            const droppedItem = getRandomItem();
            player.inventory.push(droppedItem);
            updateBattleLog(`Vous avez trouvé : ${droppedItem.name} !`);
        }
    } else {
        updateBattleLog("Vous avez été vaincu. Mission échouée.");
    }
    
    setTimeout(() => {
        showGameArea('solo-menu');
        updatePlayerInfo();
    }, 3000);
}

function getRandomItem() {
    return items[Math.floor(Math.random() * items.length)];
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
            ${enemy.name} - Niveau ${enemy.level}<br>
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
            ${(item.type === 'weapon' || item.type === 'armor') ? 
              `<button onclick="equipItem(${index})" class="equip-button">Équiper</button>` : ''}
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

function equipItem(index) {
    const item = player.inventory[index];
    if (item.type === 'weapon') {
        // Déséquiper l'arme actuelle si elle existe
        const currentWeapon = player.equippedItems.find(i => i.type === 'weapon');
        if (currentWeapon) {
            player.attack -= currentWeapon.attack;
            player.inventory.push(currentWeapon);
            player.equippedItems = player.equippedItems.filter(i => i.type !== 'weapon');
        }
        player.attack += item.attack;
    } else if (item.type === 'armor') {
        // Déséquiper l'armure actuelle si elle existe
        const currentArmor = player.equippedItems.find(i => i.type === 'armor');
        if (currentArmor) {
            player.defense -= currentArmor.defense;
            player.inventory.push(currentArmor);
            player.equippedItems = player.equippedItems.filter(i => i.type !== 'armor');
        }
        player.defense += item.defense;
    }
    player.equippedItems.push(item);
    player.inventory.splice(index, 1);
    updatePlayerInfo();
    openInventory();
    alert(`Vous avez équipé ${item.name}`);
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
        alert('Aucun personnage à sauvegarder. Créez dabord un personnage.');
        return;
    }
    const gameState = {
        player: player,
        inventory: player.inventory,
        equippedItems: player.equippedItems,
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
        player.equippedItems = gameState.equippedItems || [];
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

function loadExistingGame() {
    loadGame();
    if (player) {
        showGameArea('solo-menu');
    } else {
        alert('Aucune sauvegarde trouvée. Veuillez créer un nouveau personnage.');
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

function updateRemainingPoints() {
    const hp = parseInt(document.getElementById('stat-hp').value) || 0;
    const attack = parseInt(document.getElementById('stat-attack').value) || 0;
    const defense = parseInt(document.getElementById('stat-defense').value) || 0;
    const remainingPoints = totalPoints - (hp + attack + defense);
    document.getElementById('remaining-points').textContent = remainingPoints;
}

// Initialisation du jeu
document.addEventListener('DOMContentLoaded', initGame);

// Sauvegarde automatique
setInterval(saveGame, 60000); // Sauvegarde toutes les minutes
