const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const requiredEnvVars = [
    'PORT',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_DEFAULT_REGION',
    'AWS_ECS_CLUSTER_ARN',
    'AWS_TASK_DEFINITION_ARN',
    'SUBNET_1',
    'SUBNET_2', 
    'SUBNET_3',
    'SECURITY_GROUPS',
    'IMAGE_NAME',
    'SERVICE_URI'
];

function checkEnvironment() {
    console.log('checking environment variables...');
    
    const missing = [];
    const present = [];
    
    requiredEnvVars.forEach(varName => {
        if (process.env[varName]) {
            present.push(varName);
        } else {
            missing.push(varName);
        }
    });
    
    console.log(`environment check - ${present.length}/${requiredEnvVars.length} variables configured`);
    
    if (missing.length > 0) {
        console.log('missing environment variables -');
        missing.forEach(varName => console.log(`  ${varName}`));
        process.exit(1);
    } else {
        console.log('all required environment variables are set');
    }
}

checkEnvironment();
