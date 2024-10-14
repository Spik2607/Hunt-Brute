// inventory.js

import { items, getItemStats } from './gameData.js';

export function equipItem(player, index) {
    if (!player || index < 0 || index >= player.inventory.length) {
        console.error("Équipement impossible : joueur ou index invalide");
        return;
    }
    
    const item = player.inventory[index];
    
    if (item.type === 'weapon' || item.type === 'armor' || item.type === 'accessory') {
        player.equip(item);
        player.inventory.splice(index, 1);
        updatePlayerInfo(player);
        updateInventoryDisplay(player);
        updateEquippedItemsDisplay(player);
        showGameMessage(`${player.name} a équipé ${item.name}`);
    } else {
        showGameMessage("Cet objet ne peut pas être équipé");
    }
}

export function unequipItem(player, type) {
    const item = player.equippedItems[type];
    if (item) {
        player.unequip(type);
        updatePlayerInfo(player);
        updateInventoryDisplay(player);
        updateEquippedItemsDisplay(player);
        showGameMessage(`${player.name} a déséquipé ${item.name}`);
    }
}

export function useItem(player, index) {
    if (!player || index < 0 || index >= player.inventory.length) {
        console.error("Utilisation impossible : joueur ou index invalide");
        return;
    }
    
    const item = player.inventory[index];
    
    if (item.type === 'consumable') {
        player.useItem(item);
        player.inventory.splice(index, 1);
        updatePlayerInfo(player);
        updateInventoryDisplay(player);
        showGameMessage(`${player.name} a utilisé ${item.name}`);
    } else {
        showGameMessage("Cet objet ne peut pas être utilisé");
    }
}

export function updateInventoryDisplay(player) {
    const inventoryElement = document.getElementById('inventory-items');
    if (!inventoryElement) return;

    inventoryElement.innerHTML = '';
    player.inventory.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'inventory-item';
        itemElement.innerHTML = `
            <span>${item.name}</span>
            ${item.type === 'weapon' || item.type === 'armor' || item.type === 'accessory' 
                ? `<button onclick="window.inventoryModule.equipItem(window.player, ${index})">Équiper</button>`
                : ''}
            ${item.type === 'consumable'
                ? `<button onclick="window.inventoryModule.useItem(window.player, ${index})">Utiliser</button>`
                : ''}
            <button onclick="window.inventoryModule.sellItem(window.player, ${index})">Vendre</button>
        `;
        itemElement.title = getItemStats(item);
        inventoryElement.appendChild(itemElement);
    });
}

export function updateEquippedItemsDisplay(player) {
    const equippedItemsElement = document.getElementById('equipped-items');
    if (!equippedItemsElement) return;

    equippedItemsElement.innerHTML = `
        <div>
            Arme: ${player.equippedItems.weapon ? player.equippedItems.weapon.name : 'Aucune'}
            ${player.equippedItems.weapon ? `<button onclick="window.inventoryModule.unequipItem(window.player, 'weapon')">Déséquiper</button>` : ''}
        </div>
        <div>
            Armure: ${player.equippedItems.armor ? player.equippedItems.armor.name : 'Aucune'}
            ${player.equippedItems.armor ? `<button onclick="window.inventoryModule.unequipItem(window.player, 'armor')">Déséquiper</button>` : ''}
        </div>
        <div>
            Accessoire: ${player.equippedItems.accessory ? player.equippedItems.accessory.name : 'Aucun'}
            ${player.equippedItems.accessory ? `<button onclick="window.inventoryModule.unequipItem(window.player, 'accessory')">Déséquiper</button>` : ''}
        </div>
    `;
}

export function openShop(player) {
    const shopElement = document.getElementById('shop-items');
    if (!shopElement) return;

    shopElement.innerHTML = '';
    items.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'shop-item';
        itemElement.innerHTML = `
            <span>${item.name} - ${item.cost} or</span>
            <button onclick="window.inventoryModule.buyItem(window.player, '${item.id}')">Acheter</button>
        `;
        itemElement.title = getItemStats(item);
        shopElement.appendChild(itemElement);
    });

    // Ajout des objets uniques du joueur à vendre
    player.inventory.forEach((item, index) => {
        if (item.value) { // Vérifie si l'objet a une valeur (c'est un objet unique)
            const itemElement = document.createElement('div');
            itemElement.className = 'shop-item unique-item';
            itemElement.innerHTML = `
                <span>${item.name} - ${item.value} or</span>
                <button onclick="window.inventoryModule.sellUniqueItem(window.player, ${index})">Vendre</button>
            `;
            itemElement.title = getItemStats(item);
            shopElement.appendChild(itemElement);
        }
    });

    showGameArea('shop-area');
}

export function buyItem(player, itemId) {
    const item = items.find(i => i.id === itemId);
    if (!item) {
        console.error("Item not found");
        return;
    }
    if (player.gold >= item.cost) {
        player.gold -= item.cost;
        player.inventory.push(item);
        updatePlayerInfo(player);
        updateInventoryDisplay(player);
        showGameMessage(`${player.name} a acheté ${item.name}`);
    } else {
        showGameMessage("Vous n'avez pas assez d'or !");
    }
}

export function sellItem(player, index) {
    if (index < 0 || index >= player.inventory.length) {
        console.error("Index d'inventaire invalide");
        return;
    }
    
    const item = player.inventory[index];
    const sellPrice = item.value || Math.floor(item.cost * 0.5);  // Utilise la valeur de l'objet unique ou 50% du prix d'achat
    
    player.gold += sellPrice;
    player.inventory.splice(index, 1);
    updatePlayerInfo(player);
    updateInventoryDisplay(player);
    showGameMessage(`${player.name} a vendu ${item.name} pour ${sellPrice} or`);
}

export function sellUniqueItem(player, index) {
    sellItem(player, index); // Réutilise la fonction sellItem qui gère déjà les objets uniques
}

export function addItemToInventory(player, item) {
    player.inventory.push(item);
    updateInventoryDisplay(player);
    showGameMessage(`${player.name} a obtenu ${item.name}`);
}

function updatePlayerInfo(player) {
    // Cette fonction devrait être définie dans game.js et importée ici
    // ou vous pouvez la redéfinir ici si nécessaire
}

function showGameMessage(message) {
    const messageElement = document.getElementById('game-messages');
    if (messageElement) {
        messageElement.textContent = message;
        setTimeout(() => {
            messageElement.textContent = '';
        }, 3000);
    }
    console.log(message);
}

function showGameArea(areaId) {
    // Cette fonction devrait être définie dans game.js et importée ici
    // ou vous pouvez la redéfinir ici si nécessaire
}

// Exportez un objet contenant toutes les fonctions pour faciliter l'accès global
export const inventoryModule = {
    equipItem,
    unequipItem,
    useItem,
    updateInventoryDisplay,
    updateEquippedItemsDisplay,
    openShop,
    buyItem,
    sellItem,
    sellUniqueItem,
    addItemToInventory
};
