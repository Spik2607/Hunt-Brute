const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

const http = require('http');
const { Server } = require('socket.io'); // Importation de Socket.IO

const server = http.createServer(app);
const io = new Server(server); // Instanciation du serveur Socket.IO

// Middleware pour servir les fichiers statiques
app.use(express.static('public'));

// Route de base
app.get('/', (req, res) => {
  res.send('Bienvenue sur votre serveur Node.js!');
});

// Démarrage du serveur
app.listen(port, () => {
  console.log(`Serveur en cours d'exécution sur http://localhost:${port}`);
});
