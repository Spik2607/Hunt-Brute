// combat.js
import { createEnemyForMission, generateUniqueEnemy, calculateDamage } from './gameData.js';

let player, companion, enemy, currentMission;
let currentCombat = false;

export function initializeCombat(playerCharacter, companionCharacter, enemyData, mission) {
    player = playerCharacter;
    companion = companionCharacter;
    
    if (mission) {
        // Mode mission : utiliser l'ennemi de niveau fixe de la mission
        enemy = enemyData;
    } else {
        // Mode donjon : utiliser l'ennemi généré aléatoirement
        enemy = enemyData;
    }
    
    currentMission = mission;
    currentCombat = true;
    
    updateBattleInfo();
    console.log("Combat initialisé:", { player, companion, enemy });
}

export function updateBattleInfo() {
    if (!player || !enemy) {
        console.error("Joueur ou ennemi non défini dans updateBattleInfo");
        return;
    }

    const playerStats = document.getElementById('player-combat-info');
    const companionStats = document.getElementById('companion-combat-info');
    const enemyStats = document.getElementById('enemy-combat-info');

    if (playerStats) {
        playerStats.innerHTML = `
            <h3>${player.name}</h3>
            <p>PV: ${player.hp}/${player.maxHp}</p>
            <p>Énergie: ${player.energy}/${player.maxEnergy}</p>
        `;
    }

    if (companionStats && companion) {
        companionStats.innerHTML = `
            <h3>${companion.name}</h3>
            <p>PV: ${companion.hp}/${companion.maxHp}</p>
        `;
    } else if (companionStats) {
        companionStats.style.display = 'none';
    }

    if (enemyStats) {
        enemyStats.innerHTML = `
            <h3>${enemy.name}</h3>
            <p>PV: ${enemy.hp}/${enemy.maxHp}</p>
        `;
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
        
        updateBattleLog(`Victoire ! Vous avez vaincu ${enemy.name} !`);
        updateBattleLog(`Vous gagnez ${expGain} XP et ${goldGain} or.`);
        
        // Vérifier si un objet a été obtenu
        const loot = generateRandomLoot(enemy.level);
        if (loot) {
            player.inventory.push(loot);
            updateBattleLog(`Vous avez obtenu : ${loot.name}`);
        }
        
        // Vérifier si le joueur a monté de niveau
        if (player.checkLevelUp()) {
            updateBattleLog(`Félicitations ! Vous avez atteint le niveau ${player.level} !`);
            // Afficher une fenêtre modale pour la distribution des points de compétence
            showLevelUpModal();
        }
        
        // Attendre un peu avant de retourner au menu principal
        setTimeout(() => {
            showGameArea('main-menu');
            updatePlayerInfo();
        }, 3000);
    } else {
        updateBattleLog("Défaite ! Vous avez perdu le combat.");
        
        // Réduire l'or du joueur (par exemple, perte de 10% de l'or)
        const goldLoss = Math.floor(player.gold * 0.1);
        player.gold -= goldLoss;
        updateBattleLog(`Vous avez perdu ${goldLoss} or.`);
        
        // Restaurer une partie des PV du joueur
        player.hp = Math.max(player.hp, Math.floor(player.maxHp * 0.1));
        updateBattleLog("Vous avez été soigné partiellement.");
        
        // Attendre un peu avant de retourner au menu principal
        setTimeout(() => {
            showGameArea('main-menu');
            updatePlayerInfo();
        }, 3000);
    }
    
    // Réinitialiser les états de combat
    player.defending = false;
    enemy = null;
    currentMission = null;
    
    // Mettre à jour l'affichage
    updateBattleInfo();
    updatePlayerInfo();
    
    // Déclencher un événement personnalisé pour informer le reste de l'application
    const event = new CustomEvent('combatEnd', { detail: { victory } });
    window.dispatchEvent(event);
}
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
