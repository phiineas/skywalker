const axios = require('axios');

async function deploy(gitUrl, slug = null) {
    console.log('starting deployment...');
    console.log(`repository - ${gitUrl}`);
    
    if (slug) {
        console.log(`custom slug - ${slug}`);
    }
    
    try {
        const response = await axios.post('http://localhost:9000/api/upload', {
            gitUrl,
            existingSlug: slug
        });
        
        const { status, data } = response.data;
        console.log(`deployment status - ${status}`);
        console.log(`project slug - ${data.slug}`);
        console.log(`preview url - ${data.url}`);
        
        return data;
    } catch (error) {
        console.error('deployment failed - ', error.message);
        process.exit(1);
    }
}

// command line usage
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log('usage - node deploy.js <git-url> [custom-slug]');
        process.exit(1);
    }
    
    const [gitUrl, slug] = args;
    deploy(gitUrl, slug);
}

module.exports = { deploy };
