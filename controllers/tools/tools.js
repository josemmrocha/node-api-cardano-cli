const axios = require('axios');

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
    httpGet: async function (url) {   
        try {
            let res = await axios.get(url);
            return res.data;
        } catch (error) {
            return undefined;
        }   
    }  
};