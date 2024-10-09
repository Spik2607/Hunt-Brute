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
                    return "Vous avez récolté 10 unités de bois. Espérons que les écureuils ne le remarqueront pas.";
                }
            },
            {
                description: "Un groupe de loups vous attaque !",
                effect: (player) => {
                    player.hp -= 15;
                    return "Vous perdez 15 PV en combattant les loups, mais au moins, vous êtes plus rapide qu'eux !";
                }
            },
            {
                description: "Vous découvrez un ancien temple.",
                effect: (player) => {
                    player.gold += 50;
                    return "Vous trouvez 50 pièces d'or dans le temple, mais une étrange statue vous fixe.";
                }
            },
            {
                description: "Un corbeau parlant vous demande une devinette.",
                effect: (player) => {
                    const correctAnswer = Math.random() > 0.5;
                    if (correctAnswer) {
                        player.gold += 30;
                        return "Vous répondez correctement et le corbeau vous récompense avec 30 pièces d'or. Quel intellect !";
                    } else {
                        player.hp -= 5;
                        return "Votre réponse est fausse, le corbeau vous picore avec mépris, vous perdez 5 PV.";
                    }
                }
            },
            {
                description: "Vous tombez sur un arbre géant qui vous parle.",
                effect: (player) => {
                    player.experience += 15;
                    return "L'arbre vous raconte une histoire si ennuyeuse que vous vous endormez... mais gagnez 15 points d'expérience.";
                }
            },
            {
                description: "Vous trouvez un panier rempli de champignons. Mangez-vous les champignons ?",
                effect: (player) => {
                    const safeMushrooms = Math.random() > 0.5;
                    if (safeMushrooms) {
                        player.energy += 20;
                        return "Les champignons sont délicieux et vous revigorent ! +20 énergie.";
                    } else {
                        player.hp -= 20;
                        return "Oups, mauvais choix... Ces champignons étaient toxiques ! -20 PV.";
                    }
                }
            },
            {
                description: "Vous entendez une mélodie mystérieuse jouer dans la forêt.",
                effect: (player) => {
                    player.energy -= 10;
                    player.hp += 10;
                    return "La mélodie apaise votre esprit, mais vous suivez la musique sans réfléchir. Vous gagnez 10 PV mais perdez 10 points d'énergie.";
                }
            },
            {
                description: "Un écureuil géant vous bloque le passage et vous demande des noix.",
                effect: (player) => {
                    const hasNuts = Math.random() > 0.7;
                    if (hasNuts) {
                        player.energy += 10;
                        return "Heureusement, vous aviez quelques noix ! L'écureuil vous laisse passer et vous donne de l'énergie en retour.";
                    } else {
                        player.hp -= 5;
                        return "Vous n'avez pas de noix... L'écureuil devient agressif et vous perdez 5 PV.";
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
                    return "L'ascension est difficile, mais gratifiante. Vous gagnez 20 points d'expérience.";
                }
            },
            {
                description: "Une tempête de neige vous surprend.",
                effect: (player) => {
                    player.energy -= 30;
                    return "La tempête vous épuise. Vous perdez 30 points d'énergie, mais au moins vous avez survécu !";
                }
            },
            {
                description: "Vous trouvez une veine de fer.",
                effect: (player) => {
                    player.resources.iron += 15;
                    return "Vous récoltez 15 unités de fer. Le travail ardu vous réchauffe un peu.";
                }
            },
            {
                description: "Vous croisez un yéti... qui semble vouloir discuter !",
                effect: (player) => {
                    player.hp -= 10;
                    player.gold += 20;
                    return "Le yéti vous donne 20 pièces d'or après une conversation étrange. Mais il tape un peu fort sur l'épaule ! -10 PV.";
                }
            },
            {
                description: "Un escalier mystérieux creusé dans la glace mène vers un sous-sol.",
                effect: (player) => {
                    player.experience += 25;
                    player.resources.wood += 5;
                    return "L'escalier vous mène à une cache secrète. Vous gagnez 25 points d'expérience et récupérez 5 unités de bois.";
                }
            },
            {
                description: "Vous dérapez sur une plaque de glace et faites une glissade épique.",
                effect: (player) => {
                    player.energy -= 15;
                    return "La glissade est amusante, mais vous perdez 15 points d'énergie dans la descente incontrôlée.";
                }
            },
            {
                description: "Un aigle majestueux vous survole et lâche... un cadeau inespéré.",
                effect: (player) => {
                    player.gold += 40;
                    return "L'aigle laisse tomber une petite bourse de 40 pièces d'or. La chance est avec vous aujourd'hui !";
                }
            },
            {
                description: "Vous trouvez un igloo abandonné. Allez-vous entrer ?",
                effect: (player) => {
                    const safeIgloo = Math.random() > 0.5;
                    if (safeIgloo) {
                        player.energy += 20;
                        return "L'igloo est confortable. Vous vous reposez et regagnez 20 points d'énergie.";
                    } else {
                        player.hp -= 10;
                        return "Un ours polaire habite l'igloo ! Vous fuyez en perdant 10 PV.";
                    }
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
                    return "L'alchimiste vous offre une potion de soin mystérieuse. À utiliser avec prudence.";
                }
            },
            {
                description: "Vous vous enlisez dans des sables mouvants.",
                effect: (player) => {
                    player.hp -= 10;
                    player.energy -= 20;
                    return "Vous luttez pour vous libérer des sables mouvants. -10 PV et -20 énergie.";
                }
            },
            {
                description: "Vous découvrez des ruines anciennes.",
                effect: (player) => {
                    player.gold += 75;
                    player.experience += 30;
                    return "Vous explorez les ruines et trouvez 75 pièces d'or, tout en gagnant 30 points d'expérience.";
                }
            },
            {
                description: "Une brume épaisse vous désoriente.",
                effect: (player) => {
                    player.energy -= 10;
                    return "La brume vous épuise alors que vous tentez de retrouver votre chemin. -10 énergie.";
                }
            },
            {
                description: "Un crapaud géant vous propose un pari.",
                effect: (player) => {
                    const winBet = Math.random() > 0.5;
                    if (winBet) {
                        player.gold += 50;
                        return "Vous gagnez le pari contre le crapaud et remportez 50 pièces d'or. Pas mal pour un crapaud !";
                    } else {
                        player.hp -= 10;
                        return "Vous perdez le pari, et le crapaud vous mord légèrement. -10 PV.";
                    }
                }
            },
            {
                description: "Vous tombez sur un lac étrange où des poissons brillent.",
                effect: (player) => {
                    player.inventory.push({ name: "Poisson Lumineux", type: "consumable", effect: "energy", value: 30 });
                    return "Vous attrapez un Poisson Lumineux. À garder précieusement.";
                }
            },
            {
                description: "Un sorcier des marais apparaît et vous propose un défi.",
                effect: (player) => {
                    const passedChallenge = Math.random() > 0.5;
                    if (passedChallenge) {
                        player.experience += 50;
                        return "Vous relevez le défi du sorcier et gagnez 50 points d'expérience. Une victoire bien méritée !";
                    } else {
                        player.hp -= 20;
                        return "Le défi du sorcier est trop difficile. Vous échouez et perdez 20 PV.";
                    }
                }
            },
            {
                description: "Un trésor apparaît dans la boue... mais est-ce réel ?",
                effect: (player) => {
                    const realTreasure = Math.random() > 0.5;
                    if (realTreasure) {
                        player.gold += 100;
                        return "Le trésor est bien réel ! Vous gagnez 100 pièces d'or.";
                    } else {
                        player.hp -= 15;
                        return "C'était un mirage... Vous perdez 15 PV en creusant inutilement.";
                    }
                }
            }
        ]
    }
];

export function getRandomExpeditionEvent(expedition) {
    const randomIndex = Math.floor(Math.random() * expedition.events.length);
    return expedition.events[randomIndex];
}
