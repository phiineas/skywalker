const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const mime = require('mime-types');

require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const PROJECT_ID = process.env.PROJECT_ID;

async function init() {
    console.log('executing script.js');
    const outputDirPath = path.join(__dirname, 'output');

    const p = exec(`cd ${outputDirPath} && npm install && npm run build`)

    p.stdout.on('data', function (data) {
        console.log(data.toString());
    });

    p.stderr.on('data', function (data) {
        console.error(data.toString());
    });

    p.on('close', async function () {
        console.log(`child process exited with code`);
        const distDirPath = path.join(__dirname, 'output', 'dist');
        const distDirContents = fs.readdirSync(distDirPath, { recursive: true });

        for (const file of distDirContents) {
            const filePath = path.join(distDirPath, file);
            if (fs.lstatSync(filePath).isDirectory()) {
                continue;
            }

            console.log('uploading ' + filePath);

            const command = new PutObjectCommand({
                Bucket: 'uploadserviceforskywalker',
                Key: `__outputs/${PROJECT_ID}/${file}`,
                Body: fs.createReadStream(filePath),
                ContentType: mime.lookup(filePath)
            });

            await s3Client.send(command);
            console.log(`uploaded ${filePath} to S3`);
        }

        console.log('completed uploading files to S3');
    });
}

init();
