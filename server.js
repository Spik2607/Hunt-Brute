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

    socket.on('joinRoom', (roomId) => {
        let room;
        if (roomId === FIXED_ROOM) {
            if (!rooms.has(FIXED_ROOM)) {
                rooms.set(FIXED_ROOM, { players: [], ready: 0 });
            }
            room = rooms.get(FIXED_ROOM);
        } else if (rooms.has(roomId)) {
            room = rooms.get(roomId);
        } else {
            room = { players: [], ready: 0 };
            rooms.set(roomId, room);
        }

        if (room.players.length < 2) {
            room.players.push({
                id: socket.id,
                name: `Player ${room.players.length + 1}`,
                level: 1,
                hp: 100,
                attack: 10,
                defense: 5
            });
            socket.join(roomId);
            socket.emit('roomJoined', roomId);
            
            // Informer les autres joueurs de la salle
            socket.to(roomId).emit('playerJoined', room.players[room.players.length - 1]);

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
                }
            }
        });
    });

    // Ajoutez d'autres gestionnaires d'événements si nécessaire
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Serveur en écoute sur le port ${PORT}`));
