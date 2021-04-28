const axios = require('axios');

exports.scanAndSend = function(req, res) {
    var address = req.params.addr;
    var response = getAddrTxs(address);

    if (response) {
        response.forEach(element => {
            console.log('Element TX HASH: ' + element.utxo);
        });
    }
};

getAddrTxs = function(addr) {
    var url = 'localhost:4200/api/' + '/utxos/' + addr;

    (async () => {
        try {
            var response = await axios.get(url);
            console.log(response);
            return response;
        } catch (error) {
            console.log(error.response.body);
        }
    })();
}