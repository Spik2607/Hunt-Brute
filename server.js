const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

const rooms = new Map();

io.on('connection', (socket) => {
    console.log('Un joueur s\'est connecté');

    socket.on('createRoom', (roomId) => {
        if (rooms.has(roomId)) {
            socket.emit('roomError', 'Cette salle existe déjà');
        } else {
            rooms.set(roomId, { players: [socket.id], ready: 0 });
            socket.join(roomId);
            socket.emit('roomCreated', roomId);
        }
    });

    socket.on('joinRoom', (roomId) => {
        if (rooms.has(roomId)) {
            const room = rooms.get(roomId);
            if (room.players.length < 2) {
                room.players.push(socket.id);
                socket.join(roomId);
                socket.emit('roomJoined', roomId);
                if (room.players.length === 2) {
                    io.to(roomId).emit('gameReady');
                }
            } else {
                socket.emit('roomError', 'Cette salle est pleine');
            }
        } else {
            socket.emit('roomError', 'Cette salle n\'existe pas');
        }
    });

    socket.on('playerReady', (roomId) => {
        if (rooms.has(roomId)) {
            const room = rooms.get(roomId);
            room.ready++;
            if (room.ready === 2) {
                io.to(roomId).emit('startGame');
            }
        }
    });

    socket.on('attack', (data) => {
        socket.to(data.roomId).emit('enemyAttack', data.attackType);
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Serveur en écoute sur le port ${PORT}`));
