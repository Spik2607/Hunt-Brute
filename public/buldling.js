function openLairBuilding() {
    console.log("Ouverture du système de construction du repaire");
    
    // Afficher la zone de construction du repaire
    showGameArea('lair-building-area');

    // Récupérer l'élément DOM pour la zone de construction
    const lairBuildingArea = document.getElementById('lair-building-area');
    if (!lairBuildingArea) {
        console.error("Élément 'lair-building-area' non trouvé");
        return;
    }

    // Vider le contenu existant
    lairBuildingArea.innerHTML = '<h2>Construction du Repaire</h2>';

    // Charger et afficher les bâtiments disponibles
    const availableBuildings = getAvailableBuildings(player);
    displayBuildings(availableBuildings);

    // Afficher les ressources du joueur
    displayPlayerResources();

    // Initialiser les événements pour la construction
    initializeBuildingEvents();
}

function getAvailableBuildings(player) {
    // Cette fonction retourne les bâtiments disponibles en fonction du niveau du joueur
    return [
        { 
            id: 1, 
            name: "Cabane de base", 
            level: 1,
            materials: { bois: 50, pierre: 20 }, 
            time: 300, // en secondes
            benefits: "Augmente la capacité de stockage de ressources de 100",
            canUpgrade: false
        },
        { 
            id: 2, 
            name: "Tour de guet", 
            level: 1,
            materials: { bois: 30, pierre: 50, fer: 10 }, 
            time: 600,
            benefits: "Améliore la défense du repaire",
            canUpgrade: true
        },
        { 
            id: 3, 
            name: "Ferme", 
            level: 1,
            materials: { bois: 40, pierre: 20, outils: 5 }, 
            time: 900,
            benefits: "Produit de la nourriture passivement",
            canUpgrade: true
        }
    ];
}

function displayBuildings(buildings) {
    const buildingList = document.createElement('div');
    buildingList.id = 'building-list';

    buildings.forEach(building => {
        const buildingElement = document.createElement('div');
        buildingElement.className = 'building';
        buildingElement.innerHTML = `
            <h3>${building.name} (Niveau ${building.level})</h3>
            <p>Matériaux nécessaires :</p>
            <ul>
                ${Object.entries(building.materials).map(([material, quantity]) => 
                    `<li>${material}: ${quantity}</li>`
                ).join('')}
            </ul>
            <p>Temps de construction : ${formatTime(building.time)}</p>
            <p>Avantages : ${building.benefits}</p>
            <button class="build-button" data-building-id="${building.id}">
                ${player.lair.buildings[building.id] ? 'Améliorer' : 'Construire'}
            </button>
        `;
        buildingList.appendChild(buildingElement);
    });

    document.getElementById('lair-building-area').appendChild(buildingList);
}

function displayPlayerResources() {
    const resourceDisplay = document.createElement('div');
    resourceDisplay.id = 'player-resources';
    resourceDisplay.innerHTML = `
        <h3>Vos ressources :</h3>
        <ul>
            ${Object.entries(player.resources).map(([resource, quantity]) => 
                `<li>${resource}: ${quantity}</li>`
            ).join('')}
        </ul>
    `;
    document.getElementById('lair-building-area').appendChild(resourceDisplay);
}

function initializeBuildingEvents() {
    const lairBuildingArea = document.getElementById('lair-building-area');
    lairBuildingArea.addEventListener('click', (e) => {
        if (e.target.classList.contains('build-button')) {
            const buildingId = parseInt(e.target.getAttribute('data-building-id'));
            startBuilding(buildingId);
        }
    });
}

function startBuilding(buildingId) {
    const building = getAvailableBuildings(player).find(b => b.id === buildingId);
    if (!building) {
        showGameMessage("Bâtiment non trouvé.");
        return;
    }

    // Vérifier si le joueur a assez de ressources
    const canBuild = Object.entries(building.materials).every(([material, quantity]) => 
        (player.resources[material] || 0) >= quantity
    );

    if (canBuild) {
        // Retirer les ressources du joueur
        Object.entries(building.materials).forEach(([material, quantity]) => {
            player.resources[material] -= quantity;
        });

        // Commencer la construction
        player.lair.currentConstruction = {
            buildingId: buildingId,
            endTime: Date.now() + building.time * 1000
        };

        showGameMessage(`Construction de ${building.name} commencée. Temps estimé : ${formatTime(building.time)}`);
        updatePlayerInfo(player);
        displayPlayerResources();

        // Démarrer un timer pour la construction
        startConstructionTimer(building.time);
    } else {
        showGameMessage("Vous n'avez pas assez de ressources pour construire ce bâtiment.");
    }
}

function startConstructionTimer(duration) {
    const timer = setInterval(() => {
        const timeLeft = Math.max(0, (player.lair.currentConstruction.endTime - Date.now()) / 1000);
        updateConstructionProgress(timeLeft, duration);

        if (timeLeft <= 0) {
            clearInterval(timer);
            completeConstruction();
        }
    }, 1000);
}

function updateConstructionProgress(timeLeft, totalTime) {
    const progressBar = document.getElementById('construction-progress');
    if (progressBar) {
        const percentage = ((totalTime - timeLeft) / totalTime) * 100;
        progressBar.style.width = `${percentage}%`;
        progressBar.textContent = `${formatTime(timeLeft)} restant`;
    }
}

function completeConstruction() {
    const buildingId = player.lair.currentConstruction.buildingId;
    const building = getAvailableBuildings(player).find(b => b.id === buildingId);

    if (building) {
        if (!player.lair.buildings[buildingId]) {
            player.lair.buildings[buildingId] = { level: 1 };
        } else {
            player.lair.buildings[buildingId].level++;
        }

        showGameMessage(`Construction de ${building.name} terminée !`);
        applyBuildingBenefits(building);
    }

    player.lair.currentConstruction = null;
    updatePlayerInfo(player);
    openLairBuilding(); // Rafraîchir l'affichage
}

function applyBuildingBenefits(building) {
    // Appliquer les avantages du bâtiment ici
    // Par exemple, augmenter la capacité de stockage, la production de ressources, etc.
    console.log(`Avantages appliqués pour ${building.name}`);
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
}

// Ajoutez cette fonction à window.gameActions
window.gameActions.openLairBuilding = openLairBuilding;

// Exportez la fonction si nécessaire
export { openLairBuilding };
