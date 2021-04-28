var http = require('http');
var baseUrl = 'https://cardano-mainnet.blockfrost.io/api/v0/';

exports.getAddrUtxos = function(req, res) {
    var address = req.params.addr;
    var url = baseUrl + `addresses/${address}/utxos`;
	var request = http.request({'url': url,
                            'project_id': 'XXXX'
                           }, 
                            function (response) {
                             console.log('STATUS: ' + response.statusCode);
                             if (response.statusCode !== 200) {
                                res.send(500, 'err');
                             }
                             console.log('HEADERS: ' + JSON.stringify(response.headers));
                             response.setEncoding('utf8');
                             response.on('data', function (chunk) {
                               console.log('BODY: ' + chunk);
                               res.status(200).jsonp(chunk);
                             });
                           });
    request.end();
};

exports.getTxUtxos = function(req, res) {
    var txHash = req.params.txHash;
    var url = baseUrl + `txs/${txHash}/utxos`;
	var request = http.request({'url': url,
                            'project_id': 'XXXX'
                           }, 
                            function (response) {
                             console.log('STATUS: ' + response.statusCode);
                             if (response.statusCode !== 200) {
                                res.send(500, 'err');
                             }
                             console.log('HEADERS: ' + JSON.stringify(response.headers));
                             response.setEncoding('utf8');
                             response.on('data', function (chunk) {
                               console.log('BODY: ' + chunk);
                               res.status(200).jsonp(chunk);
                             });
                           });
    request.end();
};
