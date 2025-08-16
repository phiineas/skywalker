const express = require('express');
const httpProxy = require('http-proxy');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const app = express();
const PORT = process.env.PORT;
const API_SERVER_PORT = process.env.API_SERVER_PORT || 9000;

console.log(`loaded PORT=${PORT}, API_SERVER_PORT=${API_SERVER_PORT} from .env.local`);
const proxy = httpProxy.createProxyServer();

app.use((req, res) => {
    const hostname = req.hostname;
    const subdomain = hostname.split('.')[0];

    // set CORS headers for all requests
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

    // handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    // route API requests to API server
    if (req.url.startsWith('/api/')) {
        const apiServerUrl = `http://localhost:${API_SERVER_PORT}`;
        console.log(`routing API request ${req.url} to API server at ${apiServerUrl}`);
        return proxy.web(req, res, { 
            target: apiServerUrl, 
            changeOrigin: true 
        });
    }

    // route static file requests to S3
    const s3BaseUrl = 'https://uploadserviceforskywalker.s3.ap-south-1.amazonaws.com';
    const resolvesTo = `${s3BaseUrl}/__outputs/${subdomain}`;
    console.log(`routing static request ${req.url} to S3 at ${resolvesTo}`);

    return proxy.web(req, res, { 
        target: resolvesTo, 
        changeOrigin: true,
        secure: true,
        headers: {
            'Host': 'uploadserviceforskywalker.s3.ap-south-1.amazonaws.com'
        }
    });
})

proxy.on('proxyReq', (proxyReq, req, res) => {
    const url = req.url;
    console.log(`proxying request- ${req.hostname}${url} -> ${proxyReq.path}`);
    
    // only set S3 headers for static file requests, not API requests
    if (!url.startsWith('/api/')) {
        proxyReq.setHeader('Host', 'uploadserviceforskywalker.s3.ap-south-1.amazonaws.com');
        
        if (url === "/") {
            proxyReq.path = proxyReq.path + 'index.html';
        }
    }
});

proxy.on('error', (err, req, res) => {
    console.error('proxy error-', err.message);
    console.error('request URL-', req.url);
    console.error('request headers-', req.headers);
    res.status(500).send('proxy error occurred');
});

proxy.on('proxyRes', (proxyRes, req, res) => {
    console.log(`proxy response- ${proxyRes.statusCode} for ${req.url}`);

    // only forward S3 headers for static files, not API responses
    if (!req.url.startsWith('/api/')) {
        const headers = proxyRes.headers;
        if (headers['content-type']) {
            res.setHeader('Content-Type', headers['content-type']);
        }
        if (headers['cache-control']) {
            res.setHeader('Cache-Control', headers['cache-control']);
        }
        if (headers['etag']) {
            res.setHeader('ETag', headers['etag']);
        }
    }
});

app.listen(PORT, () => console.log(`reverse proxy server is running on port ${PORT}`))
