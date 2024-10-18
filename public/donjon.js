// donjon.js

// Fonction utilitaire pour obtenir un élément aléatoire d'un tableau
function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

const prefixes = ['Ancien', 'Démoniaque', 'Glacial', 'Flamboyant', 'Vengeur', 'Mystique', 'Corrompu', 'Céleste', 'Maudit', 'Béni'];
const suffixes = ['du Chaos', 'de la Tempête', 'de l Abysse', 'du Dragon', 'du Phénix', 'de l Éternité', 'du Vide', 'de la Lumière', 'des Ombres', 'du Destin'];

const enemyTypes = ['Golem', 'Spectre', 'Démon', 'Chimère', 'Wyrm', 'Banshee', 'Titan', 'Liche', 'Léviathan', 'Behemoth'];

function generateUniqueName() {
    const prefix = getRandomElement(prefixes);
    const suffix = getRandomElement(suffixes);
    return `${prefix} ${suffix}`;
}

export function generateUniqueEnemy(floor) {
    const enemyType = getRandomElement(enemyTypes);
    const name = `${enemyType} ${generateUniqueName()}`;
    const baseStats = {
        attack: 10 + Math.floor(Math.random() * 5),
        defense: 5 + Math.floor(Math.random() * 3),
        hp: 50 + Math.floor(Math.random() * 20)
    };

    const levelMultiplier = 1 + (floor * 0.1);
    return {
        name: name,
        attack: Math.round(baseStats.attack * levelMultiplier),
        defense: Math.round(baseStats.defense * levelMultiplier),
        hp: Math.round(baseStats.hp * levelMultiplier),
        maxHp: Math.round(baseStats.hp * levelMultiplier)
    };
}

const itemTypes = ['Épée', 'Hache', 'Lance', 'Arc', 'Baguette', 'Bouclier', 'Armure', 'Casque', 'Bottes', 'Anneau'];

function generateUniqueItem(floor) {
    const itemType = getRandomElement(itemTypes);
    const name = `${itemType} ${generateUniqueName()}`;
    const baseStats = {
        attack: ['Épée', 'Hache', 'Lance', 'Arc', 'Baguette'].includes(itemType) ? 5 + Math.floor(Math.random() * 5) : 0,
        defense: ['Bouclier', 'Armure', 'Casque', 'Bottes'].includes(itemType) ? 3 + Math.floor(Math.random() * 3) : 0,
        hp: itemType === 'Anneau' ? 10 + Math.floor(Math.random() * 10) : 0
    };

    const levelMultiplier = 1 + (floor * 0.1);
    const value = Math.round((baseStats.attack + baseStats.defense + baseStats.hp) * 10 * levelMultiplier);

    return {
        name: name,
        type: itemType.toLowerCase(),
        attack: Math.round(baseStats.attack * levelMultiplier),
        defense: Math.round(baseStats.defense * levelMultiplier),
        hp: Math.round(baseStats.hp * levelMultiplier),
        value: value
    };
}

export function generateDonjonReward(floor) {
    const goldReward = Math.round(50 * (1 + (floor * 0.2)));
    const expReward = Math.round(30 * (1 + (floor * 0.2)));
    
    const itemReward = generateUniqueItem(floor);

    return {
        gold: goldReward,
        exp: expReward,
        item: itemReward
    };
}

export function generateDonjonEvent(level) {
    const eventTypes = ['combat', 'treasure', 'trap'];
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];

    switch (eventType) {
        case 'combat':
            return {
                type: 'combat',
                enemy: createEnemyForMission({ enemy: enemies[Math.floor(Math.random() * enemies.length)].name, enemyLevel: level })
            };
        case 'treasure':
            let item = generateRandomLoot(level);
            while (item === null) {
                item = generateRandomLoot(level);
            }
            return {
                type: 'treasure',
                item: item
            };
        case 'trap':
            return {
                type: 'trap',
                damage: level * 5
            };
    }
}

// Fonction pour générer un boss de donjon
export function generateDonjonBoss(floor) {
    const boss = generateUniqueEnemy(floor);
    boss.name = `Boss ${boss.name}`;
    boss.attack *= 1.5;
    boss.defense *= 1.5;
    boss.hp *= 2;
    boss.maxHp = boss.hp;
    return boss;
}

// Fonction pour générer une récompense de boss
export function generateBossReward(floor) {
    const reward = generateDonjonReward(floor);
    reward.gold *= 2;
    reward.exp *= 2;
    reward.item.attack *= 1.2;
    reward.item.defense *= 1.2;
    reward.item.hp *= 1.2;
    reward.item.value *= 1.5;
    return reward;
}

console.log("Module donjon chargé");
