const axios = require('axios');
var tools = require('./tools/tools');
const policyIdTestNFT = '79d04870cc49ea029f95e7ad19576981620b4665b921c95f79b2a726';

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

                            if (addressToSend) {
                                createAndSendTx(element.available, address, addressToSend, 
                                    policyIdTestNFT, element.utxo, element.ix, true);
                            }
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

exports.scanAddrTxAndSend = function(req, res) {
    var address = req.params.addr;
    res.status(200).send('running');
  
    getAllTx(address).then(
        (responseGetAllTx) => {
            if (responseGetAllTx) {
                var allTxs = JSON.parse(responseGetAllTx);
                console.log(`There are ${allTxs.length} txs in this address`);
                allTxs.forEach(tx => {
                    console.log(`Getting utxos for tx: ${tx}`);
                    getOuputsFromUtxo(tx).then(
                        (responseGetOuputsFromUtxo) => {
                            var addressToSend = getEntrantAddress(address, responseGetOuputsFromUtxo);

                            if (addressToSend) {
                                getUtxos(address).then(
                                    (responseGetUtxos) => {
                                        if (responseGetUtxos && responseGetUtxos.length > 0) {
                                            var availableUtxos = responseGetUtxos.filter(x => x.available > 3000000); // 10000000 = 10 ADA
                                            console.log('availableUtxos.count: ' + availableUtxos.length);
                                            if (availableUtxos && availableUtxos.length > 0) {
                                                createAndSendTx(availableUtxos[0].available, address, addressToSend, 
                                                    policyIdTestNFT, availableUtxos[0].utxo, availableUtxos[0].ix, true);
                                            }
                                        } else {
                                            res.status(500).send('err');
                                        }
                                    }, 
                                    (errorGetUtxos) => {
                                        res.status(500).send('err');
                                });
                            }
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
        (errorGetAllTx) => {
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

async function getAllTx(addr) {
    var url = `http://localhost:4200/api/getAllTx/${addr}`;

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

async function buildTx(fee, available, nftAddress, paymentAddress, policy, utxo, ix, usePath) {
    var url = `http://localhost:4200/api/buildTx/${fee}/${available}/${nftAddress}/${paymentAddress}/${policy}/${utxo}/${ix}/${usePath}`;

    try {
        let res = await axios.get(url);
        return res.data;
    } catch (error) {
        return undefined;
    }   
}

async function getFee(usePath) {
    var url = `http://localhost:4200/api/fee/${usePath}`;

    try {
        let res = await axios.get(url);
        return res.data;
    } catch (error) {
        return undefined;
    }   
}

async function signTx(usePath) {
    var url = `http://localhost:4200/api/signTx/${usePath}`;

    try {
        let res = await axios.get(url);
        return res.data;
    } catch (error) {
        return undefined;
    }   
}

async function submitTx(usePath) {
    var url = `http://localhost:4200/api/submitTx/${usePath}`;

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
                    if (element.quantity >= 2000000 && element.unit === 'lovelace') {
                        entrantTx = true;
                    }
                });
            } 
        });
        if (entrantTx) {
            var sentAdaToAddr = '';
            responseGetOuputsFromUtxo.outputs.forEach(output => {
                if (output.address !== myAddr && !sentAdaToAddr) {
                    output.amount.forEach(element => {
                        if (element.quantity >= 2000000 && element.unit === 'lovelace' && !sentAdaToAddr) {
                            console.log('Addr: ' + output.address + '. Qty: ' + element.quantity);
                            sentAdaToAddr = output.address;
                        }
                    });
                } 
            });
            addressToSend = sentAdaToAddr;
        }
    }

    return addressToSend;
}

function createAndSendTx(available, nftAddress, paymentAddress, policy, utxo, ix, usePath) {
    console.log(`Going to create and sent Tx. NftAddress: ${nftAddress}. PaymentAddress: ${paymentAddress}.  
        Available: ${available}. Policy: ${policy}.  Utxo: ${utxo}.  ix: ${ix}. UsePath: ${usePath}`);

    buildTx(0, available, nftAddress, paymentAddress, policy, utxo, ix, usePath).then(
        (responseBuildRaw) => {
            if (responseBuildRaw) {
                getFee(usePath).then(
                    (responseGetFee) => {
                        if (responseGetFee && responseGetFee !== 0) {
                            buildTx(responseGetFee, available, nftAddress, paymentAddress, policy, utxo, ix, usePath).then(
                                (responseBuildTx) => {
                                    if (responseBuildTx) {
                                        signTx(usePath).then(
                                            (responseSignTx) => {
                                                if (responseSignTx) {
                                                    submitTx(usePath).then(
                                                        (responseSubmitTx) => {
                                                            if (responseSubmitTx) {
                                                                console.log('SUCCESS SUbmitting Tx');
                                                            }
                                                        },
                                                        (errorSubmitTx) => {
                                                            console.log('Error Submitting Tx');
                                                        }
                                                    );
                                                }
                                            },
                                            (errorSignTx) => {
                                                console.log('Error Signing Fee');
                                            }
                                        );
                                    }
                                },
                                (errorBuildTx) => {
                                    console.log('Error Building Tx');
                                }
                            );
                        }
                    },
                    (errorGetFee) => {
                        console.log('Error Getting Fee');
                    }
                );
            }
        },
        (errorBuildRaw) => {
            console.log('Error Building Raw');
        }
    );
}