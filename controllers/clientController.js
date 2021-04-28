const axios = require('axios');

exports.scanAndSend = function(req, res) {
    var address = req.params.addr;
    var response = getAddrTxs(address);

    response.forEach(element => {
        console.log('Element TX HASH: ' + element.utxo);
    });
};

getAddrTxs = function(addr) {
    var url = 'localhost:4200/api/' + '/utxos/' + addr;

    (async () => {
        try {
            return await axios.get(url);
        } catch (error) {
            console.log(error.response.body);
        }
    })();
}