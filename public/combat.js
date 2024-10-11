// combat.js
import { Character, items, missions, dropRates, getRandomCompanion, getRandomItem } from './gameData.js';
import { updatePlayerInfo, showGameArea } from './game.js';

let player, enemy, currentMission;

export function initializeCombat(playerCharacter, missionIndex, chosenEnemy) {
    player = playerCharacter;
    currentMission = missions[missionIndex];
    enemy = chosenEnemy;
    
    // Ajuster les statistiques de l'ennemi en fonction du niveau de la mission
    enemy.maxHp = enemy.hp * currentMission.enemyLevel;
    enemy.hp = enemy.maxHp;
    enemy.attack *= currentMission.enemyLevel;
    enemy.defense *= currentMission.enemyLevel;
    
    updateBattleInfo();
    console.log("Combat initialisé:", { player, enemy, currentMission });
}

export function updateBattleInfo() {
    const playerStats = document.getElementById('player-combat-info');
    const enemyStats = document.getElementById('enemy-combat-info');
    const companionStats = document.getElementById('companion-combat-info');

    if (playerStats && player) {
        playerStats.querySelector('h3').textContent = player.name;
        playerStats.querySelector('h3').style.color = 'blue';
        playerStats.querySelector('.health-text').textContent = `${player.hp}/${player.maxHp} PV`;
        playerStats.querySelector('.health-bar-fill').style.width = `${(player.hp / player.maxHp) * 100}%`;
        playerStats.querySelector('.energy-text').textContent = `${player.energy}/${player.maxEnergy} Énergie`;
        playerStats.querySelector('.energy-bar-fill').style.width = `${(player.energy / player.maxEnergy) * 100}%`;
    }
    
    if (enemyStats && enemy) {
        enemyStats.querySelector('h3').textContent = enemy.name;
        enemyStats.querySelector('h3').style.color = 'red';
        enemyStats.querySelector('.health-text').textContent = `${enemy.hp}/${enemy.maxHp} PV`;
        enemyStats.querySelector('.health-bar-fill').style.width = `${(enemy.hp / enemy.maxHp) * 100}%`;
    }

    if (companionStats && companion) {
        companionStats.style.display = 'block';
        companionStats.querySelector('h3').textContent = companion.name;
        companionStats.querySelector('h3').style.color = 'green';
        companionStats.querySelector('.health-text').textContent = `${companion.hp}/${companion.maxHp} PV`;
        companionStats.querySelector('.health-bar-fill').style.width = `${(companion.hp / companion.maxHp) * 100}%`;
    } else if (companionStats) {
        companionStats.style.display = 'none';
    }
}

export function playerAttack() {
    if (!player || !enemy) {
        console.error("Combat non initialisé correctement");
        return;
    }
    const damage = Math.max(player.attack - enemy.defense, 1);
    enemy.hp = Math.max(enemy.hp - damage, 0);
    updateBattleLog(`${player.name} inflige ${damage} dégâts à ${enemy.name}.`);
    updateBattleInfo();
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
    const specialDamage = Math.max(player.attack * 1.5 - enemy.defense, 1);
    enemy.hp = Math.max(enemy.hp - specialDamage, 0);
    player.energy -= energyCost;
    updateBattleLog(`${player.name} utilise une attaque spéciale et inflige ${specialDamage} dégâts à ${enemy.name}.`);
    updateBattleInfo();
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
    let damage = Math.max(enemy.attack - player.defense, 1);
    if (player.defending) {
        damage = Math.floor(damage / 2);
        player.defending = false;
    }
    player.hp = Math.max(player.hp - damage, 0);
    updateBattleLog(`${enemy.name} inflige ${damage} dégâts à ${player.name}.`);
    updateBattleInfo();
    checkBattleEnd();
}

function checkBattleEnd() {
    if (enemy.hp <= 0) {
        endCombat(true);
    } else if (player.hp <= 0) {
        endCombat(false);
    } else {
        setTimeout(() => {
            enemyTurn();
        }, 1000);
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
        updateBattleLog("Défaite ! Vous avez perdu le combat.");
        player.hp = Math.max(player.hp, Math.floor(player.maxHp * 0.1)); // Évite la mort totale
    }
    updatePlayerInfo();
    setTimeout(() => showGameArea('adventure-menu'), 2000); // Délai pour lire le résultat
}

export function updateBattleLog(message) {
    const battleLog = document.getElementById('battle-log');
    if (battleLog) {
        const messageElement = document.createElement('p');
        messageElement.textContent = message;
        battleLog.appendChild(messageElement);
        battleLog.scrollTop = battleLog.scrollHeight;
    } else {
        console.error("Élément 'battle-log' non trouvé");
    }
}

console.log("Module de combat chargé");
