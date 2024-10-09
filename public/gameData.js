// gameData.js

export const items = [
    // Armes
    { id: 'sword', name: 'Épée en fer', type: 'weapon', attack: 5, cost: 50, rarity: 'common' },
    { id: 'axe', name: 'Hache de guerre', type: 'weapon', attack: 7, cost: 70, rarity: 'common' },
    { id: 'dagger', name: 'Dague des ombres', type: 'weapon', attack: 3, critChance: 10, cost: 60, rarity: 'uncommon' }, // Critique : 10% chance d'attaque critique
    { id: 'greatsword', name: 'Épée à deux mains', type: 'weapon', attack: 12, speedPenalty: 2, cost: 100, rarity: 'rare' }, // Pénalité de vitesse d'attaque
    { id: 'flameBlade', name: 'Lame enflammée', type: 'weapon', attack: 10, fireDamage: 3, cost: 150, rarity: 'rare' }, // Dégâts de feu supplémentaires
    { id: 'excalibur', name: 'Excalibur', type: 'weapon', attack: 20, holyDamage: 5, critChance: 15, cost: 500, rarity: 'legendary' }, // Dégâts sacrés, haute chance critique

    // Armures
    { id: 'shield', name: 'Bouclier en bois', type: 'armor', defense: 3, cost: 40, rarity: 'common' },
    { id: 'chainmail', name: 'Cotte de mailles', type: 'armor', defense: 5, cost: 80, rarity: 'common' },
    { id: 'plateArmor', name: 'Armure de plaques', type: 'armor', defense: 8, speedPenalty: 1, cost: 120, rarity: 'rare' }, // Pénalité de vitesse
    { id: 'dragonScaleArmor', name: 'Armure d’écailles de dragon', type: 'armor', defense: 12, fireResistance: 50, cost: 300, rarity: 'legendary' }, // Résistance au feu : 50%

    // Accessoires
    { id: 'ringOfAgility', name: 'Anneau d’agilité', type: 'accessory', effect: 'speedBoost', value: 10, cost: 80, rarity: 'uncommon' }, // Bonus de vitesse
    { id: 'amuletOfProtection', name: 'Amulette de protection', type: 'accessory', effect: 'damageReduction', value: 10, cost: 150, rarity: 'rare' }, // Réduction des dégâts
    { id: 'cloakOfInvisibility', name: 'Cape d’invisibilité', type: 'accessory', effect: 'stealth', cost: 200, rarity: 'legendary' }, // Capacité d’invisibilité temporaire

    // Consommables
    { id: 'potion', name: 'Potion de soin', type: 'consumable', effect: 'heal', value: 30, cost: 20, rarity: 'common' }, // Soigne 30 PV
    { id: 'energyDrink', name: 'Boisson énergisante', type: 'consumable', effect: 'energy', value: 50, cost: 25, rarity: 'common' }, // Restaure 50 points d'énergie
    { id: 'elixirOfVitality', name: 'Élixir de vitalité', type: 'consumable', effect: 'heal', value: 100, cost: 100, rarity: 'rare' }, // Soigne 100 PV
    { id: 'manaPotion', name: 'Potion de mana', type: 'consumable', effect: 'mana', value: 40, cost: 30, rarity: 'common' }, // Restaure 40 points de mana
    { id: 'phoenixFeather', name: 'Plume de Phénix', type: 'consumable', effect: 'revive', cost: 500, rarity: 'legendary' }, // Ressuscite le joueur avec 50% de PV

    // Objets spéciaux
    { id: 'scrollOfFireball', name: 'Parchemin de boule de feu', type: 'special', effect: 'fireball', damage: 25, cost: 70, rarity: 'uncommon' }, // Lance une boule de feu infligeant 25 dégâts
    { id: 'orbOfFrost', name: 'Orbe de givre', type: 'special', effect: 'freeze', freezeDuration: 3, cost: 150, rarity: 'rare' }, // Gèle l'ennemi pendant 3 tours
];

// Fonction pour afficher les statistiques des items
export function getItemStats(item) {
    let stats = `${item.name} (${item.type}) :`;
    
    if (item.type === 'weapon') {
        stats += `\n- Attaque : ${item.attack}`;
        if (item.critChance) stats += `\n- Chance de critique : ${item.critChance}%`;
        if (item.fireDamage) stats += `\n- Dégâts de feu : ${item.fireDamage}`;
    }

    if (item.type === 'armor') {
        stats += `\n- Défense : ${item.defense}`;
        if (item.fireResistance) stats += `\n- Résistance au feu : ${item.fireResistance}%`;
        if (item.speedPenalty) stats += `\n- Pénalité de vitesse : -${item.speedPenalty}`;
    }

    if (item.type === 'accessory') {
        stats += `\n- Effet : ${item.effect} +${item.value || ''}`;
    }

    if (item.type === 'consumable') {
        stats += `\n- Effet : ${item.effect} +${item.value}`;
    }

    if (item.type === 'special') {
        stats += `\n- Effet spécial : ${item.effect}`;
        if (item.damage) stats += `\n- Dégâts : ${item.damage}`;
        if (item.freezeDuration) stats += `\n- Durée de gel : ${item.freezeDuration} tours`;
    }

    stats += `\n- Coût : ${item.cost} pièces d'or`;
    stats += `\n- Rareté : ${item.rarity}`;
    return stats;
}

export const missions = [
    { name: "Éliminer des gobelins", enemyLevel: 1, goldReward: 15, expReward: 20, difficulty: 'Facile' },
    { name: "Chasser un loup géant", enemyLevel: 2, goldReward: 30, expReward: 40, difficulty: 'Moyenne' },
    { name: "Vaincre un bandit", enemyLevel: 3, goldReward: 50, expReward: 60, difficulty: 'Moyenne' },
    { name: "Affronter un ogre", enemyLevel: 4, goldReward: 80, expReward: 90, difficulty: 'Difficile' },
    { name: "Explorer une grotte hantée", enemyLevel: 5, goldReward: 120, expReward: 130, difficulty: 'Difficile' },
    { name: "Combattre un dragon", enemyLevel: 7, goldReward: 200, expReward: 250, difficulty: 'Très Difficile' },
    { name: "Infiltrer un repaire de bandits", enemyLevel: 6, goldReward: 150, expReward: 180, difficulty: 'Difficile' },
    { name: "Chasser un troll des montagnes", enemyLevel: 8, goldReward: 250, expReward: 300, difficulty: 'Très Difficile' }
];

export const dropRates = {
    'Facile': 0.1,
    'Moyenne': 0.15,
    'Difficile': 0.2,
    'Très Difficile': 0.25,
};

export const enemies = [
    { name: "Gobelin", hp: 30, attack: 5, defense: 2 },
    { name: "Loup géant", hp: 50, attack: 8, defense: 3 },
    { name: "Bandit", hp: 70, attack: 10, defense: 5 },
    { name: "Ogre", hp: 100, attack: 15, defense: 8 },
    { name: "Fantôme", hp: 80, attack: 12, defense: 10 },
    { name: "Dragon", hp: 200, attack: 25, defense: 15 },
    { name: "Troll", hp: 150, attack: 20, defense: 12 },
    { name: "Sorcier maléfique", hp: 120, attack: 18, defense: 10 }
];

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
