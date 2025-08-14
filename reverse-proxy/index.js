const express = require('express');
const httpProxy = require('http-proxy');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const app = express();
const PORT = process.env.PORT;
const BASE_PATH = process.env.BASE_PATH;

console.log(`loaded PORT=${PORT}, BASE_PATH=${BASE_PATH} from .env.local`);
const proxy = httpProxy.createProxyServer();

app.use((req, res) => {
    const hostname = req.hostname;
    const subdomain = hostname.split('.')[0];

    // route to S3 bucket where the built files are stored
    const s3BaseUrl = 'https://uploadserviceforskywalker.s3.ap-south-1.amazonaws.com';
    const resolvesTo = `${s3BaseUrl}/__outputs/${subdomain}`;

    return proxy.web(req, res, { target: resolvesTo, changeOrigin: true });
})

proxy.on('proxyReq', (proxyReq, req, res) => {
    const url = req.url;
    console.log(`proxying request- ${req.hostname}${url} -> ${proxyReq.path}`);
    if (url === "/") {
        proxyReq.path = '/index.html';
    }
});

proxy.on('error', (err, req, res) => {
    console.error('proxy error-', err.message);
    res.status(500).send('proxy error occurred');
});

proxy.on('proxyRes', (proxyRes, req, res) => {
    console.log(`proxy response- ${proxyRes.statusCode} for ${req.url}`);
});

app.listen(PORT, () => console.log(`reverse proxy server is running on port ${PORT}`))
