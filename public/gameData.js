// gameData.js

export const items = [
    { id: 'sword', name: 'Épée en fer', type: 'weapon', attack: 5, cost: 50 },
    { id: 'shield', name: 'Bouclier en bois', type: 'armor', defense: 3, cost: 40 },
    { id: 'potion', name: 'Potion de soin', type: 'consumable', heal: 30, cost: 20 },
    // Ajoutez d'autres objets ici
];

export const missions = [
    { name: "Éliminer des gobelins", enemyLevel: 1, goldReward: 20, expReward: 30, difficulty: 'Facile' },
    { name: "Chasser un loup géant", enemyLevel: 2, goldReward: 40, expReward: 50, difficulty: 'Moyenne' },
    { name: "Vaincre un bandit", enemyLevel: 3, goldReward: 60, expReward: 70, difficulty: 'Moyenne' },
    { name: "Affronter un ogre", enemyLevel: 4, goldReward: 100, expReward: 100, difficulty: 'Difficile' },
    { name: "Explorer une grotte hantée", enemyLevel: 5, goldReward: 150, expReward: 150, difficulty: 'Difficile' },
];

export const dropRates = {
    'Facile': 0.2,
    'Moyenne': 0.3,
    'Difficile': 0.4,
};

export const expeditions = [
    { name: "Forêt dense", resourceType: "wood", maxResourceGain: 50 },
    { name: "Montagne rocheuse", resourceType: "stone", maxResourceGain: 40 },
    { name: "Mine abandonnée", resourceType: "iron", maxResourceGain: 30 },
];

export const raids = [
    {
        name: "Village gobelin",
        getLoot: () => ({
            soldiers: Math.floor(Math.random() * 5),
            slaves: Math.floor(Math.random() * 10),
            items: [items[Math.floor(Math.random() * items.length)]]
        })
    },
    {
        name: "Campement bandit",
        getLoot: () => ({
            soldiers: Math.floor(Math.random() * 3),
            slaves: Math.floor(Math.random() * 5),
            items: [items[Math.floor(Math.random() * items.length)], items[Math.floor(Math.random() * items.length)]]
        })
    },
];
