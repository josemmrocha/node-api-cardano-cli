const axios = require('axios');

exports.scanAndSend = function(req, res) {
    var address = req.params.addr;
    getUtxos(address).then(
        (response) => {
            if (response) {
                var cont = 0;
                response.forEach(element => {
                    console.log('Getting inputs for hash: ' + element.utxo);
                    getOuputsFromUtxo(element.utxo).then(
                        (result) => {
                            console.log('result: ' + result);
                            if (cont === response.length-1) {
                                finish();
                            }
                            cont++;
                        },
                        (error) => {
                            res.send(500, 'err');
                        }
                    );
                });
            } else {
                res.send(500, 'err');
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

function finish() {
    res.send(200, true);
} 