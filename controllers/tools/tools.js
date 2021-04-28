module.exports = {
    getBlockfrostOptions: function (host, path, blockFrostApiKey) {
        return {
            host : host,
            path: path,
            headers: {
                "project_id": blockFrostApiKey
            },
        };
    }
};