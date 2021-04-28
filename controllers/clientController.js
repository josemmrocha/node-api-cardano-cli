const axios = require('axios');

exports.scanAndSend = function(req, res) {
    var address = req.params.addr;
    res.status(200).send('running');

    getUtxos(address).then(
        (response) => {
            if (response) {
                response.forEach(element => {
                    console.log('Getting inputs for hash: ' + element.utxo);
                    getOuputsFromUtxo(element.utxo).then(
                        (result) => {
                            console.log('result: ' + result);
                        },
                        (error) => {
                            res.status(500).send('err');
                        }
                    );
                });
            } else {
                res.status(500).send('err');
            }
        }, 
        (error) => {
            res.status(500).send('err');
    });
};

async function getUtxos(addr) {
    var url = 'http://localhost:4200/api/' + 'utxos/' + addr;

    try {
        let res = await axios.get(url);
        return res.data;
    } catch (error) {
        return undefined;
    }   
}

async function getOuputsFromUtxo(txHash) {
    var url = 'http://localhost:4200/api/' + 'txUtxos/' + txHash;

    try {
        let res = await axios.get(url);
        return res.data;
    } catch (error) {
        return undefined;
    }   
}