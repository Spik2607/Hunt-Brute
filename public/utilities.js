// utilities.js

export function showGameMessage(message) {
    const messageElement = document.getElementById('game-messages');
    if (messageElement) {
        const newMessage = document.createElement('div');
        newMessage.textContent = message;
        messageElement.appendChild(newMessage);
        messageElement.scrollTop = messageElement.scrollHeight;
    } else {
        console.warn("Élément 'game-messages' non trouvé. Message:", message);
        // Alternative: afficher le message dans la console ou dans un autre élément
        console.log("Message du jeu:", message);
    }
}

export function updatePlayerInfo(player) {
    if (!player) {
        console.error("Impossible de mettre à jour les infos du joueur : joueur non défini");
        return;
    }

    const elements = [
        { id: 'player-name', value: player.name || 'Inconnu' },
        { id: 'player-level', value: player.level || 1 },
        { id: 'player-hp', value: player.hp || 0 },
        { id: 'player-max-hp', value: player.maxHp || 100 },
        { id: 'player-attack', value: player.attack || 0 },
        { id: 'player-defense', value: player.defense || 0 },
        { id: 'player-gold', value: player.gold || 0 },
        { id: 'player-exp', value: player.experience || 0 },
        { id: 'player-next-level-exp', value: ((player.level || 1) * 100) || 100 }
    ];

    elements.forEach(({ id, value }) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = isNaN(value) ? 'N/A' : value;
        } else {
            console.warn(`Élément avec l'ID '${id}' non trouvé`);
        }
    });

    const expPercentage = player.experience ? (player.experience / ((player.level || 1) * 100)) * 100 : 0;
    const expFill = document.querySelector('.experience-fill');
    if (expFill) {
        expFill.style.width = `${expPercentage}%`;
    }
}

export function showGameArea(areaId) {
    const gameAreas = document.querySelectorAll('.game-section');
    gameAreas.forEach(area => {
        area.style.display = area.id === areaId ? 'block' : 'none';
    });
}

export function formatNumber(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
}

export function updateConstructionProgress(timeLeft, totalTime) {
    const progressBar = document.getElementById('construction-progress');
    if (progressBar) {
        const percentage = ((totalTime - timeLeft) / totalTime) * 100;
        progressBar.style.width = `${percentage}%`;
        progressBar.textContent = `${formatTime(timeLeft)} restant`;
    }
}

console.log("Module utilities chargé");
