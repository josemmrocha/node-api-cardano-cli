const https = require('https');
var tools = require('./tools/tools');
const constants = require('./constants/constants');
var host = 'cardano-mainnet.blockfrost.io';
var basePath = '/api/v0/';
var blockFrostApiKey = 'xu1QHJibBBNHZX0VE3ITxDPaOGbki9Gu';
var opts = {
    logFilePath: constants.testNFTPath + 'server.log',
    timestampFormat:'YYYY-MM-DD HH:mm:ss.SSS'
};
const log = require('simple-node-logger').createSimpleLogger(opts);

exports.getAddrUtxos = function(req, res) {
    var address = req.params.addr;

    var options = tools.getBlockfrostOptions(host, basePath + `addresses/${address}/utxos`, blockFrostApiKey);

    try {
        https.get(options, (resp) => {
            let data = '';
            resp.on('data', (chunk) => {
                data += chunk;
            });  
            resp.on('end', () => {
                res.status(200).jsonp(data);
            });
        }).on("error", (err) => {
            log.error("Error: " + err.message);
            res.status(500).jsonp('err');
        });
    } catch (error) {
        log.error("Error: " + err.message);
        res.status(500).jsonp('err');
    }   
};

exports.getTxUtxos = function(req, res) {
    var txHash = req.params.txHash;

    var options = tools.getBlockfrostOptions(host, basePath + `txs/${txHash}/utxos`, blockFrostApiKey);

    try {
        https.get(options, (resp) => {
            let data = '';
            resp.on('data', (chunk) => {
                data += chunk;
            });  
            resp.on('end', () => {
                res.status(200).jsonp(data);
            });
        }).on("error", (err) => {
            log.error("Error: " + err.message);
            res.send(500, 'err');
        });
    } catch (error) {
        log.error("Error: " + err.message);
        res.status(500).jsonp('err');
    }  	
};

exports.getAllTx = function(req, res) {
    var addr = req.params.addr;

    var options = tools.getBlockfrostOptions(host, basePath + `addresses/${addr}/txs`, blockFrostApiKey);

    try {
        https.get(options, (resp) => {
            let data = '';
            resp.on('data', (chunk) => {
                data += chunk;
            });  
            resp.on('end', () => {
                res.status(200).jsonp(data);
            });
        }).on("error", (err) => {
            log.error("Error: " + err.message);
            res.send(500, 'err');
        });
    } catch (error) {
        log.error("Error: " + err.message);
        res.status(500).jsonp('err');
    }  
};
