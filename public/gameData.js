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
        this.lair = {
            buildings: {},
            currentConstruction: null
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

export const items = [
    // Armes
    { id: 'sword', name: 'Épée en fer', type: 'weapon', attack: 5, cost: 50, rarity: 'common' },
    { id: 'axe', name: 'Hache de guerre', type: 'weapon', attack: 7, cost: 70, rarity: 'common' },
    { id: 'dagger', name: 'Dague des ombres', type: 'weapon', attack: 3, critChance: 10, cost: 60, rarity: 'uncommon' },
    { id: 'greatsword', name: 'Épée à deux mains', type: 'weapon', attack: 12, speedPenalty: 2, cost: 100, rarity: 'rare' },
    { id: 'flameBlade', name: 'Lame enflammée', type: 'weapon', attack: 10, fireDamage: 3, cost: 150, rarity: 'rare' },
    { id: 'excalibur', name: 'Excalibur', type: 'weapon', attack: 40, holyDamage: 5, critChance: 15, cost: 500, rarity: 'legendary' },

    // Armures
    { id: 'leatherArmor', name: 'Armure de cuir', type: 'armor', defense: 3, cost: 40, rarity: 'common' },
    { id: 'chainmail', name: 'Cotte de mailles', type: 'armor', defense: 5, cost: 80, rarity: 'common' },
    { id: 'plateArmor', name: 'Armure de plaques', type: 'armor', defense: 8, speedPenalty: 1, cost: 150, rarity: 'rare' },
    { id: 'dragonScaleArmor', name: "Armure d'écailles de dragon", type: 'armor', defense: 12, fireResistance: 50, cost: 300, rarity: 'legendary' },

    // Accessoires
    { id: 'ringOfStrength', name: 'Anneau de force', type: 'accessory', attack: 2, cost: 100, rarity: 'uncommon' },
    { id: 'amuletOfLife', name: 'Amulette de vie', type: 'accessory', maxHp: 20, cost: 120, rarity: 'uncommon' },
    { id: 'bootsOfSpeed', name: 'Bottes de célérité', type: 'accessory', speedBoost: 1, cost: 150, rarity: 'rare' },

    // Consommables
    { id: 'healthPotion', name: 'Potion de soin', type: 'consumable', effect: 'heal', value: 50, cost: 30, rarity: 'common' },
    { id: 'energyDrink', name: 'Boisson énergisante', type: 'consumable', effect: 'energy', value: 30, cost: 25, rarity: 'common' },
    { id: 'elixirOfPower', name: 'Élixir de puissance', type: 'consumable', effect: 'attackBoost', value: 5, duration: 3, cost: 100, rarity: 'rare' }
];

export const missions = [
    { name: "Éliminer des gobelins", enemy: "Gobelin", enemyLevel: 1, goldReward: 15, expReward: 20, difficulty: 'Facile' },
    { name: "Chasser un loup géant", enemy: "Loup géant", enemyLevel: 2, goldReward: 30, expReward: 40, difficulty: 'Moyenne' },
    { name: "Vaincre un bandit", enemy: "Bandit", enemyLevel: 3, goldReward: 50, expReward: 60, difficulty: 'Moyenne' },
    { name: "Affronter un ogre", enemy: "Ogre", enemyLevel: 4, goldReward: 80, expReward: 90, difficulty: 'Difficile' },
    { name: "Explorer une grotte hantée", enemy: "Fantôme", enemyLevel: 5, goldReward: 120, expReward: 130, difficulty: 'Difficile' },
    { name: "Combattre un dragon", enemy: "Dragon", enemyLevel: 7, goldReward: 200, expReward: 250, difficulty: 'Très Difficile' }
];

export const buildings = [
    { 
        id: 1, 
        name: "Cabane de base", 
        level: 1,
        maxLevel: 3,
        materials: { wood: 50, stone: 20 }, 
        time: 300, // en secondes
        benefits: "Augmente la capacité de stockage de ressources de 100",
        upgradeMaterials: { wood: 100, stone: 40, iron: 10 },
        upgradeTime: 600,
        upgradeBenefits: "Augmente davantage la capacité de stockage"
    },
    { 
        id: 2, 
        name: "Tour de guet", 
        level: 1,
        maxLevel: 5,
        materials: { wood: 30, stone: 50, iron: 10 }, 
        time: 600,
        benefits: "Améliore la défense du repaire",
        upgradeMaterials: { wood: 60, stone: 100, iron: 20 },
        upgradeTime: 900,
        upgradeBenefits: "Améliore encore plus la défense et permet de voir les ennemis de plus loin"
    },
    { 
        id: 3, 
        name: "Ferme", 
        level: 1,
        maxLevel: 4,
        materials: { wood: 40, stone: 20, iron: 5 }, 
        time: 450,
        benefits: "Produit de la nourriture passivement",
        upgradeMaterials: { wood: 80, stone: 40, iron: 10 },
        upgradeTime: 750,
        upgradeBenefits: "Augmente la production de nourriture"
    },
    {
        id: 4,
        name: "Forge",
        level: 1,
        maxLevel: 5,
        materials: { wood: 60, stone: 80, iron: 30 },
        time: 900,
        benefits: "Permet de créer et d'améliorer des équipements",
        upgradeMaterials: { wood: 120, stone: 160, iron: 60 },
        upgradeTime: 1200,
        upgradeBenefits: "Permet de créer des équipements plus puissants"
    }
];

export const enemies = [
    { name: "Gobelin", level: 1, hp: 30, attack: 5, defense: 2 },
    { name: "Loup géant", level: 2, hp: 45, attack: 8, defense: 3 },
    { name: "Bandit", level: 3, hp: 60, attack: 10, defense: 5 },
    { name: "Ogre", level: 4, hp: 100, attack: 15, defense: 8 },
    { name: "Fantôme", level: 5, hp: 80, attack: 20, defense: 10 },
    { name: "Dragon", level: 7, hp: 200, attack: 30, defense: 20 }
];

export const companionTypes = [
    { type: 'animal', names: ['Loup', 'Ours', 'Aigle', 'Panthère', 'Tigre', 'Serpent'] },
    { type: 'monster', names: ['Gobelin apprivoisé', 'Petit dragon', 'Golem de pierre'] },
    { type: 'human', names: ['Écuyer', 'Archer', 'Mage', 'Voleur'] }
];

export function getAvailableMissions(playerLevel) {
    return missions.filter(mission => mission.enemyLevel <= playerLevel + 2);
}

export function getItemStats(item) {
    let stats = `${item.name} (${item.type}) :`;
    
    if (item.type === 'weapon') {
        stats += `\n- Attaque : ${item.attack}`;
        if (item.critChance) stats += `\n- Chance de critique : ${item.critChance}%`;
        if (item.fireDamage) stats += `\n- Dégâts de feu : ${item.fireDamage}`;
        if (item.holyDamage) stats += `\n- Dégâts sacrés : ${item.holyDamage}`;
    }

    if (item.type === 'armor') {
        stats += `\n- Défense : ${item.defense}`;
        if (item.fireResistance) stats += `\n- Résistance au feu : ${item.fireResistance}%`;
        if (item.speedPenalty) stats += `\n- Pénalité de vitesse : -${item.speedPenalty}`;
    }

    if (item.type === 'accessory') {
        if (item.attack) stats += `\n- Attaque : +${item.attack}`;
        if (item.maxHp) stats += `\n- PV max : +${item.maxHp}`;
        if (item.speedBoost) stats += `\n- Bonus de vitesse : +${item.speedBoost}`;
    }

    if (item.type === 'consumable') {
        stats += `\n- Effet : ${item.effect} +${item.value}`;
        if (item.duration) stats += `\n- Durée : ${item.duration} tours`;
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
    const types = ['animal', 'monster', 'human'];
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

export function generateDonjonEvent(level) {
    const eventTypes = ['combat', 'treasure', 'trap', 'rest'];
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];

    switch (eventType) {
        case 'combat':
            return {
                type: 'combat',
                enemy: generateUniqueEnemy(level)
            };
        case 'treasure':
            return {
                type: 'treasure',
                item: generateRandomLoot(level)
            };
        case 'trap':
            return {
                type: 'trap',
                damage: level * 5
            };
        case 'rest':
            return {
                type: 'rest',
                healAmount: level * 10
            };
    }
}

export function generateDonjonBoss(level) {
    const baseBoss = enemies[enemies.length - 1]; // Utilise le dernier ennemi comme base pour le boss
    return {
        name: `Boss ${baseBoss.name}`,
        level: level,
        hp: baseBoss.hp * 2,
        attack: baseBoss.attack * 1.5,
        defense: baseBoss.defense * 1.5
    };
}

export function generateBossReward(bossLevel) {
    return {
        gold: bossLevel * 100,
        experience: bossLevel * 50,
        item: generateRandomLoot(bossLevel + 2) // Un objet plus rare que le niveau du boss
    };
}

export function getAvailableBuildings(player) {
    return buildings.filter(building => 
        player.level >= building.requiredLevel && 
        (!player.lair.buildings[building.id] || 
         (player.lair.buildings[building.id].level < building.maxLevel))
    );
}

export function initializeLairBuildingSystem() {
    console.log("Système de construction de bâtiments initialisé");
    // Vous pouvez ajouter ici toute logique d'initialisation supplémentaire pour le système de construction
}

export function applyBuildingEffects(player, buildingId) {
    const building = buildings.find(b => b.id === buildingId);
    if (!building) return;

    const buildingLevel = player.lair.buildings[buildingId]?.level || 1;

    switch (buildingId) {
        case 1: // Cabane de base
            player.resourceCapacity = 100 * buildingLevel;
            break;
        case 2: // Tour de guet
            player.defense += 2 * buildingLevel;
            break;
        case 3: // Ferme
            player.passiveFoodProduction = 5 * buildingLevel;
            break;
        case 4: // Forge
            player.craftingBonus = 0.1 * buildingLevel; // 10% de bonus par niveau
            break;
        // Ajoutez d'autres effets de bâtiments ici
    }
}

export function canUpgradeBuilding(player, buildingId) {
    const building = buildings.find(b => b.id === buildingId);
    if (!building) return false;

    const currentLevel = player.lair.buildings[buildingId]?.level || 0;
    if (currentLevel >= building.maxLevel) return false;

    const upgradeMaterials = currentLevel === 0 ? building.materials : building.upgradeMaterials;
    return Object.entries(upgradeMaterials).every(([resource, amount]) => 
        player.resources[resource] >= amount
    );
}

export function getUpgradeCost(buildingId, currentLevel) {
    const building = buildings.find(b => b.id === buildingId);
    if (!building) return null;

    if (currentLevel === 0) return building.materials;
    return building.upgradeMaterials;
}

console.log("Module gameData chargé");
