class Fighter {
    constructor(name, health = 100, attack = 10, defense = 5) {
        this.name = name;
        this.health = health;
        this.attack = attack;
        this.defense = defense;
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
}

let player, enemy;
const battleLog = document.getElementById('battle-log');
const attackButtons = document.querySelectorAll('.attack-button');

document.getElementById('create-fighter').addEventListener('click', () => {
    const name = document.getElementById('fighter-name').value;
    player = new Fighter(name);
    enemy = new Fighter("Ennemi", 80, 8, 3);
    document.getElementById('character-creation').style.display = 'none';
    document.getElementById('battle-area').style.display = 'block';
    updateStats();
    log("Le combat commence !");
});

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
            log("Vous avez gagné !");
            disableAttackButtons();
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
    document.getElementById('player-stats').innerText = `${player.name}: ${player.health} PV, Attaque: ${player.attack}, Défense: ${player.defense}`;
    document.getElementById('enemy-stats').innerText = `Ennemi: ${enemy.health} PV, Attaque: ${enemy.attack}, Défense: ${enemy.defense}`;
}

function log(message) {
    battleLog.innerHTML += message + '<br>';
    battleLog.scrollTop = battleLog.scrollHeight;
}

function disableAttackButtons() {
    attackButtons.forEach(button => button.disabled = true);
}
