const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server,{
    cors:{
        origin: '*',
    }
});

io.on('connection', (socket)=>{
    console.log('A user connected');

    socket.on('join-room', (roomId)=>{
        socket.join(roomId);
    });

    socket.on('offer', (offer, roomId) => {
        socket.to(roomId).emit('offer', offer);
    });

    socket.on('answer', (answer, roomId)=>{
        socket.to(roomId).emit('answer', answer);
    });

    socket.on('candidate',(candidate, roomId)=>{
        socket.to(roomId).emit('candidate', candidate);
    });
});

server.listen(3001, ()=>{
    console.log('server is running on port 3001');
});