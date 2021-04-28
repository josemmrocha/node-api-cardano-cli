const axios = require('axios');
const { signTx, submitTx } = require('./commandController');
var tools = require('./tools/tools');

exports.scanAndSend = function(req, res) {
    var address = req.params.addr;
    res.status(200).send('running');
  
    getUtxos(address).then(
        (responseGetUtxos) => {
            if (responseGetUtxos) {
                responseGetUtxos.forEach(element => {
                    console.log(`Getting inputs for hash: ${element.utxo}`);
                    getOuputsFromUtxo(element.utxo).then(
                        (responseGetOuputsFromUtxo) => {
                            var addressToSend = getEntrantAddress(address, responseGetOuputsFromUtxo);
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
    var url = `http://localhost:4200/api/utxos/${addr}`;

    try {
        let res = await axios.get(url);
        return res.data;
    } catch (error) {
        return undefined;
    }   
}

async function getOuputsFromUtxo(txHash) {
    var url = `http://localhost:4200/api/txUtxos/${txHash}`;

    try {
        let res = await axios.get(url);
        return res.data;
    } catch (error) {
        return undefined;
    }   
}

async function buildTx(fee, available, address, policy, utxo, ix, path) {
    var url = `http://localhost:4200/api/buildTx/${fee}/${available}/${address}/${policy}/${utxo}/${ix}/${path}`;

    try {
        let res = await axios.get(url);
        return res.data;
    } catch (error) {
        return undefined;
    }   
}

async function getFee(path) {
    var url = `http://localhost:4200/api/fee/${path}`;

    try {
        let res = await axios.get(url);
        return res.data;
    } catch (error) {
        return undefined;
    }   
}

async function sign(path) {
    var url = `http://localhost:4200/api/signTx/${path}`;

    try {
        let res = await axios.get(url);
        return res.data;
    } catch (error) {
        return undefined;
    }   
}

async function submit(path) {
    var url = `http://localhost:4200/api/submitTx/${path}`;

    try {
        let res = await axios.get(url);
        return res.data;
    } catch (error) {
        return undefined;
    }   
}

function getEntrantAddress(myAddr, responseGetOuputsFromUtxos) {
    var entrantTx = false;
    var addressToSend = '';
    var responseGetOuputsFromUtxo = JSON.parse(responseGetOuputsFromUtxos);

    if (responseGetOuputsFromUtxo && responseGetOuputsFromUtxo.outputs && responseGetOuputsFromUtxo.outputs.length > 0) {
        responseGetOuputsFromUtxo.outputs.forEach(output => {
            if (output.address === myAddr) { // 10000000 = 10 ADA
                output.amount.forEach(element => {
                    console.log('Addr: ' + output.address + '. Qty: ' + element.quantity);
                    if (element.quantity >= 2000000) {
                        entrantTx = true;
                    }
                });
            } 
        });
        if (entrantTx) {
            var sentAdaToAddr = '';
            responseGetOuputsFromUtxo.outputs.forEach(output => {
                if (output.address !== myAddr && !sentAdaToAddr) {
                    sentAdaToAddr = output.address;
                } 
            });
            console.log(`Send ADA to addr: ${sentAdaToAddr}`);
            addressToSend = sentAdaToAddr;
        }
    }

    return addressToSend;
}

function createAndSendTx(fee, available, address, policy, utxo, ix, path) {
    buildTx(0, available, address, policy, utxo, ix, path).then(
        (responseBuildRaw) => {
            if (responseBuildRaw) {
                getFee(path).then(
                    (responseGetFee) => {
                        if (responseGetFee && responseGetFee !== 0) {
                            buildTx(responseGetFee, available, address, policy, utxo, ix, path).then(
                                (responseBuildTx) => {
                                    if (responseBuildTx) {
                                        signTx(path).then(
                                            (responseSignTx) => {
                                                if (responseSignTx) {
                                                    submitTx(path).then(
                                                        (responseSubmitTx) => {
                                                            if (responseSubmitTx) {
                                    
                                                            }
                                                        },
                                                        (errorSubmitTx) => {
                                                
                                                        }
                                                    );
                                                }
                                            },
                                            (errorSignTx) => {
                                    
                                            }
                                        );
                                    }
                                },
                                (errorBuildTx) => {
                        
                                }
                            );
                        }
                    },
                    (errorGetFee) => {
            
                    }
                );
            }
        },
        (errorBuildRaw) => {

        }
    );
}