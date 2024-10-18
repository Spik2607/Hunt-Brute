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
        updatePlayerStats(player);
        updateInventoryDisplay(player);
        updateEquippedItemsDisplay(player);
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
        updatePlayerStats(player);
        updateInventoryDisplay(player);
        updateEquippedItemsDisplay(player);
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
    const inventoryElement = document.getElementById('inventory-items');
    if (!inventoryElement) {
        console.error("Élément 'inventory-items' non trouvé");
        return;
    }

    inventoryElement.innerHTML = '';

    if (!player || !Array.isArray(player.inventory) || player.inventory.length === 0) {
        inventoryElement.innerHTML = `
            <div class="empty-inventory">
                <p>Votre inventaire est vide.</p>
                <p>Explorez le monde pour trouver des objets à équiper!</p>
                <p>Types d'objets équipables :</p>
                <ul>
                    <li>Armes</li>
                    <li>Armures</li>
                    <li>Accessoires</li>
                </ul>
            </div>
        `;
    } else {
        player.inventory.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'inventory-item';
            itemElement.innerHTML = `
                <span>${item.name}</span>
                <button class="equip-button" data-index="${index}">Équiper</button>
                <button class="use-button" data-index="${index}">Utiliser</button>
                <button class="sell-button" data-index="${index}">Vendre</button>
            `;
            
            const equipButton = itemElement.querySelector('.equip-button');
            equipButton.addEventListener('click', () => equipItem(player, index));

            const useButton = itemElement.querySelector('.use-button');
            useButton.addEventListener('click', () => useItem(player, index));

            const sellButton = itemElement.querySelector('.sell-button');
            sellButton.addEventListener('click', () => sellItem(player, index));

            itemElement.title = getItemStats(item);

            inventoryElement.appendChild(itemElement);
        });
    }

    updateEquippedItemsDisplay(player);
}

export function updateEquippedItemsDisplay(player) {
    console.log("Mise à jour de l'affichage des objets équipés", player);
    if (!player || !player.equippedItems) {
        console.error("Mise à jour des objets équipés impossible : joueur invalide");
        return;
    }
    const equippedItemsElement = document.getElementById('equipped-items');
    if (!equippedItemsElement) return;

    equippedItemsElement.innerHTML = `
        <h3>Équipement actuel</h3>
        <div id="equipped-weapon">
            Arme: ${player.equippedItems.weapon ? player.equippedItems.weapon.name : 'Aucune'}
            ${player.equippedItems.weapon ? `<button class="unequip-button" data-type="weapon">Déséquiper</button>` : ''}
        </div>
        <div id="equipped-armor">
            Armure: ${player.equippedItems.armor ? player.equippedItems.armor.name : 'Aucune'}
            ${player.equippedItems.armor ? `<button class="unequip-button" data-type="armor">Déséquiper</button>` : ''}
        </div>
        <div id="equipped-accessory">
            Accessoire: ${player.equippedItems.accessory ? player.equippedItems.accessory.name : 'Aucun'}
            ${player.equippedItems.accessory ? `<button class="unequip-button" data-type="accessory">Déséquiper</button>` : ''}
        </div>
    `;

    const unequipButtons = equippedItemsElement.querySelectorAll('.unequip-button');
    unequipButtons.forEach(button => {
        button.addEventListener('click', function() {
            const type = this.getAttribute('data-type');
            unequipItem(player, type);
        });
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
            <span>${item.name} - ${item.cost} or</span>
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
    updateEquippedItemsDisplay,
    addItemToInventory,
    openShop
};

console.log("Module d'inventaire chargé");
