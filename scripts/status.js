const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

async function getProcessInfo(port) {
    try {
        const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
        return stdout.trim() ? 'running' : 'stopped';
    } catch (error) {
        return 'stopped';
    }
}

async function checkStatus() {
    console.log('checking service status...');
    
    const services = [
        { name: 'api-server', port: 9000 },
        { name: 'socket-server', port: 9001 },
        { name: 'reverse-proxy', port: 8000 }
    ];

    for (const service of services) {
        const status = await getProcessInfo(service.port);
        console.log(`${service.name} (port ${service.port}) - ${status}`);
    }
    
    console.log('status check complete');
}

checkStatus();
