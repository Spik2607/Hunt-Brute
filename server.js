const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

const FIXED_ROOM = 'fixed-room';
const rooms = new Map();

io.on('connection', (socket) => {
    console.log('Un joueur s\'est connecté', socket.id);

    socket.on('joinRoom', ({ roomId, playerInfo }) => {
        let room;
        if (roomId === FIXED_ROOM) {
            if (!rooms.has(FIXED_ROOM)) {
                rooms.set(FIXED_ROOM, { players: [] });
            }
            room = rooms.get(FIXED_ROOM);
        } else {
            if (!rooms.has(roomId)) {
                rooms.set(roomId, { players: [] });
            }
            room = rooms.get(roomId);
        }

        if (room.players.length < 2) {
            playerInfo.id = socket.id;
            room.players.push(playerInfo);
            socket.join(roomId);
            socket.emit('roomJoined', roomId);
            io.to(roomId).emit('playerJoined', room.players);

            if (room.players.length === 2) {
                io.to(roomId).emit('gameReady', room.players);
            }
        } else {
            socket.emit('roomError', 'Cette salle est pleine');
        }
    });

    socket.on('playerMove', (move) => {
        const roomId = [...socket.rooms].find(room => room !== socket.id);
        if (roomId) {
            socket.to(roomId).emit('opponentMove', move);
        }
    });

    socket.on('disconnect', () => {
        console.log('Un joueur s\'est déconnecté', socket.id);
        rooms.forEach((room, roomId) => {
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                room.players.splice(playerIndex, 1);
                if (room.players.length === 0 && roomId !== FIXED_ROOM) {
                    rooms.delete(roomId);
                } else {
                    io.to(roomId).emit('playerDisconnected', socket.id);
                    io.to(roomId).emit('playerJoined', room.players); // Mettre à jour la liste des joueurs
                }
            }
        });
    });

    // Nouvelle fonctionnalité : chat
    socket.on('sendMessage', ({ roomId, message }) => {
        io.to(roomId).emit('newMessage', { 
            senderId: socket.id, 
            message: message 
        });
    });

    // Nouvelle fonctionnalité : synchronisation de l'état du jeu
    socket.on('syncGameState', ({ roomId, gameState }) => {
        socket.to(roomId).emit('gameStateSynced', gameState);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Serveur en écoute sur le port ${PORT}`));
