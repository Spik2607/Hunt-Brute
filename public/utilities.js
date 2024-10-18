// utilities.js

export function showGameMessage(message) {
    const messageElement = document.getElementById('game-messages');
    if (messageElement) {
        const newMessage = document.createElement('div');
        newMessage.textContent = message;
        messageElement.appendChild(newMessage);
        messageElement.scrollTop = messageElement.scrollHeight;
    } else {
        console.error("Élément 'game-messages' non trouvé");
    }
}

export function updatePlayerInfo(player) {
    if (!player) return;

    const elements = [
        { id: 'player-name', value: player.name },
        { id: 'player-level', value: player.level },
        { id: 'player-hp', value: player.hp },
        { id: 'player-max-hp', value: player.maxHp },
        { id: 'player-attack', value: player.attack },
        { id: 'player-defense', value: player.defense },
        { id: 'player-gold', value: player.gold },
        { id: 'player-exp', value: player.experience },
        { id: 'player-next-level-exp', value: player.level * 100 }
    ];

    elements.forEach(({ id, value }) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });

    const expPercentage = (player.experience / (player.level * 100)) * 100;
    const expFill = document.querySelector('.experience-fill');
    if (expFill) expFill.style.width = `${expPercentage}%`;
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

console.log("Module utilities chargé");
