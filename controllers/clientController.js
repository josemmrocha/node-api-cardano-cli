const axios = require('axios');

exports.scanAndSend = function(req, res) {
    var address = req.params.addr;
    var response = getAddrTxs(address);

    if (response) {
        response.forEach(element => {
            console.log('Element TX HASH: ' + element.utxo);
        });
    } else {
        res.send(500, 'err');
    }
};

getAddrTxs = function(addr) {
    var url = 'localhost:4200/api/' + '/utxos/' + addr;
    console.log('URL' + url);

    (async () => {
        try {
            console.log('Calling');
            var response = await axios.get(url);
            console.log(response);
            return response;
        } catch (error) {
            console.log(error);
            return undefined;
        }
    })();
}