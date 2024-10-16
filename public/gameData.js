// gameData.js

export class Character {
    constructor(name, hp, attack, defense, energy = 100) {
        this.name = name;
        this.level = 1;
        this.maxHp = hp;
        this.hp = hp;
        this.attack = attack;
        this.defense = defense;
        this.experience = 0;
        this.gold = 0;
        this.inventory = [];
        this.equippedItems = {
            weapon: null,
            armor: null,
            accessory: null
        };
        this.energy = energy;
        this.maxEnergy = energy;
        this.resources = { wood: 0, stone: 0, iron: 0 };
        this.companions = [];
        this.skillPoints = 0;
        this.skills = {
            strength: 0,
            agility: 0,
            intelligence: 0
        };
    }

    levelUp() {
        this.level++;
        this.maxHp += 10;
        this.hp = this.maxHp;
        this.attack += 2;
        this.defense += 1;
        this.skillPoints += 3;
        console.log(`${this.name} a atteint le niveau ${this.level}!`);
    }

    gainExperience(amount) {
        this.experience += amount;
        console.log(`${this.name} a gagné ${amount} points d'expérience.`);
        while (this.experience >= this.level * 100) {
            this.experience -= this.level * 100;
            this.levelUp();
        }
    }

    regenerateHP() {
        const regenAmount = Math.floor(this.maxHp * 0.05);
        this.hp = Math.min(this.hp + regenAmount, this.maxHp);
    }

    regenerateEnergy() {
        const regenAmount = Math.floor(this.maxEnergy * 0.1);
        this.energy = Math.min(this.energy + regenAmount, this.maxEnergy);
    }

    equip(item) {
        if (item.type in this.equippedItems) {
            if (this.equippedItems[item.type]) {
                this.unequip(item.type);
            }
            this.equippedItems[item.type] = item;
            this.applyItemEffects(item);
            console.log(`${this.name} a équipé ${item.name}.`);
        }
    }

    unequip(itemType) {
        const item = this.equippedItems[itemType];
        if (item) {
            this.removeItemEffects(item);
            this.equippedItems[itemType] = null;
            this.inventory.push(item);
            console.log(`${this.name} a déséquipé ${item.name}.`);
        }
    }

    applyItemEffects(item) {
        if (item.attack) this.attack += item.attack;
        if (item.defense) this.defense += item.defense;
        if (item.maxHp) {
            this.maxHp += item.maxHp;
            this.hp += item.maxHp;
        }
    }

    removeItemEffects(item) {
        if (item.attack) this.attack -= item.attack;
        if (item.defense) this.defense -= item.defense;
        if (item.maxHp) {
            this.maxHp -= item.maxHp;
            this.hp = Math.min(this.hp, this.maxHp);
        }
    }

    useItem(item) {
        if (item.type === 'consumable') {
            if (item.effect === 'heal') {
                this.hp = Math.min(this.hp + item.value, this.maxHp);
            } else if (item.effect === 'energy') {
                this.energy = Math.min(this.energy + item.value, this.maxEnergy);
            }
            const index = this.inventory.indexOf(item);
            if (index > -1) {
                this.inventory.splice(index, 1);
            }
            console.log(`${this.name} a utilisé ${item.name}.`);
        }
    }
}

export function getAvailableMissions(playerLevel) {
    // Filtrer les missions en fonction du niveau du joueur
    return missions.filter(mission => {
        // Par exemple, on peut rendre disponibles les missions jusqu'à 2 niveaux au-dessus du joueur
        return mission.enemyLevel <= playerLevel + 2;
    });
}

export const items = [
    // Armes
    { id: 'sword', name: 'Épée en fer', type: 'weapon', attack: 5, cost: 50, rarity: 'common' },
    { id: 'axe', name: 'Hache de guerre', type: 'weapon', attack: 7, cost: 70, rarity: 'common' },
    { id: 'dagger', name: 'Dague des ombres', type: 'weapon', attack: 3, critChance: 10, cost: 60, rarity: 'uncommon' },
    { id: 'greatsword', name: 'Épée à deux mains', type: 'weapon', attack: 12, speedPenalty: 2, cost: 100, rarity: 'rare' },
    { id: 'flameBlade', name: 'Lame enflammée', type: 'weapon', attack: 10, fireDamage: 3, cost: 150, rarity: 'rare' },
    { id: 'excalibur', name: 'Excalibur', type: 'weapon', attack: 40, holyDamage: 5, critChance: 15, cost: 500, rarity: 'legendary' },
    { id: 'longbow', name: 'Arc long', type: 'weapon', attack: 8, range: 2, cost: 90, rarity: 'uncommon' },
    { id: 'frostStaff', name: 'Bâton de givre', type: 'weapon', attack: 6, iceDamage: 4, cost: 130, rarity: 'rare' },

    // Armures
    { id: 'shield', name: 'Bouclier en bois', type: 'armor', defense: 3, cost: 40, rarity: 'common' },
    { id: 'chainmail', name: 'Cotte de mailles', type: 'armor', defense: 8, cost: 80, rarity: 'common' },
    { id: 'plateArmor', name: 'Armure de plaques', type: 'armor', defense: 20, speedPenalty: 1, cost: 500, rarity: 'rare' },
    { id: 'dragonScaleArmor', name: "Armure d'écailles de dragon", type: 'armor', defense: 50, fireResistance: 50, cost: 1000, rarity: 'legendary' },
    { id: 'leatherArmor', name: 'Armure de cuir', type: 'armor', defense: 15, cost: 60, rarity: 'common' },

    // Accessoires
    { id: 'ringOfAgility', name: "Anneau d'agilité", type: 'accessory', effect: 'speedBoost', value: 10, cost: 80, rarity: 'uncommon' },
    { id: 'amuletOfProtection', name: 'Amulette de protection', type: 'accessory', effect: 'damageReduction', value: 10, cost: 500, rarity: 'rare' },
    { id: 'cloakOfInvisibility', name: "Cape d'invisibilité", type: 'accessory', effect: 'stealth', cost: 1000, rarity: 'legendary' },
    { id: 'ringOfHealth', name: 'Anneau de santé', type: 'accessory', effect: 'healthBoost', value: 20, cost: 300, rarity: 'uncommon' },
    { id: 'speedBoots', name: 'Bottes de célérité', type: 'accessory', effect: 'moveSpeed', value: 15, cost: 250, rarity: 'rare' },

    // Consommables
    { id: 'healingPotion', name: 'Potion de soin', type: 'consumable', effect: 'heal', value: 30, cost: 20, rarity: 'common' },
    { id: 'energyDrink', name: 'Boisson énergisante', type: 'consumable', effect: 'energy', value: 50, cost: 25, rarity: 'common' },
    { id: 'elixirOfVitality', name: 'Élixir de vitalité', type: 'consumable', effect: 'heal', value: 100, cost: 100, rarity: 'rare' },
    { id: 'manaPotion', name: 'Potion de mana', type: 'consumable', effect: 'mana', value: 40, cost: 30, rarity: 'common' },
    { id: 'phoenixFeather', name: 'Plume de Phénix', type: 'consumable', effect: 'revive', cost: 900, rarity: 'legendary' },
    { id: 'throwingKnives', name: 'Couteaux de lancer', type: 'consumable', effect: 'damage', value: 100, cost: 200, rarity: 'common' },

    // Objets spéciaux
    { id: 'scrollOfFireball', name: 'Parchemin de boule de feu', type: 'special', effect: 'fireball', damage: 25, cost: 70, rarity: 'uncommon' },
    { id: 'orbOfFrost', name: 'Orbe de givre', type: 'special', effect: 'freeze', freezeDuration: 3, cost: 150, rarity: 'rare' },
];

export const missions = [
    { name: "Éliminer des gobelins", enemy: "Gobelin", enemyLevel: 1, goldReward: 15, expReward: 20, difficulty: 'Facile' },
    { name: "Chasser un loup géant", enemy: "Loup géant", enemyLevel: 2, goldReward: 30, expReward: 40, difficulty: 'Moyenne' },
    { name: "Vaincre un bandit", enemy: "Bandit", enemyLevel: 3, goldReward: 50, expReward: 60, difficulty: 'Moyenne' },
    { name: "Affronter un ogre", enemy: "Ogre", enemyLevel: 4, goldReward: 80, expReward: 90, difficulty: 'Difficile' },
    { name: "Explorer une grotte hantée", enemy: "Fantôme", enemyLevel: 5, goldReward: 120, expReward: 130, difficulty: 'Difficile' },
    { name: "Combattre un dragon", enemy: "Dragon", enemyLevel: 7, goldReward: 200, expReward: 250, difficulty: 'Très Difficile' },
    { name: "Infiltrer un repaire de bandits", enemy: "Assassin", enemyLevel: 6, goldReward: 150, expReward: 180, difficulty: 'Difficile' },
    { name: "Chasser un troll des montagnes", enemy: "Troll", enemyLevel: 6, goldReward: 250, expReward: 300, difficulty: 'Très Difficile' },
    { name: "Nettoyer les égouts de la ville", enemy: "Gobelin", enemyLevel: 2, goldReward: 40, expReward: 50, difficulty: 'Moyenne' },
    { name: "Escorter une caravane marchande", enemy: "Bandit", enemyLevel: 3, goldReward: 70, expReward: 80, difficulty: 'Moyenne' },
    { name: "Détruire un nid de harpies", enemy: "Harpie", enemyLevel: 5, goldReward: 140, expReward: 150, difficulty: 'Difficile' },
    { name: "Récupérer un artefact dans des ruines anciennes", enemy: "Golem de pierre", enemyLevel: 6, goldReward: 180, expReward: 200, difficulty: 'Difficile' },
    { name: "Vaincre un géant des tempêtes", enemy: "Géant des tempêtes", enemyLevel: 8, goldReward: 300, expReward: 350, difficulty: 'Très Difficile' },
];

export const dropRates = {
    'Facile': 0.05,
    'Moyenne': 0.075,
    'Difficile': 0.2,
    'Très Difficile': 0.25,
};

export const enemies = [
    { name: "Gobelin", level: 1, hp: 70, attack: 7, defense: 4 },
    { name: "Loup géant", level: 2, hp: 145, attack: 17, defense: 14 },
    { name: "Bandit", level: 3, hp: 200, attack: 25, defense: 20 },
    { name: "Ogre", level: 4, hp: 400, attack: 45, defense: 36 },
    { name: "Fantôme", level: 5, hp: 300, attack: 55, defense: 36 },
    { name: "Dragon", level: 7, hp: 700, attack: 85, defense: 90 },
    { name: "Troll", level: 6, hp: 150, attack: 20, defense: 12 },
    { name: "Sorcier", level: 5, hp: 120, attack: 18, defense: 10 },
    { name: "Harpie", level: 4, hp: 90, attack: 14, defense: 6 },
    { name: "Golem de pierre", level: 5, hp: 750, attack: 90, defense: 114 },
    { name: "Assassin", level: 6, hp: 400, attack: 60, defense: 45 },
    { name: "Géant des tempêtes", level: 8, hp: 1250, attack: 130, defense: 118 },
    { name: "Liche", level: 9, hp: 1800, attack: 235, defense: 220 },
];

export const companionTypes = [
    { type: 'animal', names: ['Loup', 'Ours', 'Aigle', 'Panthère', 'Tigre', 'Serpent'] },
    { type: 'monster', names: ['Gobelin apprivoisé', 'Petit dragon', 'Golem de pierre'] },
    { type: 'slave', names: ['Écuyer', 'Porteur', 'Archer', 'Esclave'] },
    { type: 'spirit', names: ['Esprit du feu', "Esprit de l'eau", "Esprit de l'air", 'Esprit de la terre'] },
    { type: 'shinigami', names: ['Faucheur', 'Shinigami', 'Ombre'] }
];

export function generateBossReward(bossLevel) {
    // Implémentez la logique pour générer une récompense de boss ici
    // Par exemple :
    const goldReward = bossLevel * 100;
    const expReward = bossLevel * 50;
    const itemReward = getRandomRareItem(bossLevel);

    return {
        gold: goldReward,
        experience: expReward,
        item: itemReward
    };
}


export function getItemStats(item) {
    let stats = `${item.name} (${item.type}) :`;
    
    if (item.type === 'weapon') {
        stats += `\n- Attaque : ${item.attack}`;
        if (item.critChance) stats += `\n- Chance de critique : ${item.critChance}%`;
        if (item.fireDamage) stats += `\n- Dégâts de feu : ${item.fireDamage}`;
        if (item.iceDamage) stats += `\n- Dégâts de glace : ${item.iceDamage}`;
        if (item.holyDamage) stats += `\n- Dégâts sacrés : ${item.holyDamage}`;
        if (item.range) stats += `\n- Portée : ${item.range}`;
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

export function getRandomCompanionName(type) {
    const typeData = companionTypes.find(t => t.type === type);
    if (typeData) {
        return typeData.names[Math.floor(Math.random() * typeData.names.length)];
    }
    return 'Compagnon inconnu';
}

export function getRandomCompanion() {
    const types = ['animal', 'monster', 'slave', 'spirit', 'shinigami'];
    const type = types[Math.floor(Math.random() * types.length)];
    const name = getRandomCompanionName(type);
    return new Character(name, 50, 5, 3, 50); // Nom, HP, Attaque, Défense, Énergie
}

export function getRandomItem() {
    return items[Math.floor(Math.random() * items.length)];
}

export function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

export function getRandomEnemy() {
    return getRandomElement(enemies);
}

export function getRandomMission() {
    return getRandomElement(missions);
}

export function createEnemy(baseName, level) {
    const baseEnemy = enemies.find(e => e.name === baseName);
    if (!baseEnemy) return null;

    const levelDifference = level - baseEnemy.level;
    const scalingFactor = 1 + (levelDifference * 0.1);

    return {
        name: baseEnemy.name,
        level: level,
        hp: Math.round(baseEnemy.hp * scalingFactor),
        attack: Math.round(baseEnemy.attack * scalingFactor),
        defense: Math.round(baseEnemy.defense * scalingFactor)
    };
}

export function generateRandomLoot(enemyLevel) {
    const lootChance = Math.random();
    if (lootChance < 0.6) {
        // 60% chance de ne rien obtenir
        return null;
    } else if (lootChance < 0.9) {
        // 30% chance d'obtenir un objet aléatoire
        return getRandomItem();
    } else {
        // 10% chance d'obtenir un objet rare ou mieux
        const rareItems = items.filter(item => ['rare', 'legendary'].includes(item.rarity));
        return rareItems[Math.floor(Math.random() * rareItems.length)];
    }
}

export function calculateDamage(attacker, defender) {
    const baseDamage = Math.max(attacker.attack - defender.defense, 1);
    const criticalHit = Math.random() < 0.1; // 10% chance de coup critique
    const damageMultiplier = criticalHit ? 1.5 : 1;
    const finalDamage = Math.round(baseDamage * damageMultiplier);

    return {
        damage: finalDamage,
        isCritical: criticalHit
    };
}

export function levelUpCharacter(character) {
    character.level++;
    character.maxHp += 10;
    character.hp = character.maxHp;
    character.attack += 2;
    character.defense += 1;
    character.skillPoints += 3;
    
    console.log(`${character.name} a atteint le niveau ${character.level}!`);
    console.log(`PV max: +10, Attaque: +2, Défense: +1, Points de compétence: +3`);
}

export function createEnemyForMission(mission) {
    const enemyBase = enemies.find(e => e.name === mission.enemy);
    if (!enemyBase) return null;

    return {
        name: enemyBase.name,
        level: mission.enemyLevel,
        hp: Math.round(enemyBase.hp * (mission.enemyLevel / enemyBase.level)),
        attack: Math.round(enemyBase.attack * (mission.enemyLevel / enemyBase.level)),
        defense: Math.round(enemyBase.defense * (mission.enemyLevel / enemyBase.level))
    };
}

export function generateUniqueEnemy(floor) {
    const baseEnemy = getRandomEnemy();
    const uniqueName = `${baseEnemy.name} ${getRandomElement(['Féroce', 'Redoutable', 'Terrifiant', 'Mystérieux', 'Légendaire'])}`;
    
    const levelMultiplier = 1 + (floor * 0.1);
    return {
        name: uniqueName,
        level: Math.round(baseEnemy.level * levelMultiplier),
        hp: Math.round(baseEnemy.hp * levelMultiplier),
        attack: Math.round(baseEnemy.attack * levelMultiplier),
        defense: Math.round(baseEnemy.defense * levelMultiplier)
    };
}

console.log("Module gameData chargé");
