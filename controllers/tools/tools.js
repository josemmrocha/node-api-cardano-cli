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
        return new Promise ((resolve, reject) => {
            https.get(options, (resp) => {
                let data = '';
                        resp.on('data', (chunk) => {
                    data += chunk;
                });
            
                resp.on('end', () => {
                    resolve(data);
                });
            }).on("error", (err) => {
                reject(err);
            });
        });
        
    }
};