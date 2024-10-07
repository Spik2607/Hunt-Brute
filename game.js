class Fighter {
    constructor(name, health = 100, attack = 10, defense = 5) {
        this.name = name;
        this.maxHealth = health;
        this.health = health;
        this.attack = attack;
        this.defense = defense;
        this.level = 1;
        this.experience = 0;
        this.nextLevelExp = 100;
        this.availablePoints = 0;
    }

    takeDamage(damage) {
        const actualDamage = Math.max(damage - this.defense, 0);
        this.health = Math.max(this.health - actualDamage, 0);
        return actualDamage;
    }

    isDefeated() {
        return this.health <= 0;
    }

    quickAttack() {
        return Math.floor(Math.random() * (this.attack - 2)) + 1;
    }

    powerfulAttack() {
        return Math.floor(Math.random() * (this.attack + 5)) + this.attack / 2;
    }

    defensiveStance() {
        this.defense += 2;
        return 0;  // No damage dealt
    }

    gainExperience(amount) {
        this.experience += amount;
        while (this.experience >= this.nextLevelExp) {
            this.levelUp();
        }
    }

    levelUp() {
        this.level++;
        this.availablePoints += 3;
        this.nextLevelExp = Math.floor(this.nextLevelExp * 1.5);
        log(`${this.name} est monté au niveau ${this.level}!`);
        updateStats();
        showLevelUpModal();
    }

    improveStats(health, attack, defense) {
        if (health + attack + defense > this.availablePoints) {
            return false;
        }
        this.maxHealth += health * 10;
        this.health = this.maxHealth;
        this.attack += attack;
        this.defense += defense;
        this.availablePoints -= (health + attack + defense);
        updateStats();
        return true;
    }

    toJSON() {
        return {
            name: this.name,
            maxHealth: this.maxHealth,
            health: this.health,
            attack: this.attack,
            defense: this.defense,
            level: this.level,
            experience: this.experience,
            nextLevelExp: this.nextLevelExp,
            availablePoints: this.availablePoints
        };
    }

    static fromJSON(json) {
        const fighter = new Fighter(json.name);
        Object.assign(fighter, json);
        return fighter;
    }
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
const playerCharacter = document.getElementById('player-character');
const enemyCharacter = document.getElementById('enemy-character');

document.getElementById('create-fighter').addEventListener('click', () => {
    const name = document.getElementById('fighter-name').value;
    player = new Fighter(name);
    createNewEnemy();
    document.getElementById('character-creation').style.display = 'none';
    document.getElementById('battle-area').style.display = 'block';
    updateStats();
    updateHealthBars();
    log("Le combat commence !");
    saveGame();
});

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
    updateHealthBars();
}

function updateHealthBars() {
    const playerHealthBar = document.querySelector('#player-health-bar .health-bar-fill');
    const enemyHealthBar = document.querySelector('#enemy-health-bar .health-bar-fill');
    
    playerHealthBar.style.width = `${(player.health / player.maxHealth) * 100}%`;
    enemyHealthBar.style.width = `${(enemy.health / enemy.maxHealth) * 100}%`;
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
        
        enemyCharacter.classList.add('shake');
        setTimeout(() => enemyCharacter.classList.remove('shake'), 500);

        if (enemy.isDefeated()) {
            const expGained = enemy.level * 20;
            player.gainExperience(expGained);
            log(`Vous avez vaincu le ${enemy.name}! Vous gagnez ${expGained} points d'expérience.`);
            disableAttackButtons();
            enemyCharacter.classList.add('flash');
            setTimeout(() => {
                createNewEnemy();
                enableAttackButtons();
                updateStats();
                enemyCharacter.classList.remove('flash');
            }, 3000);
        } else {
            if (Math.random() < 0.2) {
                const specialDamage = enemy.useSpecialAbility();
                if (specialDamage > 0) {
                    player.takeDamage(specialDamage);
                    playerCharacter.classList.add('shake');
                    setTimeout(() => playerCharacter.classList.remove('shake'), 500);
                }
            } else {
                const enemyAttack = Math.floor(Math.random() * enemy.attack) + 1;
                const playerDamage = player.takeDamage(enemyAttack);
                log(`L'ennemi inflige ${playerDamage} dégâts à ${player.name}.`);
                playerCharacter.classList.add('shake');
                setTimeout(() => playerCharacter.classList.remove('shake'), 500);
            }

            if (player.isDefeated()) {
                log("Vous avez perdu !");
                disableAttackButtons();
                playerCharacter.classList.add('flash');
            }
        }

        updateStats();
        updateHealthBars();
        saveGame();
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

function log(message) {
    battleLog.innerHTML += message + '<br>';
    battleLog.scrollTop = battleLog.scrollHeight;
}

function disableAttackButtons() {
    attackButtons.forEach(button => button.disabled = true);
}

function enableAttackButtons() {
    attackButtons.forEach(button => button.disabled = false);
}

function showLevelUpModal() {
    const modal = document.getElementById('level-up-modal');
    modal.style.display = 'block';
    updateAvailablePoints();
    playerCharacter.classList.add('flash');
    setTimeout(() => playerCharacter.classList.remove('flash'), 1000);
}

function updateAvailablePoints() {
    document.getElementById('available-points').textContent = player.availablePoints;
}

document.getElementById('confirm-level-up').addEventListener('click', () => {
    const healthPoints = parseInt(document.getElementById('health-points').value) || 0;
    const attackPoints = parseInt(document.getElementById('attack-points').value) || 0;
    const defensePoints = parseInt(document.getElementById('defense-points').value) || 0;

    if (player.improveStats(healthPoints, attackPoints, defensePoints)) {
        document.getElementById('level-up-modal').style.display = 'none';
        log(`Statistiques améliorées ! Santé: +${healthPoints*10}, Attaque: +${attackPoints}, Défense: +${defensePoints}`);
        updateStats();
        saveGame();
    } else {
        alert("Points invalides. Veuillez réessayer.");
    }
});

function saveGame() {
    localStorage.setItem('playerData', JSON.stringify(player));
}

function loadGame() {
    const savedData = localStorage.getItem('playerData');
    if (savedData) {
        player = Fighter.fromJSON(JSON.parse(savedData));
        document.getElementById('character-creation').style.display = 'none';
        document.getElementById('battle-area').style.display = 'block';
        createNewEnemy();
        updateStats();
        updateHealthBars();
        log("Partie chargée. Le combat continue !");
    }
}

// Ajouter un bouton de sauvegarde manuelle
const saveButton = document.createElement('button');
saveButton.textContent = 'Sauvegarder';
saveButton.addEventListener('click', () => {
    saveGame();
    alert('Partie sauvegardée !');
});
document.getElementById('game-container').appendChild(saveButton);

// Ajouter un bouton de chargement
const loadButton = document.createElement('button');
loadButton.textContent = 'Charger';
loadButton.addEventListener('click', loadGame);
document.getElementById('game-container').appendChild(loadButton);

// Charger la partie au démarrage du jeu si une sauvegarde existe
window.addEventListener('load', () => {
    if (localStorage.getItem('playerData')) {
        loadGame();
    }
});
