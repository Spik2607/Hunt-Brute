class Fighter {
    // ... (garder le code existant de la classe Fighter) ...
}

class Enemy extends Fighter {
    constructor(name, health, attack, defense, level) {
        super(name, health, attack, defense);
        this.level = level;
        this.specialAbility = null;
    }

    useSpecialAbility() {
        if (this.specialAbility) {
            return this.specialAbility();
        }
        return null;
    }
}

class Goblin extends Enemy {
    constructor(level) {
        super("Goblin", 80 + level * 10, 8 + level * 2, 3 + level, level);
        this.specialAbility = this.sneakAttack;
    }

    sneakAttack() {
        const damage = this.attack * 1.5;
        log(`Le Goblin utilise Attaque Sournoise pour ${damage} dégâts!`);
        return damage;
    }
}

class Orc extends Enemy {
    constructor(level) {
        super("Orc", 120 + level * 15, 12 + level * 3, 5 + level, level);
        this.specialAbility = this.rageBerserk;
    }

    rageBerserk() {
        this.attack += 5;
        log(`L'Orc entre dans une Rage Berserk! Son attaque augmente de 5.`);
        return 0;
    }
}

class Skeleton extends Enemy {
    constructor(level) {
        super("Squelette", 60 + level * 8, 10 + level * 2, 2 + level, level);
        this.specialAbility = this.boneShield;
    }

    boneShield() {
        this.defense += 3;
        log(`Le Squelette crée un Bouclier d'Os! Sa défense augmente de 3.`);
        return 0;
    }
}

let player, enemy;
const battleLog = document.getElementById('battle-log');
const attackButtons = document.querySelectorAll('.attack-button');

// ... (garder le code existant pour la création du joueur) ...

function createNewEnemy() {
    const enemyLevel = Math.max(1, player.level - 1 + Math.floor(Math.random() * 3));
    const enemyType = Math.random();
    
    if (enemyType < 0.4) {
        enemy = new Goblin(enemyLevel);
    } else if (enemyType < 0.7) {
        enemy = new Orc(enemyLevel);
    } else {
        enemy = new Skeleton(enemyLevel);
    }
    
    log(`Un ${enemy.name} de niveau ${enemy.level} apparaît!`);
}

attackButtons.forEach(button => {
    button.addEventListener('click', () => {
        if (player.isDefeated() || enemy.isDefeated()) return;

        let playerDamage, attackType;
        switch(button.id) {
            case 'quick-attack':
                playerDamage = player.quickAttack();
                attackType = "rapide";
                break;
            case 'powerful-attack':
                playerDamage = player.powerfulAttack();
                attackType = "puissante";
                break;
            case 'defensive-stance':
                playerDamage = player.defensiveStance();
                attackType = "défensive";
                break;
        }

        const enemyDamage = enemy.takeDamage(playerDamage);
        log(`${player.name} utilise une attaque ${attackType} et inflige ${enemyDamage} dégâts à l'ennemi.`);

        if (enemy.isDefeated()) {
            const expGained = enemy.level * 20;
            player.gainExperience(expGained);
            log(`Vous avez vaincu le ${enemy.name}! Vous gagnez ${expGained} points d'expérience.`);
            disableAttackButtons();
            setTimeout(() => {
                createNewEnemy();
                enableAttackButtons();
                updateStats();
            }, 3000);
        } else {
            if (Math.random() < 0.2) { // 20% de chance d'utiliser une capacité spéciale
                const specialDamage = enemy.useSpecialAbility();
                if (specialDamage > 0) {
                    player.takeDamage(specialDamage);
                }
            } else {
                const enemyAttack = Math.floor(Math.random() * enemy.attack) + 1;
                const playerDamage = player.takeDamage(enemyAttack);
                log(`L'ennemi inflige ${playerDamage} dégâts à ${player.name}.`);
            }

            if (player.isDefeated()) {
                log("Vous avez perdu !");
                disableAttackButtons();
            }
        }

        updateStats();
    });
});

function updateStats() {
    document.getElementById('player-stats').innerHTML = `
        ${player.name} (Niveau ${player.level})<br>
        PV: ${player.health}/${player.maxHealth}<br>
        Attaque: ${player.attack}, Défense: ${player.defense}<br>
        EXP: ${player.experience}/${player.nextLevelExp}
    `;
    document.getElementById('enemy-stats').innerHTML = `
        ${enemy.name} (Niveau ${enemy.level})<br>
        PV: ${enemy.health}/${enemy.maxHealth}<br>
        Attaque: ${enemy.attack}, Défense: ${enemy.defense}<br>
        Capacité spéciale: ${getSpecialAbilityName(enemy)}
    `;
}

function getSpecialAbilityName(enemy) {
    if (enemy instanceof Goblin) return "Attaque Sournoise";
    if (enemy instanceof Orc) return "Rage Berserk";
    if (enemy instanceof Skeleton) return "Bouclier d'Os";
    return "Aucune";
}

// ... (garder le reste du code existant) ...
