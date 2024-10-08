// gameData.js

const items = [
    { id: 'sword', name: 'Épée en fer', type: 'weapon', attack: 5, cost: 50 },
    { id: 'shield', name: 'Bouclier en bois', type: 'armor', defense: 3, cost: 40 },
    { id: 'potion', name: 'Potion de soin', type: 'consumable', heal: 30, cost: 20 },
    { id: 'axe', name: 'Hache de guerre', type: 'weapon', attack: 7, cost: 70 },
    { id: 'plate_armor', name: 'Armure de plates', type: 'armor', defense: 5, cost: 80 },
    { id: 'magic_wand', name: 'Baguette magique', type: 'weapon', attack: 6, magic: 3, cost: 100 },
];

const missions = [
    { id: 'goblin', name: "Éliminer des gobelins", enemyLevel: 1, goldReward: 20, expReward: 30, difficulty: 'Facile' },
    { id: 'wolf', name: "Chasser un loup géant", enemyLevel: 2, goldReward: 40, expReward: 50, difficulty: 'Moyenne' },
    { id: 'bandit', name: "Vaincre un bandit", enemyLevel: 3, goldReward: 60, expReward: 70, difficulty: 'Moyenne' },
    { id: 'ogre', name: "Affronter un ogre", enemyLevel: 4, goldReward: 100, expReward: 100, difficulty: 'Difficile' },
    { id: 'dragon', name: "Combattre un jeune dragon", enemyLevel: 5, goldReward: 200, expReward: 150, difficulty: 'Très difficile' },
];

const dropRates = {
    'Facile': 0.2,
    'Moyenne': 0.3,
    'Difficile': 0.4,
    'Très difficile': 0.5
};

export { items, missions, dropRates };
