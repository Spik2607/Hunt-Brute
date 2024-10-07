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
}

let player, enemy;
const battleLog = document.getElementById('battle-log');
const attackButtons = document.querySelectorAll('.attack-button');

document.getElementById('create-fighter').addEventListener('click', () => {
    const name = document.getElementById('fighter-name').value;
    player = new Fighter(name);
    createNewEnemy();
    document.getElementById('character-creation').style.display = 'none';
    document.getElementById('battle-area').style.display = 'block';
    updateStats();
    log("Le combat commence !");
});

function createNewEnemy() {
    const enemyLevel = Math.max(1, player.level - 1 + Math.floor(Math.random() * 3));
    const baseStats = 10 + (enemyLevel - 1) * 3;
    enemy = new Fighter(`Ennemi Niv.${enemyLevel}`, baseStats * 10, baseStats, Math.floor(baseStats / 2));
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
            log(`Vous avez gagné! Vous gagnez ${expGained} points d'expérience.`);
            disableAttackButtons();
            setTimeout(() => {
                createNewEnemy();
                enableAttackButtons();
                updateStats();
                log("Un nouvel ennemi apparaît!");
            }, 3000);
        } else {
            const enemyAttack = Math.floor(Math.random() * enemy.attack) + 1;
            const playerDamage = player.takeDamage(enemyAttack);
            log(`L'ennemi inflige ${playerDamage} dégâts à ${player.name}.`);

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
        ${enemy.name}<br>
        PV: ${enemy.health}/${enemy.maxHealth}<br>
        Attaque: ${enemy.attack}, Défense: ${enemy.defense}
    `;
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
    } else {
        alert("Points invalides. Veuillez réessayer.");
    }
});
