const { Server } = require('socket.io');
const { createServer } = require('http');
const Redis = require('ioredis');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const PORT = process.env.SOCKET_PORT || 9001;

// create Redis subscriber
let subscriber;
try {
    if (process.env.SERVICE_URI) {
        subscriber = new Redis(process.env.SERVICE_URI);
        subscriber.on('error', (err) => {
            console.warn('Redis connection error:', err.message);
        });
    } else {
        console.warn('SERVICE_URI not configured, Redis functionality will be disabled');
    }
} catch (error) {
    console.warn('Failed to initialize Redis connection:', error.message);
}

// create HTTP server
const httpServer = createServer((req, res) => {
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            status: 'healthy', 
            service: 'socket-server', 
            timestamp: new Date().toISOString() 
        }));
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

// create Socket.IO server
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true
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
    if (!subscriber) {
        console.log('Redis subscriber not available, skipping subscription setup');
        return;
    }
    
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
httpServer.listen(PORT, () => {
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
    httpServer.close(() => {
        console.log('socket.io server closed');
        subscriber.disconnect();
        process.exit(0);
    });
});
