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
}

let player, enemy;
const battleLog = document.getElementById('battle-log');
const attackButton = document.getElementById('attack-button');

document.getElementById('create-fighter').addEventListener('click', () => {
    const name = document.getElementById('fighter-name').value;
    player = new Fighter(name);
    enemy = new Fighter("Ennemi", 80, 8, 3);
    document.getElementById('character-creation').style.display = 'none';
    document.getElementById('battle-area').style.display = 'block';
    updateStats();
    log("Le combat commence !");
});

attackButton.addEventListener('click', () => {
    if (player.isDefeated() || enemy.isDefeated()) return;

    const playerDamage = Math.floor(Math.random() * player.attack) + 1;
    const enemyDamage = enemy.takeDamage(playerDamage);
    log(`${player.name} inflige ${enemyDamage} dégâts à l'ennemi.`);

    if (enemy.isDefeated()) {
        log("Vous avez gagné !");
        attackButton.disabled = true;
    } else {
        const enemyAttack = Math.floor(Math.random() * enemy.attack) + 1;
        const playerDamage = player.takeDamage(enemyAttack);
        log(`L'ennemi inflige ${playerDamage} dégâts à ${player.name}.`);

        if (player.isDefeated()) {
            log("Vous avez perdu !");
            attackButton.disabled = true;
        }
    }

    updateStats();
});

function updateStats() {
    document.getElementById('player-stats').innerText = `${player.name}: ${player.health} PV`;
    document.getElementById('enemy-stats').innerText = `Ennemi: ${enemy.health} PV`;
}

function log(message) {
    battleLog.innerHTML += message + '<br>';
    battleLog.scrollTop = battleLog.scrollHeight;
}
