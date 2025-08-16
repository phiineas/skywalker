const express = require('express');
const path = require('path');
const { generateSlug } = require('random-word-slugs');
const { ECSClient, RunTaskCommand } = require('@aws-sdk/client-ecs');

require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const app = express();
const PORT = process.env.PORT;

app.use(express.json());

const ecsClient = new ECSClient({
    region: process.env.AWS_DEFAULT_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const config = {
    ECS_CLUSTER_ARN: process.env.AWS_ECS_CLUSTER_ARN,
    ECS_TASK_DEFINITION_ARN: process.env.AWS_TASK_DEFINITION_ARN,
    SUBNET_1: process.env.SUBNET_1,
    SUBNET_2: process.env.SUBNET_2,
    SUBNET_3: process.env.SUBNET_3,
    SECURITY_GROUPS: process.env.SECURITY_GROUPS,
    IMAGE_NAME: process.env.IMAGE_NAME
};

console.log(`loaded PORT - ${PORT}`);

app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', service: 'api-server', timestamp: new Date().toISOString() });
});

app.post('/api/upload', async (req, res) => {
    const { gitUrl, existingSlug } = req.body;
    const slug = existingSlug ? existingSlug : generateSlug();

    const command = new RunTaskCommand({
        cluster: config.ECS_CLUSTER_ARN,
        taskDefinition: config.ECS_TASK_DEFINITION_ARN,
        launchType: 'FARGATE',
        count: 1,
        networkConfiguration: {
            awsvpcConfiguration: {
                assignPublicIp: 'ENABLED',
                subnets: [
                    config.SUBNET_1,
                    config.SUBNET_2,
                    config.SUBNET_3
                ],
                securityGroups: [
                    config.SECURITY_GROUPS
                ],
            }
        },
        overrides: {
            containerOverrides: [
                {
                    name: config.IMAGE_NAME,
                    environment: [
                        {
                            name: 'GIT_REPOSITORY_URL',
                            value: gitUrl
                        },
                        {
                            name: 'PROJECT_ID',
                            value: slug
                        },
                        {
                            name: 'AWS_ACCESS_KEY_ID',
                            value: process.env.AWS_ACCESS_KEY_ID
                        },
                        {
                            name: 'AWS_SECRET_ACCESS_KEY',
                            value: process.env.AWS_SECRET_ACCESS_KEY
                        },
                        {
                            name: 'AWS_REGION',
                            value: process.env.AWS_DEFAULT_REGION
                        }
                    ]
                }
            ]
        }
    })

    await ecsClient.send(command);

    return res.json({
        status: 'queued',
        data: {
            slug,
            url: `http://${slug}.localhost:8000`
        }
    })
});

app.listen(PORT, () => console.log(`api server is running on port ${PORT}`))
