const https = require('https');
var tools = require('./tools/tools');
var host = 'cardano-mainnet.blockfrost.io';
var basePath = '/api/v0/';
var blockFrostApiKey = 'XXX';

exports.getAddrUtxos = function(req, res) {
    var address = req.params.addr;

    var options = tools.getOptions(blockFrostApiKey, basePath + `addresses/${address}/utxos`);
    var response = tools.httpGet(options);

    if (response.success) {
        res.status(200).jsonp(data);
    } else {
        res.send(500, 'err');
    }
};

exports.getTxUtxos = function(req, res) {
    var txHash = req.params.txHash;

    var options = tools.getOptions(blockFrostApiKey, basePath + `addresses/${txHash}/utxos`);

	https.get(options, (resp) => {
        let data = '';
    
        // A chunk of data has been received.
        resp.on('data', (chunk) => {
            data += chunk;
        });
    
        // The whole response has been received. Print out the result.
        resp.on('end', () => {
            console.log(JSON.parse(data).explanation);
            res.status(200).jsonp(data);
        });
    
        }).on("error", (err) => {
            console.log("Error: " + err.message);
            res.send(500, 'err');
        });
};
