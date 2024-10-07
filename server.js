K
ecrit moi l'intégralité du code server.js


Bien sûr, je vais vous fournir un exemple complet de fichier server.js qui intègre toutes les fonctionnalités nécessaires pour votre jeu de combat en ligne, y compris la gestion des salles et les communications Socket.IO. Voici le code :

javascript

Copy
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Servir les fichiers statiques depuis le dossier 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Stockage des salles et des joueurs
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('Un joueur s\'est connecté');

  socket.on('createRoom', (roomId) => {
    console.log('Tentative de création de salle:', roomId);
    if (rooms.has(roomId)) {
      socket.emit('roomError', 'Cette salle existe déjà');
    } else {
      rooms.set(roomId, { players: [socket.id], ready: 0 });
      socket.join(roomId);
      socket.emit('roomCreated', roomId);
      console.log('Salle créée:', roomId);
    }
  });

  socket.on('joinRoom', (roomId) => {
    console.log('Tentative de rejoindre la salle:', roomId);
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      if (room.players.length < 2) {
        room.players.push(socket.id);
        socket.join(roomId);
        socket.emit('roomJoined', roomId);
        if (room.players.length === 2) {
          io.to(roomId).emit('gameReady');
        }
        console.log('Joueur a rejoint la salle:', roomId);
      } else {
        socket.emit('roomError', 'Cette salle est pleine');
      }
    } else {
      socket.emit('roomError', 'Cette salle n\'existe pas');
    }
  });

  socket.on('playerReady', (roomId) => {
    console.log('Joueur prêt dans la salle:', roomId);
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      room.ready++;
      if (room.ready === 2) {
        io.to(roomId).emit('startGame');
        console.log('La partie commence dans la salle:', roomId);
      }
    }
  });

  socket.on('attack', (data) => {
    console.log('Attaque dans la salle:', data.roomId);
    socket.to(data.roomId).emit('enemyAttack', data.attack);
  });

  socket.on('disconnect', () => {
    console.log('Un joueur s\'est déconnecté');
    rooms.forEach((room, roomId) => {
      const index = room.players.indexOf(socket.id);
      if (index !== -1) {
        room.players.splice(index, 1);
        if (room.players.length === 0) {
          rooms.delete(roomId);
        } else {
          io.to(roomId).emit('playerDisconnected');
        }
      }
    });
  });
});

// Route pour la page principale
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Serveur en écoute sur le port ${PORT}`));

