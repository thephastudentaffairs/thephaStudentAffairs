const https = require('https');

const apiKey = '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';

const options = {
    hostname: 'api.groq.com',
    path: '/openai/v1/models',
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
    }
};

const req = https.request(options, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        try {
            const data = JSON.parse(body);
            console.log(JSON.stringify(data, null, 2));
        } catch (e) {
            console.error(body);
        }
    });
});

req.on('error', (e) => {
    console.error(e);
});

req.end();
