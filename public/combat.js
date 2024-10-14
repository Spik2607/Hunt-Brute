// combat.js
import { createEnemyForMission, generateUniqueEnemy, calculateDamage } from './gameData.js';

let player, companion, enemy, currentMission;
let currentCombat = false;

export function initializeCombat(playerCharacter, companionCharacter, enemyData, mission) {
    player = playerCharacter;
    companion = companionCharacter;
    
    if (mission) {
        // Mode mission : utiliser l'ennemi de niveau fixe de la mission
        enemy = createEnemyForMission(mission);
    } else {
        // Mode donjon : utiliser l'ennemi généré aléatoirement
        enemy = generateUniqueEnemy(enemyData.level);
    }
    
    currentMission = mission;
    currentCombat = true;
    
    updateBattleInfo();
    console.log("Combat initialisé:", { player, companion, enemy });
}

export function updateBattleInfo() {
    const playerStats = document.getElementById('player-combat-info');
    const companionStats = document.getElementById('companion-combat-info');
    const enemyStats = document.getElementById('enemy-combat-info');

    if (playerStats && player) {
        playerStats.querySelector('h3').textContent = player.name;
        playerStats.querySelector('.health-text').textContent = `${player.hp}/${player.maxHp} PV`;
        playerStats.querySelector('.health-bar-fill').style.width = `${(player.hp / player.maxHp) * 100}%`;
        playerStats.querySelector('.energy-text').textContent = `${player.energy}/${player.maxEnergy} Énergie`;
        playerStats.querySelector('.energy-bar-fill').style.width = `${(player.energy / player.maxEnergy) * 100}%`;
    }
    
    if (companionStats) {
        if (companion) {
            companionStats.style.display = 'block';
            companionStats.querySelector('h3').textContent = companion.name;
            companionStats.querySelector('.health-text').textContent = `${companion.hp}/${companion.maxHp} PV`;
            companionStats.querySelector('.health-bar-fill').style.width = `${(companion.hp / companion.maxHp) * 100}%`;
        } else {
            companionStats.style.display = 'none';
        }
    }
    
    if (enemyStats && enemy) {
        enemyStats.querySelector('h3').textContent = enemy.name;
        enemyStats.querySelector('.health-text').textContent = `${enemy.hp}/${enemy.maxHp} PV`;
        enemyStats.querySelector('.health-bar-fill').style.width = `${(enemy.hp / enemy.maxHp) * 100}%`;
    }
}

export function playerAttack() {
    if (!currentCombat || !player || !enemy) {
        console.error("Combat non initialisé correctement");
        return;
    }
    const damageResult = calculateDamage(player, enemy);
    enemy.hp = Math.max(enemy.hp - damageResult.damage, 0);
    updateBattleLog(`${player.name} inflige ${damageResult.damage} dégâts à ${enemy.name}${damageResult.isCritical ? " (Coup critique!)" : ""}.`);
    updateBattleInfo();
    
    if (enemy.hp > 0) {
        setTimeout(enemyTurn, 1000);
    } else {
        checkBattleEnd();
    }
}

export function playerDefend() {
    if (!currentCombat) return;
    player.defending = true;
    updateBattleLog(`${player.name} se met en position défensive.`);
    setTimeout(enemyTurn, 1000);
}

export function playerUseSpecial() {
    if (!currentCombat || !player || !enemy) return;
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
    
    if (enemy.hp > 0) {
        setTimeout(enemyTurn, 1000);
    } else {
        checkBattleEnd();
    }
}

function enemyTurn() {
    if (!currentCombat || !player || !enemy) return;
    const damageResult = calculateDamage(enemy, player);
    let damage = damageResult.damage;
    if (player.defending) {
        damage = Math.floor(damage / 2);
        player.defending = false;
    }
    player.hp = Math.max(player.hp - damage, 0);
    updateBattleLog(`${enemy.name} inflige ${damage} dégâts à ${player.name}${damageResult.isCritical ? " (Coup critique!)" : ""}.`);
    updateBattleInfo();
    checkBattleEnd();
}

function checkBattleEnd() {
    if (enemy.hp <= 0) {
        updateBattleLog(`Vous avez vaincu ${enemy.name}!`);
        endCombat(true);
    } else if (player.hp <= 0) {
        updateBattleLog(`Vous avez été vaincu par ${enemy.name}.`);
        endCombat(false);
    }
}

function endCombat(victory) {
    currentCombat = false;
    if (victory) {
        const expGain = currentMission ? currentMission.expReward : enemy.level * 10;
        const goldGain = currentMission ? currentMission.goldReward : enemy.level * 5;
        player.gainExperience(expGain);
        player.gold += goldGain;
        updateBattleLog(`Victoire ! Vous gagnez ${expGain} XP et ${goldGain} or.`);
    } else {
        updateBattleLog("Défaite ! Vous avez perdu le combat.");
        player.hp = Math.max(player.hp, Math.floor(player.maxHp * 0.1));
    }
    
    window.dispatchEvent(new CustomEvent('combatEnd', { detail: { victory } }));
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

export function isCombatActive() {
    return currentCombat;
}

console.log("Module de combat chargé");
