// expedition.js

export const expeditionEvents = [
    {
        name: "Forêt Mystérieuse",
        duration: 3600, // 1 heure
        events: [
            {
                description: "Vous trouvez une clairière cachée.",
                effect: (player) => {
                    player.resources.wood += 10;
                    return "Vous avez récolté 10 unités de bois.";
                }
            },
            {
                description: "Un groupe de loups vous attaque !",
                effect: (player) => {
                    player.hp -= 15;
                    return "Vous perdez 15 PV dans la bataille.";
                }
            },
            {
                description: "Vous découvrez un ancien temple.",
                effect: (player) => {
                    player.gold += 50;
                    return "Vous trouvez 50 pièces d'or dans le temple.";
                }
            }
        ]
    },
    {
        name: "Montagnes Gelées",
        duration: 7200, // 2 heures
        events: [
            {
                description: "Vous escaladez une falaise escarpée.",
                effect: (player) => {
                    player.experience += 20;
                    return "Vous gagnez 20 points d'expérience.";
                }
            },
            {
                description: "Une tempête de neige vous surprend.",
                effect: (player) => {
                    player.energy -= 30;
                    return "Vous perdez 30 points d'énergie.";
                }
            },
            {
                description: "Vous trouvez une veine de fer.",
                effect: (player) => {
                    player.resources.iron += 15;
                    return "Vous récoltez 15 unités de fer.";
                }
            }
        ]
    },
    {
        name: "Marais Brumeux",
        duration: 5400, // 1 heure 30 minutes
        events: [
            {
                description: "Vous rencontrez un alchimiste errant.",
                effect: (player) => {
                    player.inventory.push({ name: "Potion de soin", type: "consumable", effect: "heal", value: 50 });
                    return "Vous obtenez une potion de soin.";
                }
            },
            {
                description: "Vous vous enlisez dans des sables mouvants.",
                effect: (player) => {
                    player.hp -= 10;
                    player.energy -= 20;
                    return "Vous perdez 10 PV et 20 points d'énergie en vous dégageant.";
                }
            },
            {
                description: "Vous découvrez des ruines anciennes.",
                effect: (player) => {
                    player.gold += 75;
                    player.experience += 30;
                    return "Vous trouvez 75 pièces d'or et gagnez 30 points d'expérience.";
                }
            }
        ]
    }
];

export function getRandomExpeditionEvent(expedition) {
    const randomIndex = Math.floor(Math.random() * expedition.events.length);
    return expedition.events[randomIndex];
}
