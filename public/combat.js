// combat.js
import { createEnemyForMission, generateUniqueEnemy, calculateDamage, generateRandomLoot } from './gameData.js';
import { updatePlayerInfo, showGameArea } from './game.js';

let player, companion, enemy, currentMission;
let currentCombat = false;
let playerTurn = true;

export function initializeCombat(playerCharacter, companionCharacter, enemyData, mission) {
    player = playerCharacter;
    companion = companionCharacter;
    enemy = mission ? createEnemyForMission(mission) : enemyData;
    currentMission = mission;
    currentCombat = true;
    playerTurn = true;
    
    updateBattleInfo();
    console.log("Combat initialisé:", { player, companion, enemy });
}

export function updateBattleInfo() {
    if (!player || !enemy) {
        console.error("Joueur ou ennemi non défini dans updateBattleInfo");
        return;
    }

    updateCharacterInfo('player-combat-info', player);
    updateCharacterInfo('enemy-combat-info', enemy);

    if (companion) {
        updateCharacterInfo('companion-combat-info', companion);
    } else {
        const companionStats = document.getElementById('companion-combat-info');
        if (companionStats) companionStats.style.display = 'none';
    }
}

function updateCharacterInfo(elementId, character) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <h3>${character.name}</h3>
            <p>PV: ${character.hp}/${character.maxHp}</p>
            ${character.energy !== undefined ? `<p>Énergie: ${character.energy}/${character.maxEnergy}</p>` : ''}
        `;
    }
}

export function playerAttack() {
    if (!validateCombatState() || !playerTurn) return;
    
    const damageResult = calculateDamage(player, enemy);
    applyDamage(enemy, damageResult);
    logAttack(player, enemy, damageResult);
    
    playerTurn = false;
    checkAndProceedCombat();
}

export function playerDefend() {
    if (!validateCombatState() || !playerTurn) return;
    
    player.defending = true;
    updateBattleLog(`${player.name} se met en position défensive.`);
    playerTurn = false;
    checkAndProceedCombat();
}

export function playerUseSpecial() {
    if (!validateCombatState() || !playerTurn) return;
    
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
    
    playerTurn = false;
    checkAndProceedCombat();
}

function enemyTurn() {
    if (!validateCombatState()) return;
    
    const damageResult = calculateDamage(enemy, player);
    let damage = damageResult.damage;
    
    if (player.defending) {
        damage = Math.floor(damage / 2);
        player.defending = false;
    }
    
    applyDamage(player, { damage, isCritical: damageResult.isCritical });
    logAttack(enemy, player, { damage, isCritical: damageResult.isCritical });
    
    playerTurn = true;
    checkBattleEnd();
}

function validateCombatState() {
    if (!currentCombat || !player || !enemy) {
        console.error("Combat non initialisé correctement");
        return false;
    }
    return true;
}

function applyDamage(target, damageResult) {
    target.hp = Math.max(target.hp - damageResult.damage, 0);
}

function logAttack(attacker, defender, damageResult) {
    updateBattleLog(`${attacker.name} inflige ${damageResult.damage} dégâts à ${defender.name}${damageResult.isCritical ? " (Coup critique!)" : ""}.`);
    updateBattleInfo();
}

function checkAndProceedCombat() {
    if (enemy.hp > 0 && !playerTurn) {
        setTimeout(enemyTurn, 1000);
    } else {
        checkBattleEnd();
    }
}

function checkBattleEnd() {
    if (enemy.hp <= 0) {
        updateBattleLog(`Vous avez vaincu ${enemy.name}!`);
        endCombat(true);
    } else if (player.hp <= 0) {
        updateBattleLog(`Vous avez été vaincu par ${enemy.name}.`);
        endCombat(false);
    } else if (playerTurn) {
        updateBattleLog("C'est à votre tour.");
    }
}

function endCombat(victory) {
    currentCombat = false;
    if (victory) {
        const expGain = currentMission ? currentMission.expReward : enemy.level * 10;
        const goldGain = currentMission ? currentMission.goldReward : enemy.level * 5;
        
        if (typeof player.gainExperience === 'function') {
            player.gainExperience(expGain);
        } else {
            console.error("La méthode gainExperience n'existe pas sur l'objet player");
            player.experience += expGain;
        }
        
        player.gold += goldGain;
        
        const loot = generateRandomLoot(enemy.level);
        
        showCombatSummary({
            result: "Victoire !",
            expGained: expGain,
            goldGained: goldGain,
            itemsFound: loot ? [loot] : []
        });
    } else {
        showCombatSummary({
            result: "Défaite",
            expGained: 0,
            goldGained: 0,
            itemsFound: []
        });
    }
    
    updatePlayerInfo();
}

function showCombatSummary(summary) {
    const summaryElement = document.createElement('div');
    summaryElement.className = 'combat-summary';
    summaryElement.innerHTML = `
        <h3>${summary.result}</h3>
        <p>Expérience gagnée : ${summary.expGained}</p>
        <p>Or gagné : ${summary.goldGained}</p>
        <h4>Objets trouvés :</h4>
        <ul>
            ${summary.itemsFound.map(item => `<li>${item.name}</li>`).join('')}
        </ul>
        <button onclick="window.closeCombatSummary()">Continuer</button>
    `;
    document.body.appendChild(summaryElement);
}

window.closeCombatSummary = function() {
    const summaryElement = document.querySelector('.combat-summary');
    if (summaryElement) {
        summaryElement.remove();
    }
    showGameArea('main-menu');
};

function updateBattleLog(message) {
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
