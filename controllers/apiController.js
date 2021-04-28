const https = require('https');
var tools = require('./tools/tools');
var host = 'cardano-mainnet.blockfrost.io';
var basePath = '/api/v0/';
var blockFrostApiKey = 'xu1QHJibBBNHZX0VE3ITxDPaOGbki9Gu';

exports.getAddrUtxos = function(req, res) {
    var address = req.params.addr;

    var options = tools.getBlockfrostOptions(host, basePath + `addresses/${address}/utxos`, blockFrostApiKey);

    https.get(options, (resp) => {
        let data = '';
        resp.on('data', (chunk) => {
            data += chunk;
        });  
        resp.on('end', () => {
            res.status(200).jsonp(data);
        });
    }).on("error", (err) => {
        console.log("Error: " + err.message);
        res.send(500, 'err');
    });
};

exports.getTxUtxos = function(req, res) {
    var txHash = req.params.txHash;

    var options = tools.getBlockfrostOptions(host, basePath + `txs/${txHash}/utxos`, blockFrostApiKey);

	https.get(options, (resp) => {
        let data = '';
        resp.on('data', (chunk) => {
            data += chunk;
        });  
        resp.on('end', () => {
            res.status(200).jsonp(data);
        });
    }).on("error", (err) => {
        console.log("Error: " + err.message);
        res.send(500, 'err');
    });
};
