// combat.js
import { Character, items, missions, dropRates, getRandomCompanion, getRandomItem, getRandomEnemy } from './gameData.js';

let player, enemy, currentMission;

export function initializeCombat(playerCharacter, missionIndex) {
    player = playerCharacter;
    currentMission = missions[missionIndex];
    enemy = getRandomEnemy();
    enemy.hp *= currentMission.enemyLevel;
    enemy.attack *= currentMission.enemyLevel;
    enemy.defense *= currentMission.enemyLevel;
    updateBattleInfo();
}

export function updateBattleInfo() {
    const playerStats = document.getElementById('player-combat-info');
    const enemyStats = document.getElementById('enemy-combat-info');

    if (playerStats && player) {
        playerStats.querySelector('h3').textContent = player.name;
        playerStats.querySelector('.health-text').textContent = `${player.hp}/${player.maxHp} PV`;
        playerStats.querySelector('.health-bar-fill').style.width = `${(player.hp / player.maxHp) * 100}%`;
        playerStats.querySelector('.energy-text').textContent = `${player.energy}/${player.maxEnergy} Énergie`;
        playerStats.querySelector('.energy-bar-fill').style.width = `${(player.energy / player.maxEnergy) * 100}%`;
    }
    
    if (enemyStats && enemy) {
        enemyStats.querySelector('h3').textContent = enemy.name;
        enemyStats.querySelector('.health-text').textContent = `${enemy.hp}/${enemy.maxHp} PV`;
        enemyStats.querySelector('.health-bar-fill').style.width = `${(enemy.hp / enemy.maxHp) * 100}%`;
    }
}

export function playerAttack() {
    if (!player || !enemy) return;
    const damage = Math.max(player.attack - enemy.defense, 0);
    enemy.hp -= damage;
    updateBattleLog(`${player.name} inflige ${damage} dégâts à ${enemy.name}.`);
    checkBattleEnd();
}

export function playerDefend() {
    player.defending = true;
    updateBattleLog(`${player.name} se met en position défensive.`);
    enemyTurn();
}

export function playerUseSpecial() {
    if (!player || !enemy) return;
    const energyCost = 20;
    if (player.energy < energyCost) {
        updateBattleLog("Pas assez d'énergie pour utiliser une attaque spéciale.");
        return;
    }
    const specialDamage = Math.max(player.attack * 1.5 - enemy.defense, 0);
    enemy.hp -= specialDamage;
    player.energy -= energyCost;
    updateBattleLog(`${player.name} utilise une attaque spéciale et inflige ${specialDamage} dégâts à ${enemy.name}.`);
    checkBattleEnd();
}

export function playerUseItem(item) {
    if (item.type === 'consumable') {
        if (item.effect === 'heal') {
            const healAmount = item.value;
            player.hp = Math.min(player.hp + healAmount, player.maxHp);
            updateBattleLog(`${player.name} utilise ${item.name} et récupère ${healAmount} PV.`);
        } else if (item.effect === 'energy') {
            player.energy = Math.min(player.energy + item.value, player.maxEnergy);
            updateBattleLog(`${player.name} utilise ${item.name} et récupère ${item.value} points d'énergie.`);
        }
        updateBattleInfo();
        enemyTurn();
    }
}

function enemyTurn() {
    if (!player || !enemy) return;
    let damage = Math.max(enemy.attack - player.defense, 0);
    if (player.defending) {
        damage = Math.floor(damage / 2);
        player.defending = false;
    }
    player.hp -= damage;
    updateBattleLog(`${enemy.name} inflige ${damage} dégâts à ${player.name}.`);
    checkBattleEnd();
}

function checkBattleEnd() {
    if (enemy.hp <= 0) {
        endCombat(true);
    } else if (player.hp <= 0) {
        endCombat(false);
    } else {
        updateBattleInfo();
        enemyTurn();
    }
}

function endCombat(victory) {
    if (victory) {
        const expGain = currentMission.expReward;
        const goldGain = currentMission.goldReward;
        player.gainExperience(expGain);
        player.gold += goldGain;
        updateBattleLog(`Victoire ! Vous gagnez ${expGain} XP et ${goldGain} or.`);
        
        if (Math.random() < dropRates[currentMission.difficulty]) {
            const droppedItem = getRandomItem();
            player.inventory.push(droppedItem);
            updateBattleLog(`Vous avez obtenu : ${droppedItem.name}`);
        }
        
        if (Math.random() < 0.05) { // 5% de chance d'obtenir un compagnon
            const newCompanion = getRandomCompanion();
            player.companions.push(newCompanion);
            updateBattleLog(`Vous avez obtenu un nouveau compagnon : ${newCompanion.name}`);
        }
    } else {
        player.die();
    }
    updatePlayerInfo();
    showGameArea('adventure-menu');
}

export function updateBattleLog(message) {
    const battleLog = document.getElementById('battle-log');
    if (battleLog) {
        battleLog.innerHTML += `<p>${message}</p>`;
        battleLog.scrollTop = battleLog.scrollHeight;
    }
}

// Fonctions pour le combat multijoueur
export function handleMultiplayerCombatAction(action) {
    switch(action.type) {
        case 'attack':
            playerAttack();
            break;
        case 'defend':
            playerDefend();
            break;
        case 'special':
            playerUseSpecial();
            break;
        case 'useItem':
            playerUseItem(action.item);
            break;
        default:
            console.error("Action de combat non reconnue:", action.type);
    }
}

export function getCombatState() {
    return {
        player: {
            hp: player.hp,
            maxHp: player.maxHp,
            energy: player.energy,
            maxEnergy: player.maxEnergy
        },
        enemy: {
            hp: enemy.hp,
            maxHp: enemy.maxHp
        }
    };
}

export function setCombatState(state) {
    player.hp = state.player.hp;
    player.energy = state.player.energy;
    enemy.hp = state.enemy.hp;
    updateBattleInfo();
}

// Fonction pour mettre à jour les informations du joueur (à définir dans game.js)
function updatePlayerInfo() {
    // Cette fonction devrait être définie dans game.js et importée ici
    console.log("Mise à jour des informations du joueur");
}

// Fonction pour changer la zone de jeu affichée (à définir dans game.js)
function showGameArea(areaId) {
    // Cette fonction devrait être définie dans game.js et importée ici
    console.log("Changement de la zone de jeu vers:", areaId);
}
