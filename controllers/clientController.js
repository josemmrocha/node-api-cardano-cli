const axios = require('axios');
var tools = require('./tools/tools');

exports.scanAndSend = function(req, res) {
    var address = req.params.addr;
    res.status(200).send('running');
  
    getUtxos(address).then(
        (responseGetUtxos) => {
            if (responseGetUtxos) {
                responseGetUtxos.forEach(element => {
                    console.log('Getting inputs for hash: ' + element.utxo);
                    getOuputsFromUtxo(element.utxo).then(
                        (responseGetOuputsFromUtxo) => {
                            getEntrantAddress(address, responseGetOuputsFromUtxo);
                        },
                        (errorGetOuputsFromUtxo) => {
                            res.status(500).send('err');
                        }
                    );
                });
            } else {
                res.status(500).send('err');
            }
        }, 
        (errorGetUtxos) => {
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

function getEntrantAddress(myAddr, responseGetOuputsFromUtxo) {
    var entrantTx = false;
    if (responseGetOuputsFromUtxo && responseGetOuputsFromUtxo.outputs && responseGetOuputsFromUtxo.outputs.length > 0) {
        responseGetOuputsFromUtxo.outputs.forEach(output => {
            if (output.address === myAddr && output.amount.quantity >= 2000000) { // 10000000 = 10 ADA
                entrantTx = true;
            } 
        });
        if (entrantTx) {
            var sentAdaToAddr = '';
            responseGetOuputsFromUtxo.outputs.forEach(output => {
                if (output.address !== myAddr && !sentAdaToAddr) {
                    sentAdaToAddr = output.address;
                } 
            });
            console.log('Send ADA to addr: ' + sentAdaToAddr);
        }
    }
}