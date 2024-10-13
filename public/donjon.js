// donjon.js

import { getRandomElement } from './gameData.js';

const enemyTypes = ['Gobelin', 'Orc', 'Squelette', 'Zombie', 'Bandit', 'Loup', 'Chauve-souris géante', 'Slime'];
const enemyPrefixes = ['Féroce', 'Enragé', 'Géant', 'Minuscule', 'Rusé', 'Corrompu', 'Ancien', 'Mystérieux'];

export function generateRandomEnemy(playerLevel) {
    const baseStats = {
        hp: 20 + playerLevel * 5,
        attack: 5 + playerLevel * 2,
        defense: 2 + playerLevel
    };

    const enemy = {
        name: `${getRandomElement(enemyPrefixes)} ${getRandomElement(enemyTypes)}`,
        level: playerLevel + Math.floor(Math.random() * 3) - 1,
        hp: baseStats.hp + Math.floor(Math.random() * 10),
        attack: baseStats.attack + Math.floor(Math.random() * 5),
        defense: baseStats.defense + Math.floor(Math.random() * 3)
    };

    return enemy;
}

export function generateRandomReward(playerLevel) {
    const baseGold = 10 * playerLevel;
    const baseExp = 15 * playerLevel;

    return {
        gold: baseGold + Math.floor(Math.random() * baseGold),
        exp: baseExp + Math.floor(Math.random() * baseExp),
        item: Math.random() < 0.3 ? 'Un objet aléatoire' : null // 30% de chance d'obtenir un objet
    };
}

export function generateDonjonEvent(playerLevel) {
    const enemy = generateRandomEnemy(playerLevel);
    const reward = generateRandomReward(playerLevel);

    return {
        type: 'combat',
        enemy: enemy,
        reward: reward,
        description: `Vous rencontrez un ${enemy.name} (Niveau ${enemy.level})`
    };
}

// Vous pouvez ajouter d'autres types d'événements ici (pièges, trésors, etc.)

export function generateDonjon(playerLevel, length = 5) {
    const donjon = [];
    for (let i = 0; i < length; i++) {
        donjon.push(generateDonjonEvent(playerLevel));
    }
    return donjon;
}
