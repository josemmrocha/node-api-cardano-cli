const https = require('https');

module.exports = {
    getOptions: function (blockFrostApiKey, path) {
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
                return { data: data, sucess: true };
            });
        }).on("error", (err) => {
            return { data: undefined, sucess: false };
        });
    }
};