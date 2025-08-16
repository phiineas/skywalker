const { spawn } = require('child_process');
const path = require('path');

console.log('starting skywalker platform...');

const services = [
    { name: 'interface', port: '3000', dir: 'interface' },
    { name: 'api-server', port: '9000', dir: 'api-server' },
    { name: 'socket-server', port: '9001', dir: 'socket-server' },
    { name: 'reverse-proxy', port: '8000', dir: 'reverse-proxy' }
];

const processes = [];

function startService(service) {
    console.log(`starting ${service.name} on port ${service.port}...`);
    
    const serviceDir = path.join(__dirname, '..', service.dir);
    const child = spawn('npm', ['start'], {
        cwd: serviceDir,
        stdio: 'pipe',
        shell: true
    });

    child.stdout.on('data', (data) => {
        console.log(`[${service.name}] ${data.toString().trim()}`);
    });

    child.stderr.on('data', (data) => {
        console.error(`[${service.name}] error - ${data.toString().trim()}`);
    });

    child.on('close', (code) => {
        console.log(`[${service.name}] process exited with code ${code}`);
    });

    processes.push({ name: service.name, process: child });
    return child;
}

async function startAll() {
    console.log('initializing all services...');
    
    for (const service of services) {
        startService(service);
        // wait 2 seconds between service starts
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('all services started successfully');
    console.log('platform ready at http://localhost:8000');
}

process.on('SIGINT', () => {
    console.log('shutting down all services...');
    processes.forEach(({ name, process }) => {
        console.log(`stopping ${name}...`);
        process.kill();
    });
    process.exit(0);
});

startAll().catch(console.error);
