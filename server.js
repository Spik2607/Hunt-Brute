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
                rooms.set(FIXED_ROOM, { players: [], messages: [] });
            }
            room = rooms.get(FIXED_ROOM);
        } else {
            if (!rooms.has(roomId)) {
                rooms.set(roomId, { players: [], messages: [] });
            }
            room = rooms.get(roomId);
        }

        if (room.players.length < 2) {
            playerInfo.id = socket.id;
            room.players.push(playerInfo);
            socket.join(roomId);
            socket.emit('roomJoined', { roomId, players: room.players, messages: room.messages });
            socket.to(roomId).emit('playerJoined', room.players);
            if (room.players.length === 2) {
                io.to(roomId).emit('gameReady', room.players);
            }
        } else {
            socket.emit('roomError', 'Cette salle est pleine');
        }
    });

    socket.on('chatMessage', ({ roomId, message }) => {
        const room = rooms.get(roomId);
        if (room) {
            room.messages.push(message);
            io.to(roomId).emit('newMessage', message);
        }
    });

    socket.on('initiateChallenge', ({ roomId, challengerId }) => {
        io.to(roomId).emit('challengeReceived', { challengerId });
    });

    socket.on('acceptChallenge', ({ roomId, challengerId, accepterId }) => {
        io.to(roomId).emit('battleStart', { challengerId, accepterId });
    });

    socket.on('playerAction', ({ roomId, action }) => {
        socket.to(roomId).emit('opponentAction', action);
    });

    socket.on('initiateTradeRequest', ({ roomId, fromId, toId }) => {
        io.to(roomId).emit('tradeRequestReceived', { fromId, toId });
    });

    socket.on('acceptTradeRequest', ({ roomId, fromId, toId }) => {
        io.to(roomId).emit('tradeStart', { fromId, toId });
    });

    socket.on('offerTradeItem', ({ roomId, itemId }) => {
        io.to(roomId).emit('itemOffered', { fromId: socket.id, itemId });
    });

    socket.on('confirmTrade', ({ roomId }) => {
        io.to(roomId).emit('tradeConfirmed', { playerId: socket.id });
    });

    socket.on('cancelTrade', ({ roomId }) => {
        io.to(roomId).emit('tradeCancelled', { playerId: socket.id });
    });

    socket.on('disconnect', () => {
        console.log('Un joueur s\'est déconnecté', socket.id);
        rooms.forEach((room, roomId) => {
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                room.players.splice(playerIndex, 1);
                io.to(roomId).emit('playerLeft', socket.id);
            }
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Serveur en écoute sur le port ${PORT}`));
