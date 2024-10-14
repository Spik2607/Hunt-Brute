// inventory.js

import { items, getItemStats } from './gameData.js';

export function equipItem(player, index) {
    if (!player || !Array.isArray(player.inventory) || index < 0 || index >= player.inventory.length) {
        console.error("Équipement impossible : joueur ou index invalide");
        return;
    }
    
    const item = player.inventory[index];
    
    if (item.type === 'weapon' || item.type === 'armor' || item.type === 'accessory') {
        if (typeof player.equip === 'function') {
            player.equip(item);
            player.inventory.splice(index, 1);
            updatePlayerInfo(player);
            updateInventoryDisplay(player);
            updateEquippedItemsDisplay(player);
            showGameMessage(`${player.name} a équipé ${item.name}`);
        } else {
            console.error("La méthode 'equip' n'existe pas sur l'objet player");
        }
    } else {
        showGameMessage("Cet objet ne peut pas être équipé");
    }
}

export function unequipItem(player, type) {
    if (!player || !player.equippedItems) {
        console.error("Déséquipement impossible : joueur invalide");
        return;
    }
    const item = player.equippedItems[type];
    if (item) {
        if (typeof player.unequip === 'function') {
            player.unequip(type);
            updatePlayerInfo(player);
            updateInventoryDisplay(player);
            updateEquippedItemsDisplay(player);
            showGameMessage(`${player.name} a déséquipé ${item.name}`);
        } else {
            console.error("La méthode 'unequip' n'existe pas sur l'objet player");
        }
    }
}

export function useItem(player, index) {
    if (!player || !Array.isArray(player.inventory) || index < 0 || index >= player.inventory.length) {
        console.error("Utilisation impossible : joueur ou index invalide");
        return;
    }
    
    const item = player.inventory[index];
    
    if (item.type === 'consumable') {
        if (typeof player.useItem === 'function') {
            player.useItem(item);
            player.inventory.splice(index, 1);
            updatePlayerInfo(player);
            updateInventoryDisplay(player);
            showGameMessage(`${player.name} a utilisé ${item.name}`);
        } else {
            console.error("La méthode 'useItem' n'existe pas sur l'objet player");
        }
    } else {
        showGameMessage("Cet objet ne peut pas être utilisé");
    }
}

export function updateInventoryDisplay(player) {
    if (!player || !Array.isArray(player.inventory)) {
        console.error("Mise à jour de l'inventaire impossible : joueur invalide ou inventaire non défini");
        return;
    }
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
    if (!player || !player.equippedItems) {
        console.error("Mise à jour des objets équipés impossible : joueur invalide");
        return;
    }
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
    if (!player) {
        console.error("Ouverture de la boutique impossible : joueur invalide");
        return;
    }
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

    if (Array.isArray(player.inventory)) {
        player.inventory.forEach((item, index) => {
            if (item.value) {
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
    }

    showGameArea('shop-area');
}

export function buyItem(player, itemId) {
    console.log("Tentative d'achat d'item:", itemId);
    console.log("État du joueur:", player);
    
    if (!player) {
        console.error("Achat impossible : joueur invalide");
        return;
    }
    if (typeof player !== 'object') {
        console.error("Achat impossible : le joueur n'est pas un objet valide");
        return;
    }
    const item = items.find(i => i.id === itemId);
    if (!item) {
        console.error("Item non trouvé:", itemId);
        return;
    }
    if (typeof player.gold !== 'number') {
        console.error("Le joueur n'a pas de propriété 'gold' valide");
        return;
    }
    if (player.gold >= item.cost) {
        player.gold -= item.cost;
        if (Array.isArray(player.inventory)) {
            player.inventory.push(item);
            updatePlayerInfo(player);
            updateInventoryDisplay(player);
            showGameMessage(`${player.name} a acheté ${item.name}`);
        } else {
            console.error("L'inventaire du joueur n'est pas un tableau");
        }
    } else {
        showGameMessage("Vous n'avez pas assez d'or !");
    }
}
export function sellItem(player, index) {
    if (!player || !Array.isArray(player.inventory) || index < 0 || index >= player.inventory.length) {
        console.error("Vente impossible : joueur ou index invalide");
        return;
    }
    
    const item = player.inventory[index];
    const sellPrice = item.value || Math.floor(item.cost * 0.5);
    
    player.gold += sellPrice;
    player.inventory.splice(index, 1);
    updatePlayerInfo(player);
    updateInventoryDisplay(player);
    showGameMessage(`${player.name} a vendu ${item.name} pour ${sellPrice} or`);
}

export function sellUniqueItem(player, index) {
    sellItem(player, index);
}

export function addItemToInventory(player, item) {
    if (!player || !item) {
        console.error("Ajout d'item impossible : joueur ou item invalide");
        return;
    }
    if (Array.isArray(player.inventory)) {
        player.inventory.push(item);
        updateInventoryDisplay(player);
        showGameMessage(`${player.name} a obtenu ${item.name}`);
    } else {
        console.error("L'inventaire du joueur n'est pas un tableau");
    }
}

function updatePlayerInfo(player) {
    if (typeof window.updatePlayerInfo === 'function') {
        window.updatePlayerInfo(player);
    } else {
        console.error("La fonction updatePlayerInfo n'est pas définie globalement");
    }
}

function showGameMessage(message) {
    if (typeof window.showGameMessage === 'function') {
        window.showGameMessage(message);
    } else {
        console.log(message);
    }
}

function showGameArea(areaId) {
    if (typeof window.showGameArea === 'function') {
        window.showGameArea(areaId);
    } else {
        console.error("La fonction showGameArea n'est pas définie globalement");
    }
}

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

console.log("Module d'inventaire chargé");
