const https = require('https');

module.exports = {
    getBlockfrostOptions: function (host, path, blockFrostApiKey) {
        return {
            host : host,
            path: path,
            headers: {
                "project_id": blockFrostApiKey
            },
        };
    },
    httpGet: function (options) {
        https.get(options, (resp) => {
            let data = '';
                    resp.on('data', (chunk) => {
                data += chunk;
            });
        
            resp.on('end', () => {
                return { data: data, success: true };
            });
        }).on("error", (err) => {
            return { data: undefined, success: false };
        });
    }
};