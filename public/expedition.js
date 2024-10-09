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
                    return "Vous perdez 15 PV dans la bataille contre les loups affamés.";
                }
            },
            {
                description: "Vous découvrez un ancien temple.",
                effect: (player) => {
                    player.gold += 50;
                    return "Vous trouvez 50 pièces d'or dans le temple. Une petite prière ne ferait pas de mal.";
                }
            },
            {
                description: "Un corbeau parlant vous demande une devinette.",
                effect: (player) => {
                    const correctAnswer = Math.random() > 0.5;
                    if (correctAnswer) {
                        player.gold += 30;
                        return "Vous répondez correctement et le corbeau vous récompense avec 30 pièces d'or.";
                    } else {
                        player.hp -= 5;
                        return "Votre réponse est fausse, le corbeau vous picore et vous perdez 5 PV.";
                    }
                }
            },
            {
                description: "Vous tombez sur un arbre géant qui vous parle.",
                effect: (player) => {
                    player.experience += 15;
                    return "L'arbre vous raconte une histoire ancestrale. Vous gagnez 15 points d'expérience.";
                }
            },
            {
                description: "Vous trouvez un panier rempli de champignons. Mangez-vous les champignons ?",
                effect: (player) => {
                    const safeMushrooms = Math.random() > 0.5;
                    if (safeMushrooms) {
                        player.energy += 20;
                        return "Les champignons sont délicieux ! Vous regagnez 20 points d'énergie.";
                    } else {
                        player.hp -= 20;
                        return "Oups, ces champignons étaient toxiques... Vous perdez 20 PV.";
                    }
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
                    return "Vous gagnez 20 points d'expérience pour votre courage.";
                }
            },
            {
                description: "Une tempête de neige vous surprend.",
                effect: (player) => {
                    player.energy -= 30;
                    return "La tempête vous épuise. Vous perdez 30 points d'énergie.";
                }
            },
            {
                description: "Vous trouvez une veine de fer.",
                effect: (player) => {
                    player.resources.iron += 15;
                    return "Vous récoltez 15 unités de fer.";
                }
            },
            {
                description: "Vous croisez un yéti... qui semble vouloir discuter !",
                effect: (player) => {
                    player.hp -= 10;
                    player.gold += 20;
                    return "Après une discussion maladroite, vous gagnez 20 pièces d'or, mais vous perdez 10 PV à cause de ses tapes amicales.";
                }
            },
            {
                description: "Un escalier mystérieux creusé dans la glace mène vers un sous-sol.",
                effect: (player) => {
                    player.experience += 25;
                    player.resources.wood += 5;
                    return "L'escalier vous mène à un vieux coffre rempli de bois et vous gagnez 25 points d'expérience.";
                }
            },
            {
                description: "Vous dérapez sur une plaque de glace et faites une glissade épique.",
                effect: (player) => {
                    player.energy -= 15;
                    return "La glissade est amusante mais vous coûte 15 points d'énergie.";
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
                    return "L'alchimiste vous offre une potion de soin.";
                }
            },
            {
                description: "Vous vous enlisez dans des sables mouvants.",
                effect: (player) => {
                    player.hp -= 10;
                    player.energy -= 20;
                    return "Vous perdez 10 PV et 20 points d'énergie en vous libérant des sables mouvants.";
                }
            },
            {
                description: "Vous découvrez des ruines anciennes.",
                effect: (player) => {
                    player.gold += 75;
                    player.experience += 30;
                    return "Vous trouvez 75 pièces d'or et gagnez 30 points d'expérience dans les ruines.";
                }
            },
            {
                description: "Une brume épaisse vous désoriente.",
                effect: (player) => {
                    player.energy -= 10;
                    return "Vous perdez 10 points d'énergie à essayer de retrouver votre chemin dans la brume.";
                }
            },
            {
                description: "Un crapaud géant vous propose un pari.",
                effect: (player) => {
                    const winBet = Math.random() > 0.5;
                    if (winBet) {
                        player.gold += 50;
                        return "Le crapaud grogne de déception, vous gagnez le pari et récupérez 50 pièces d'or.";
                    } else {
                        player.hp -= 10;
                        return "Le crapaud gagne le pari, et dans sa joie, vous mord légèrement, perdant 10 PV.";
                    }
                }
            },
            {
                description: "Vous tombez sur un lac étrange où des poissons brillent.",
                effect: (player) => {
                    player.inventory.push({ name: "Poisson Lumineux", type: "consumable", effect: "energy", value: 30 });
                    return "Vous attrapez un Poisson Lumineux. Peut-être utile plus tard ?";
                }
            }
        ]
    }
];

export function getRandomExpeditionEvent(expedition) {
    const randomIndex = Math.floor(Math.random() * expedition.events.length);
    return expedition.events[randomIndex];
}
