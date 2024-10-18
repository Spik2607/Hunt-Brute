// inventory.js

import { showGameMessage, updatePlayerInfo, showGameArea } from './utilities.js';
import { getItemStats, items } from './gameData.js';

export function equipItem(player, index) {
    if (!player || !Array.isArray(player.inventory) || index < 0 || index >= player.inventory.length) {
        console.error("Équipement impossible : joueur ou index invalide");
        return;
    }
    
    const item = player.inventory[index];
    
    if (item.type === 'weapon' || item.type === 'armor' || item.type === 'accessory') {
        if (player.equippedItems[item.type]) {
            unequipItem(player, item.type);
        }
        player.equippedItems[item.type] = item;
        player.inventory.splice(index, 1);
        updatePlayerInfo(player);
        updatePlayerStats(player);
        updateInventoryDisplay(player);
        showGameMessage(`${player.name} a équipé ${item.name}`);
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
        player.equippedItems[type] = null;
        player.inventory.push(item);
        updatePlayerInfo(player);
        updatePlayerStats(player);
        updateInventoryDisplay(player);
        showGameMessage(`${player.name} a déséquipé ${item.name}`);
    }
}

export function useItem(player, index) {
    if (!player || !Array.isArray(player.inventory) || index < 0 || index >= player.inventory.length) {
        console.error("Utilisation impossible : joueur ou index invalide");
        return;
    }
    
    const item = player.inventory[index];
    
    if (item.type === 'consumable') {
        if (item.effect === 'heal') {
            player.hp = Math.min(player.hp + item.value, player.maxHp);
        } else if (item.effect === 'energy') {
            player.energy = Math.min(player.energy + item.value, player.maxEnergy);
        }
        player.inventory.splice(index, 1);
        updatePlayerInfo(player);
        updatePlayerStats(player);
        updateInventoryDisplay(player);
        showGameMessage(`${player.name} a utilisé ${item.name}`);
    } else {
        showGameMessage("Cet objet ne peut pas être utilisé");
    }
}

export function sellItem(player, index) {
    if (!player || !Array.isArray(player.inventory) || index < 0 || index >= player.inventory.length) {
        console.error("Vente impossible : joueur ou index invalide");
        return;
    }
    
    const item = player.inventory[index];
    const sellPrice = Math.floor(item.cost * 0.5);
    
    player.gold += sellPrice;
    player.inventory.splice(index, 1);
    updatePlayerStats(player);
    updateInventoryDisplay(player);
    showGameMessage(`${player.name} a vendu ${item.name} pour ${sellPrice} or`);
}

export function updateInventoryDisplay(player) {
    console.log("Mise à jour de l'affichage de l'inventaire", player);
    const inventoryElement = document.getElementById('inventory-area');
    if (!inventoryElement) {
        console.error("Élément 'inventory-area' non trouvé");
        return;
    }

    inventoryElement.innerHTML = `
        <div class="inventory-container">
            <div class="equipped-items">
                <h3>Équipement</h3>
                <div id="equipped-weapon" class="equipped-slot">
                    <span class="slot-name">Arme:</span>
                    <span class="item-name">${player.equippedItems.weapon ? player.equippedItems.weapon.name : 'Aucune'}</span>
                    ${player.equippedItems.weapon ? `<button class="unequip-button" data-type="weapon">Déséquiper</button>` : ''}
                </div>
                <div id="equipped-armor" class="equipped-slot">
                    <span class="slot-name">Armure:</span>
                    <span class="item-name">${player.equippedItems.armor ? player.equippedItems.armor.name : 'Aucune'}</span>
                    ${player.equippedItems.armor ? `<button class="unequip-button" data-type="armor">Déséquiper</button>` : ''}
                </div>
                <div id="equipped-accessory" class="equipped-slot">
                    <span class="slot-name">Accessoire:</span>
                    <span class="item-name">${player.equippedItems.accessory ? player.equippedItems.accessory.name : 'Aucun'}</span>
                    ${player.equippedItems.accessory ? `<button class="unequip-button" data-type="accessory">Déséquiper</button>` : ''}
                </div>
            </div>
            <div class="inventory-items">
                <h3>Inventaire</h3>
                <div id="inventory-grid"></div>
            </div>
        </div>
    `;

    const inventoryGrid = document.getElementById('inventory-grid');
    if (player.inventory.length === 0) {
        inventoryGrid.innerHTML = '<p class="empty-inventory">Votre inventaire est vide.</p>';
    } else {
        player.inventory.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'inventory-item';
            itemElement.innerHTML = `
                <img src="${item.icon || 'default-item-icon.png'}" alt="${item.name}" class="item-icon">
                <span class="item-name">${item.name}</span>
                <div class="item-actions">
                    <button class="equip-button" data-index="${index}">Équiper</button>
                    <button class="use-button" data-index="${index}">Utiliser</button>
                    <button class="sell-button" data-index="${index}">Vendre</button>
                </div>
            `;
            itemElement.title = getItemStats(item);
            inventoryGrid.appendChild(itemElement);
        });
    }

    addInventoryEventListeners(player);
}

function addInventoryEventListeners(player) {
    const inventoryElement = document.getElementById('inventory-area');
    
    inventoryElement.querySelectorAll('.equip-button').forEach(button => {
        button.addEventListener('click', () => equipItem(player, parseInt(button.dataset.index)));
    });

    inventoryElement.querySelectorAll('.use-button').forEach(button => {
        button.addEventListener('click', () => useItem(player, parseInt(button.dataset.index)));
    });

    inventoryElement.querySelectorAll('.sell-button').forEach(button => {
        button.addEventListener('click', () => sellItem(player, parseInt(button.dataset.index)));
    });

    inventoryElement.querySelectorAll('.unequip-button').forEach(button => {
        button.addEventListener('click', () => unequipItem(player, button.dataset.type));
    });
}

function updatePlayerStats(player) {
    // Réinitialiser les stats du joueur à leurs valeurs de base
    player.attack = player.baseAttack;
    player.defense = player.baseDefense;
    player.maxHp = player.baseMaxHp;

    // Appliquer les effets des objets équipés
    for (const slot in player.equippedItems) {
        const item = player.equippedItems[slot];
        if (item) {
            if (item.attack) player.attack += item.attack;
            if (item.defense) player.defense += item.defense;
            if (item.maxHp) player.maxHp += item.maxHp;
        }
    }

    // S'assurer que les HP actuels ne dépassent pas le nouveau maxHp
    player.hp = Math.min(player.hp, player.maxHp);

    // Mettre à jour l'affichage du joueur
    updatePlayerInfo(player);
    updatePlayerInfo(player);
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

export function openShop(player) {
    console.log("Ouverture de la boutique", player);
    if (!player) {
        console.error("Ouverture de la boutique impossible : joueur invalide");
        return;
    }
    const shopElement = document.getElementById('shop-items');
    if (!shopElement) {
        console.error("Élément 'shop-items' non trouvé");
        return;
    }

    shopElement.innerHTML = '';
    items.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'shop-item';
        itemElement.innerHTML = `
            <img src="${item.icon || 'default-item-icon.png'}" alt="${item.name}" class="item-icon">
            <span class="item-name">${item.name}</span>
            <span class="item-cost">${item.cost} or</span>
            <button class="buy-button" data-id="${item.id}">Acheter</button>
        `;
        itemElement.title = getItemStats(item);
        shopElement.appendChild(itemElement);
    });

    const buyButtons = shopElement.querySelectorAll('.buy-button');
    buyButtons.forEach(button => {
        button.addEventListener('click', function() {
            const itemId = this.getAttribute('data-id');
            buyItem(player, itemId);
        });
    });

    showGameArea('shop-area');
}

function buyItem(player, itemId) {
    const item = items.find(i => i.id === itemId);
    if (!item) {
        console.error("Item non trouvé:", itemId);
        return;
    }
    if (player.gold >= item.cost) {
        player.gold -= item.cost;
        addItemToInventory(player, item);
        updatePlayerInfo(player);
        showGameMessage(`${player.name} a acheté ${item.name}`);
    } else {
        showGameMessage("Vous n'avez pas assez d'or !");
    }
}

// Exportez toutes les fonctions nécessaires
export const inventoryModule = {
    equipItem,
    unequipItem,
    useItem,
    sellItem,
    updateInventoryDisplay,
    addItemToInventory,
    openShop
};

console.log("Module d'inventaire chargé");
