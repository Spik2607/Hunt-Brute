// gameData.js

export const items = [
    { id: 'sword', name: 'Épée en fer', type: 'weapon', attack: 5, cost: 50 },
    { id: 'shield', name: 'Bouclier en bois', type: 'armor', defense: 3, cost: 40 },
    { id: 'potion', name: 'Potion de soin', type: 'consumable', effect: 'heal', value: 30, cost: 20 },
    { id: 'energyDrink', name: 'Boisson énergisante', type: 'consumable', effect: 'energy', value: 50, cost: 25 },
    { id: 'axe', name: 'Hache de guerre', type: 'weapon', attack: 7, cost: 70 },
    { id: 'chainmail', name: 'Cotte de mailles', type: 'armor', defense: 5, cost: 80 }
];

export const missions = [
    { name: "Éliminer des gobelins", enemyLevel: 1, goldReward: 20, expReward: 30, difficulty: 'Facile' },
    { name: "Chasser un loup géant", enemyLevel: 2, goldReward: 40, expReward: 50, difficulty: 'Moyenne' },
    { name: "Vaincre un bandit", enemyLevel: 3, goldReward: 60, expReward: 70, difficulty: 'Moyenne' },
    { name: "Affronter un ogre", enemyLevel: 4, goldReward: 100, expReward: 100, difficulty: 'Difficile' },
    { name: "Explorer une grotte hantée", enemyLevel: 5, goldReward: 150, expReward: 150, difficulty: 'Difficile' }
];

export const dropRates = {
    'Facile': 0.2,
    'Moyenne': 0.3,
    'Difficile': 0.4,
};

export const companionTypes = [
    { type: 'animal', names: ['Loup', 'Ours', 'Aigle', 'Panthère', 'Tigre', 'Serpent'] },
    { type: 'monster', names: ['Gobelin apprivoisé', 'Petit dragon', 'Golem de pierre'] },
    { type: 'slave', names: ['Écuyer', 'Porteur', 'Archer','Esclave'] },
    { type: 'spirit', names: ['Esprit du feu', 'Esprit de l eau', 'Esprit de l air', 'Esprit de la terre'] },
    { type: 'shinigami', names: ['Faucheur d âmes', 'Shinigami', 'Ombre'] }
];

export function getRandomCompanionName(type) {
    const typeData = companionTypes.find(t => t.type === type);
    if (typeData) {
        return typeData.names[Math.floor(Math.random() * typeData.names.length)];
    }
    return 'Compagnon inconnu';
}
