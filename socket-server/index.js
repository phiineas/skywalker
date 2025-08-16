const { Server } = require('socket.io');
const Redis = require('ioredis');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const PORT = process.env.SOCKET_PORT || 9001;

// create Redis subscriber
const subscriber = new Redis(process.env.SERVICE_URI);

// create Socket.IO server
const io = new Server({
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// handle socket connections
io.on('connection', (socket) => {
    console.log('new client connected - ', socket.id);
    
    socket.on('subscribe', (channel) => {
        socket.join(channel);
        socket.emit('subscribed', channel);
        console.log(`client ${socket.id} subscribed to channel - ${channel}`);
    });

    socket.on('disconnect', () => {
        console.log('client disconnected - ', socket.id);
    });
});

// handle Redis pub/sub for logs
async function setupRedisSubscription() {
    console.log('setting up Redis subscription for logs ...');
    
    try {
        await subscriber.psubscribe('logs-*');
        console.log('successfully subscribed to logs-* pattern');
        
        subscriber.on('pmessage', (pattern, channel, message) => {
            console.log(`received message on channel ${channel}`);
            try {
                const parsedMessage = JSON.parse(message);
                io.to(channel).emit('log', parsedMessage);
            } catch (error) {
                console.error('error parsing message - ', error);
            }
        });
    } catch (error) {
        console.error('error setting up Redis subscription - ', error);
    }
}

console.log('starting Socket.IO server ...');
io.listen(PORT, () => {
    console.log(`socket.io server running on port - ${PORT}`);
    setupRedisSubscription();
});

// handle errors
io.engine.on('connection_error', (err) => {
    console.log('connection error - ', err.req);
    console.log('error code - ', err.code);
    console.log('error message - ', err.message);
    console.log('error context - ', err.context);
});

process.on('SIGINT', () => {
    console.log('shutting down Socket.IO server ...');
    io.close(() => {
        console.log('socket.io server closed');
        subscriber.disconnect();
        process.exit(0);
    });
});
