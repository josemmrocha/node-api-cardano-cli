const https = require('https');
var baseUrl = 'https://cardano-mainnet.blockfrost.io/api/v0/';
var blockFrostApiKey = 'XXX';

exports.getAddrUtxos = function(req, res) {
    var address = req.params.addr;
    var url = baseUrl + `addresses/${address}/utxos`;
    console.log('Url: ' + url);	

    https.get({'url': url, 'project_id': blockFrostApiKey}, (resp) => {
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

exports.getTxUtxos = function(req, res) {
    var txHash = req.params.txHash;
    var url = baseUrl + `txs/${txHash}/utxos`;
    console.log('Url: ' + url);
	var request = http.request({'url': url,
                            'project_id': blockFrostApiKey
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
