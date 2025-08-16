const axios = require('axios');

const services = [
    { name: 'api-server', url: 'http://localhost:9000', endpoint: '/api/health' },
    { name: 'socket-server', url: 'http://localhost:9001', endpoint: '/socket.io/' },
    { name: 'reverse-proxy', url: 'http://localhost:8000', endpoint: '/' }
];

async function checkService(service) {
    try {
        const response = await axios.get(service.url + service.endpoint, {
            timeout: 5000,
            validateStatus: () => true // accept any status
        });
        
        const isHealthy = response.status < 500;
        console.log(`${service.name} - ${isHealthy ? 'healthy' : 'unhealthy'} (${response.status})`);
        return isHealthy;
    } catch (error) {
        console.log(`${service.name} - unhealthy (${error.message})`);
        return false;
    }
}

async function healthCheck() {
    console.log('running health check...');
    console.log('checking all services...');
    
    const results = await Promise.all(services.map(checkService));
    const healthyCount = results.filter(Boolean).length;
    
    console.log(`health check complete - ${healthyCount}/${services.length} services healthy`);
    
    if (healthyCount === services.length) {
        console.log('all services are running properly');
        process.exit(0);
    } else {
        console.log('some services are not responding');
        process.exit(1);
    }
}

healthCheck();
