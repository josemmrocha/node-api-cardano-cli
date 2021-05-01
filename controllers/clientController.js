const axios = require('axios');
var mysql = require('mysql');
const constants = require('./constants/constants');
const { response } = require('express');
const { createMetadataFile } = require('./commandController');
var tools = require('./tools/tools');
var opts = {
    logFilePath: constants.testNFTPath + 'client.log',
    timestampFormat:'YYYY-MM-DD HH:mm:ss.SSS'
};
const log = require('simple-node-logger').createSimpleLogger(opts);

const policyIdTestNFT = constants.policyIdTestNFT;
const publisherName = constants.publisherName;
var minAvailableQtyInUtxo = constants.minAvailableQtyInUtxo;
var nftPrice = constants.nftPrice;

var con = mysql.createConnection({
    host     : 'localhost',
    user     : 'nft',
    password : 'nftpassword',
    database: 'nft'
});

exports.scanAddrTxMintAndSend = function(req, res) {
    var address = req.params.addr;
    res.status(200).send('running');

    try {
        getAllTx(address).then(
            (responseGetAllTx) => {
                if (responseGetAllTx) {
                    var allTxs = JSON.parse(responseGetAllTx);
                    log.info(`There are ${allTxs.length} txs in this address`);
    
                    if (allTxs && allTxs.length > 0) {
                        con.query('SELECT txHash FROM ProcessedTx;', function (err, rows, fields) {
                            if (err) throw err;
                            var nonProcessedTx = allTxs.filter(x => !rows.includes(x));
                            log.info('Non processed txs: ' + nonProcessedTx.length);
                            if (nonProcessedTx.length > 0) {
                                var tx = nonProcessedTx[0];                      
                                log.info(`Getting utxos for tx: ${tx}`);
                                getOuputsFromUtxo(tx).then(
                                    (responseGetOuputsFromUtxo) => {
                                        var addressToSend = getEntrantAddress(address, responseGetOuputsFromUtxo);
                
                                        if (addressToSend) {
                                            getUtxos(address).then(
                                                (responseGetUtxos) => {
                                                    if (responseGetUtxos && responseGetUtxos.length > 0) {
                                                        var availableUtxos = responseGetUtxos.filter(x => x.available > minAvailableQtyInUtxo);
                                                        log.info('availableUtxos.count: ' + availableUtxos.length);
                                                        // TODO aqui coger no la primera, sino la que de verdad tiene el token.
                                                        if (availableUtxos && availableUtxos.length > 0) {
                                                            selectTokenMintAndSend(availableUtxos[0].available, address, addressToSend, 
                                                                policyIdTestNFT, availableUtxos[0].utxo, availableUtxos[0].ix, true, tx);
                                                        }
                                                    } else {
                                                        log.info('There are no utxos');
                                                    }
                                                }, 
                                                (errorGetUtxos) => {
                                                    log.error(`Error errorGetUtxos: ` + errorGetUtxos);
                                                });
                                        }
                                    },
                                    (errorGetOuputsFromUtxo) => {
                                        log.error(`Error errorGetOuputsFromUtxo: ` + errorGetOuputsFromUtxo);
                                    }
                                );
                            }
                        });
                    }      
                } else {
                    log.info(`There are no tx.`);
                }
            }, 
            (errorGetAllTx) => {
                log.error(`Error errorGetAllTx: ` + errorGetAllTx);
        });
    } catch(error) {
        log.error(`Error main job: ` + error);
    }  
};

exports.scanAddrTxMintAndSend2 = function(req, res) {
    var address = req.params.addr;
    res.status(200).send('running');

    try {
        getUtxos(address).then(
            (responseGetUtxos) => {
                if (responseGetUtxos && responseGetUtxos.length > 0) {
                    var availableUtxos = responseGetUtxos.filter(x => x.available > minAvailableQtyInUtxo);
                    log.info('availableUtxos.count: ' + availableUtxos.length);
                    // TODO aqui coger no la primera, sino la que de verdad tiene el token.
                    if (availableUtxos && availableUtxos.length > 0) {
                        getOuputsFromUtxo(availableUtxos[0].utxo).then(
                            (responseGetOuputsFromUtxo) => {
                                var addressToSend = getEntrantAddress(address, responseGetOuputsFromUtxo);
                                if (addressToSend) {
                                    selectTokenMintAndSend(availableUtxos[0].available, address, addressToSend, 
                                        policyIdTestNFT, availableUtxos[0].utxo, availableUtxos[0].ix, true, availableUtxos[0].utxo);
                                } else {
                                    log.info('No entrantAddr');
                                }
                            },
                            (errorGetOuputsFromUtxo) => {
                                log.error(`Error errorGetOuputsFromUtxo: ` + errorGetOuputsFromUtxo);
                            }
                        );                     
                    }
                } else {
                    log.info('There are no utxos');
                }
            }, 
            (errorGetUtxos) => {
                log.error(`Error errorGetUtxos: ` + errorGetUtxos);
            });
    } catch(error) {
        log.error(`Error main job: ` + error);
    }  
};

exports.sendMintedNotSentTokens = function(req, res) {
    var address = req.params.addr;
    res.status(200).send('running');

    try {
        con.query('SELECT * FROM TestNft Where minted = 1 and addressSent = 0;', function (err, rows, fields) {
            if (err) throw err;
            log.info(`Found ${rows.length} minted not sent token.`);                 
            if (rows && rows.length > 0) {
                sendToken(address, rows[0].paymentAddress, policyIdTestNFT, true, rows[0].identifier, rows[0].txHash);
            }
        });
    } catch(error) {
        log.info(`Error sendMintedNotSentTokens: ${error}.`);                 
    }
};

exports.sendAllUtxosToAddr = function(req, res) {
    var nftAddress = req.params.nftAddress;
    var paymentAddress = req.params.paymentAddress;

    try {
        getUtxos(nftAddress).then(
            (responseGetUtxos) => {
                if (responseGetUtxos && responseGetUtxos.length > 0) {
                    log.info('availableUtxos.count: ' + responseGetUtxos.length);
                    if (responseGetUtxos && responseGetUtxos.length > 0) { // TODO ojo, wuedan como available 0?
                        var request = {
                            fee: 0,
                            paymentAddress: paymentAddress,
                            usePath: true,
                            utxoInfoList: responseGetUtxos
                        };
    
                        log.info(`Going to send multiple inputs tx to ${paymentAddress}`);             
    
                        buildTxMultipleInputs(request).then(
                            (responseBuildRaw) => {
                                if (responseBuildRaw) {
                                    getFee(responseGetUtxos.length, 1, 1, true).then(
                                        (responseGetFee) => {
                                            if (responseGetFee && responseGetFee !== 0) {
                                                var request = {
                                                    fee: responseGetFee,
                                                    paymentAddress: paymentAddress,
                                                    usePath: true,
                                                    utxoInfoList: responseGetUtxos
                                                };
                                                buildTxMultipleInputs(request).then(
                                                    (responseBuildTx) => {
                                                        if (responseBuildTx) {
                                                            signTx(true).then(
                                                                (responseSignTx) => {
                                                                    if (responseSignTx) {
                                                                        submitTx(true).then(
                                                                            (responseSubmitTx) => {
                                                                                if (responseSubmitTx) {
                                                                                    log.info('SUCCESS Sending Tx');
                                                                                }
                                                                            },
                                                                            (errorSubmitTx) => {
                                                                                log.error('Error Submitting Tx');
                                                                            }
                                                                        );
                                                                    }
                                                                },
                                                                (errorSignTx) => {
                                                                    log.error('Error Signing Fee');
                                                                }
                                                            );
                                                        }
                                                    },
                                                    (errorBuildTx) => {
                                                        log.error('Error Building Tx');
                                                    }
                                                );
                                            }
                                        },
                                        (errorGetFee) => {
                                            log.error('Error Getting Fee');
                                        }
                                    );
                                }
                            },
                            (errorBuildRaw) => {
                                log.error('Error Building Raw');
                            }
                        );
                    }
                } else {
                    log.info('There are no utxos');
                }
            }, 
            (errorGetUtxos) => {
                log.error('Error Getting utxos');
            });
    } catch(error) {
        log.error('Error sendAllUtxosToAddr: ' + error);
    }

    res.status(200).send('running');
}

exports.testWebDB = function(req, res) {
    try{
        var testCon = mysql.createConnection({
            host     : 'cardanochess.com',
            user     : 'xxx',
            password : 'xxx',
            database: 'xxx'
        });
        testCon.query(`Select * from ProcessedTx;`, function (err, rows, fields) {
            if (err) throw err;
            log.info('Inserted ProcessedTx: ');
            res.status(200).send(rows);
        });
    } catch(error) {
        res.status(500).send(error);
    }
}

async function getUtxos(addr) {
    var url = `http://localhost:4200/api/utxos/${addr}`;

    try {
        let res = await axios.get(url);
        return res.data;
    } catch (error) {
        log.error('Error in getUtxos call: ' + error);
        return undefined;
    }   
}

async function getAllTx(addr) {
    var url = `http://localhost:4200/api/getAllTx/${addr}`;

    try {
        let res = await axios.get(url);
        return res.data;
    } catch (error) {
        log.error('Error in getAllTx call: ' + error);
        return undefined;
    }   
}

async function getOuputsFromUtxo(txHash) {
    var url = `http://localhost:4200/api/txUtxos/${txHash}`;

    try {
        let res = await axios.get(url);
        return res.data;
    } catch (error) {
        log.error('Error in getOuputsFromUtxo call: ' + error);
        return undefined;
    }   
}

async function buildTx(fee, available, nftAddress, paymentAddress, policy, utxo, ix, usePath) {
    var url = `http://localhost:4200/api/buildTx/${fee}/${available}/${nftAddress}/${paymentAddress}/${policy}/${utxo}/${ix}/${usePath}`;

    try {
        let res = await axios.get(url);
        return res.data;
    } catch (error) {
        log.error('Error in buildTx call: ' + error);
        return undefined;
    }   
}

async function buildTxMint(fee, available, address, policy, utxo, ix, usePath, nftIdentifier) {
    var url = `http://localhost:4200/api/buildTxMint/${fee}/${available}/${address}/${policy}/${utxo}/${ix}/${usePath}/${nftIdentifier}`;

    try {
        let res = await axios.get(url);
        return res.data;
    } catch (error) {
        log.error('Error in buildTxMint call: ' + error);
        return undefined;
    }   
}

async function buildTxWithToken(fee, available, nftAddress, paymentAddress, policy, utxo, ix, usePath, nftIdentifier) {
    var url = `http://localhost:4200/api/buildTxWithToken/${fee}/${available}/${nftAddress}/${paymentAddress}/${policy}/${utxo}/${ix}/${usePath}/${nftIdentifier}`;

    try {
        let res = await axios.get(url);
        return res.data;
    } catch (error) {
        log.error('Error in buildTxWithToken call: ' + error);
        return undefined;
    }   
}

async function buildTxMultipleInputs(request) {
    var url = `http://localhost:4200/api/buildTxMultipleInputs/`;

    try {
        let res = await axios.post(url, request);
        return res.data;
    } catch (error) {
        log.error('Error in buildTxMultipleInputs call: ' + error);
        return undefined;
    }   
}

async function buildTxRefund(fee, available, paymentAddress, utxo, ix, usePath) {
    var url = `http://localhost:4200/api/buildTxRefund/${fee}/${available}/${paymentAddress}/${utxo}/${ix}/${usePath}`;

    try {
        let res = await axios.get(url);
        return res.data;
    } catch (error) {
        log.error('Error in buildTxRefund call: ' + error);
        return undefined;
    }   
}

async function getFee(inTxCount, outTxCount, witnessCount, usePath) {
    var url = `http://localhost:4200/api/fee/${inTxCount}/${outTxCount}/${witnessCount}/${usePath}`;

    try {
        let res = await axios.get(url);
        return res.data;
    } catch (error) {
        log.error('Error in getFee call: ' + error);
        return undefined;
    }   
}

async function signTx(usePath) {
    var url = `http://localhost:4200/api/signTx/${usePath}`;

    try {
        let res = await axios.get(url);
        return res.data;
    } catch (error) {
        log.error('Error in signTx call: ' + error);
        return undefined;
    }   
}

async function signTxMint(usePath) {
    var url = `http://localhost:4200/api/signTxMint/${usePath}`;

    try {
        let res = await axios.get(url);
        return res.data;
    } catch (error) {
        log.error('Error in signTxMint call: ' + error);
        return undefined;
    }   
}

async function submitTx(usePath) {
    var url = `http://localhost:4200/api/submitTx/${usePath}`;

    try {
        let res = await axios.get(url);
        return res.data;
    } catch (error) {
        log.error('Error in submitTx call: ' + error);
        return undefined;
    }   
}

async function createmetadataFile(jsonstr, usePath) {
    var url = `http://localhost:4200/api/createMetadataFile/${jsonstr}/${usePath}`;

    try {
        let res = await axios.post(url, JSON.parse(jsonstr));
        return res.data;
    } catch (error) {
        log.error('Error in createmetadataFile call: ' + error);
        return undefined;
    }   
}

async function getLastUtxo(usePath) {
    var url = `http://localhost:4200/api/getLastUtxo/${usePath}`;

    try {
        let res = await axios.get(url);
        return res.data ? res.data.trim() : '';
    } catch (error) {
        log.error('Error in getLastUtxo call: ' + error);
        return undefined;
    }   
}

function getEntrantAddress(myAddr, responseGetOuputsFromUtxos) {
    var entrantTx = false;
    var addressToSend = '';
    try {
        var responseGetOuputsFromUtxo = JSON.parse(responseGetOuputsFromUtxos);

        if (responseGetOuputsFromUtxo && responseGetOuputsFromUtxo.outputs && responseGetOuputsFromUtxo.outputs.length > 0) {
            responseGetOuputsFromUtxo.outputs.forEach(output => {
                if (output.address === myAddr) {
                    output.amount.forEach(element => {
                        if (element.quantity >= nftPrice && element.unit === 'lovelace') {
                            entrantTx = true;
                        } else {
                            log.info(`Not enough qty sent to addr: ${element.quantity}. (unit: ${element.unit})`);
                        }
                    });
                } 
            });
            if (entrantTx) {
                var sentAdaToAddr = '';
                responseGetOuputsFromUtxo.outputs.forEach(output => {
                    if (output.address !== myAddr && !sentAdaToAddr) {
                        output.amount.forEach(element => {
                            if (element.unit === 'lovelace' && !sentAdaToAddr) {
                                log.info('Addr: ' + output.address + '. Qty: ' + element.quantity);
                                sentAdaToAddr = output.address;
                            }
                        });
                    } 
                });
                addressToSend = sentAdaToAddr;
            }
        }
    } catch(error) {
        log.error('Error getEntrantAddress: ' + error);
    }
    
    return addressToSend;
}

function createAndSendTx(available, nftAddress, paymentAddress, policy, utxo, ix, usePath) {
    log.info(`Going to create and sent Tx. NftAddress: ${nftAddress}. PaymentAddress: ${paymentAddress}.  
        Available: ${available}. Policy: ${policy}.  Utxo: ${utxo}.  ix: ${ix}. UsePath: ${usePath}`);

    buildTx(0, available, nftAddress, paymentAddress, policy, utxo, ix, usePath).then(
        (responseBuildRaw) => {
            if (responseBuildRaw) {
                getFee(1, 1, 2, usePath).then(
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
                                                                log.info('SUCCESS SUbmitting Tx');
                                                            }
                                                        },
                                                        (errorSubmitTx) => {
                                                            log.error('Error Submitting Tx');
                                                        }
                                                    );
                                                }
                                            },
                                            (errorSignTx) => {
                                                log.error('Error Signing Fee');
                                            }
                                        );
                                    }
                                },
                                (errorBuildTx) => {
                                    log.error('Error Building Tx');
                                }
                            );
                        }
                    },
                    (errorGetFee) => {
                        log.error('Error Getting Fee');
                    }
                );
            }
        },
        (errorBuildRaw) => {
            log.error('Error Building Raw');
        }
    );
}

function selectTokenMintAndSend(available, addressForNft, paymentAddress, policy, utxo, ix, usePath, txHash) {
    con.query('SELECT * FROM TestNft Where minted = 0;', function (err, rows, fields) {
        if (err) throw err;
        var nonProcessedNfts = rows;
        log.info('NonProcessedNfts: ' + nonProcessedNfts.length);

        if (nonProcessedNfts.length === 0) {
            log.info('No more Tokens. NEEDED REFUND to Address: ' + paymentAddress);
            refund(available, addressForNft, paymentAddress, utxo, ix, usePath);
        } else {
            var randomNftFromNonProcessed = nonProcessedNfts.length === 1 ? nonProcessedNfts[0] : nonProcessedNfts[Math.floor(Math.random() * nonProcessedNfts.length)];
            log.info('Random TestNft Selected. Identifier: ' + randomNftFromNonProcessed.identifier);

            mintandSendToken(available, addressForNft, paymentAddress, policy, utxo, ix, usePath,
                randomNftFromNonProcessed.identifier, randomNftFromNonProcessed.name,
                randomNftFromNonProcessed.image, randomNftFromNonProcessed.location, txHash);
        }      
    });
}

function mintandSendToken(available, addressForNft, paymentAddress, policy, utxo, ix, usePath, nftIdentifier, name, imagePath, location, txHash) {
    log.info(`Going to mint token. Address: ${addressForNft}. Available: ${available}. Policy: ${policy}.  Utxo: ${utxo}.  ix: ${ix}. UsePath: ${usePath}. NftIdentifier: ${nftIdentifier}.`);

    var metadata = getMintMetadata(policy, publisherName, nftIdentifier, name, imagePath, location);
    log.info('Metadata: ' + metadata);

    createmetadataFile(metadata, usePath).then(
        (createMetadataFileResponse) => {
            if (createMetadataFileResponse) {
                buildTxMint(0, available, addressForNft, policy, utxo, ix, usePath, nftIdentifier).then(
                    (responseBuildRaw) => {
                        if (responseBuildRaw) {
                            getFee(1, 1, 2, usePath).then(
                                (responseGetFee) => {
                                    if (responseGetFee && responseGetFee !== 0) {
                                        buildTxMint(responseGetFee, available, addressForNft, policy, utxo, ix, usePath, nftIdentifier).then(
                                            (responseBuildTx) => {
                                                if (responseBuildTx) {
                                                    signTxMint(usePath).then(
                                                        (responseSignTx) => {
                                                            if (responseSignTx) {
                                                                submitTx(usePath).then(
                                                                    (responseSubmitTx) => {
                                                                        if (responseSubmitTx) {
                                                                            log.info('SUCCESS Minting TOKEN');
                                                                            con.query(`INSERT INTO ProcessedTx (txHash) VALUES ('${txHash}');`, function (err, rows, fields) {
                                                                                if (err) throw err;
                                                                                log.info('Inserted ProcessedTx: ' + txHash);
                                                                            });
                                                                            const updateQuery = `UPDATE TestNft SET minted = true, paymentAddress = '${paymentAddress}', txHash = '${txHash}' WHERE identifier = '${nftIdentifier}';`;
                                                                            log.info('Update query' + updateQuery);
                                                                            con.query(updateQuery, function (err, result) {
                                                                                if (err) throw err;
                                                                                log.info(result.affectedRows + " record(s) updated (TestNft)");
                                                                                sendToken2(available, addressForNft, paymentAddress, policy, usePath, nftIdentifier, txHash, responseGetFee);
                                                                                // setTimeout(function () {
                                                                                //     sendToken(addressForNft, paymentAddress, policy, usePath, nftIdentifier, txHash);   
                                                                                // }, 40000);
                                                                            });
                                                                        }
                                                                    },
                                                                    (errorSubmitTx) => {
                                                                        log.error('Error Submitting Tx');
                                                                    }
                                                                );
                                                            }
                                                        },
                                                        (errorSignTx) => {
                                                            log.error('Error Signing Fee');
                                                        }
                                                    );
                                                }
                                            },
                                            (errorBuildTx) => {
                                                log.error('Error Building Tx');
                                            }
                                        );
                                    }
                                },
                                (errorGetFee) => {
                                    log.error('Error Getting Fee');
                                }
                            );
                        }
                    },
                    (errorBuildRaw) => {
                        log.error('Error Building Raw');
                    }
                );
            }
        },
        (createMetadataFileError) => {
            log.error('Error creating metadata file');
        }
    );
}

function sendToken(nftAddress, paymentAddress, policy, usePath, nftIdentifier, txHash) {
    getUtxos(nftAddress).then(
        (responseGetUtxos) => {
            if (responseGetUtxos && responseGetUtxos.length > 0) {
                var availableUtxos = responseGetUtxos.filter(x => x.available > minAvailableQtyInUtxo); //TODO add && contains token
                log.info('availableUtxos.count: ' + availableUtxos.length);
                if (availableUtxos && availableUtxos.length > 0) {
                    var available = availableUtxos[0].available;
                    var ix = availableUtxos[0].ix;
                    var utxo = availableUtxos[0].utxo;
                    log.info(`Going to send token. NftAddress: ${nftAddress}. PaymentAddress: ${paymentAddress}. Available: ${available}. Policy: ${policy}.  Utxo: ${utxo}.  ix: ${ix}. UsePath: ${usePath}. NftIdentifier: ${nftIdentifier}`);             

                    buildTxWithToken(0, available, nftAddress, paymentAddress, policy, utxo, ix, usePath, nftIdentifier).then(
                        (responseBuildRaw) => {
                            if (responseBuildRaw) {
                                getFee(1, 2, 1,usePath).then(
                                    (responseGetFee) => {
                                        if (responseGetFee && responseGetFee !== 0) {
                                            buildTxWithToken(responseGetFee, available, nftAddress, paymentAddress, policy, utxo, ix, usePath, nftIdentifier).then(
                                                (responseBuildTx) => {
                                                    if (responseBuildTx) {
                                                        signTx(usePath).then(
                                                            (responseSignTx) => {
                                                                if (responseSignTx) {
                                                                    submitTx(usePath).then(
                                                                        (responseSubmitTx) => {
                                                                            if (responseSubmitTx) {
                                                                                log.info('SUCCESS Sending Tx');

                                                                                con.query(`UPDATE TestNft SET addressSent = true WHERE identifier = '${nftIdentifier}';`, function (err, result) {
                                                                                    if (err) throw err;
                                                                                    log.info(result.affectedRows + " record(s) updated (TestNft)");
                                                                                });
                                                                            }
                                                                        },
                                                                        (errorSubmitTx) => {
                                                                            log.error('Error Submitting Tx');
                                                                        }
                                                                    );
                                                                }
                                                            },
                                                            (errorSignTx) => {
                                                                log.error('Error Signing Fee');
                                                            }
                                                        );
                                                    }
                                                },
                                                (errorBuildTx) => {
                                                    log.error('Error Building Tx');
                                                }
                                            );
                                        }
                                    },
                                    (errorGetFee) => {
                                        log.error('Error Getting Fee');
                                    }
                                );
                            }
                        },
                        (errorBuildRaw) => {
                            log.error('Error Building Raw');
                        }
                    );
                }
            }
        }, 
        (errorGetUtxos) => {
            log.error('Error Getting utxos');
        });
}

function sendToken2(orinalAvailable, nftAddress, paymentAddress, policy, usePath, nftIdentifier, txHash, mintTokenFee) {
    getLastUtxo(usePath).then(
        (responseGetLastUtxo) => {
            if (responseGetLastUtxo) {          
                    var ix = 0;
                    var utxo = responseGetLastUtxo;
                    var available = orinalAvailable - mintTokenFee;
                    log.info(`Going to send token from NftAddress: ${nftAddress} to PaymentAddress: ${paymentAddress} and RecievedPaymentAddr: ${constants.recievePaymentsAddr}. Available: ${available}. Policy: ${policy}.  Utxo: ${utxo}.  ix: ${ix}. UsePath: ${usePath}. NftIdentifier: ${nftIdentifier}`);             
            
                    buildTxWithToken(0, available, constants.recievePaymentsAddr, paymentAddress, policy, utxo, ix, usePath, nftIdentifier).then(
                        (responseBuildRaw) => {
                            if (responseBuildRaw) {
                                getFee(1, 2, 1,usePath).then(
                                    (responseGetFee) => {
                                        if (responseGetFee && responseGetFee !== 0) {
                                            buildTxWithToken(responseGetFee, available, constants.recievePaymentsAddr, paymentAddress, policy, utxo, ix, usePath, nftIdentifier).then(
                                                (responseBuildTx) => {
                                                    if (responseBuildTx) {
                                                        signTx(usePath).then(
                                                            (responseSignTx) => {
                                                                if (responseSignTx) {
                                                                    submitTx(usePath).then(
                                                                        (responseSubmitTx) => {
                                                                            if (responseSubmitTx) {
                                                                                log.info('SUCCESS Sending Tx');

                                                                                con.query(`UPDATE TestNft SET addressSent = true WHERE identifier = '${nftIdentifier}';`, function (err, result) {
                                                                                    if (err) throw err;
                                                                                    log.info(result.affectedRows + " record(s) updated (TestNft)");
                                                                                });
                                                                            }
                                                                        },
                                                                        (errorSubmitTx) => {
                                                                            log.error('Error Submitting Tx');
                                                                        }
                                                                    );
                                                                }
                                                            },
                                                            (errorSignTx) => {
                                                                log.error('Error Signing Fee');
                                                            }
                                                        );
                                                    }
                                                },
                                                (errorBuildTx) => {
                                                    log.error('Error Building Tx');
                                                }
                                            );
                                        }
                                    },
                                    (errorGetFee) => {
                                        log.error('Error Getting Fee');
                                    }
                                );
                            }
                        },
                        (errorBuildRaw) => {
                            log.error('Error Building Raw');
                        }
                    );
            }
        }, 
        (errorGetLastUtxo) => {
            log.error('Error getiing last utxo Raw');
    });
}

function refund(available, nftAddress, paymentAddress, utxo, ix, usePath) {
    log.info(`Going to send REFUND from NftAddress: ${nftAddress} to PaymentAddress: ${paymentAddress}. Available: ${available}. Utxo: ${utxo}.  ix: ${ix}. UsePath: ${usePath}.`);             
            
    buildTxRefund(0, available, paymentAddress, utxo, ix, usePath).then(
        (responseBuildRaw) => {
            if (responseBuildRaw) {
                getFee(1, 1, 1,usePath).then(
                    (responseGetFee) => {
                        if (responseGetFee && responseGetFee !== 0) {
                            buildTxRefund(responseGetFee, available, paymentAddress, utxo, ix, usePath).then(
                                (responseBuildTx) => {
                                    if (responseBuildTx) {
                                        signTx(usePath).then(
                                            (responseSignTx) => {
                                                if (responseSignTx) {
                                                    submitTx(usePath).then(
                                                        (responseSubmitTx) => {
                                                            if (responseSubmitTx) {
                                                                log.info('SUCCESS Refunding Tx');
                                                            }
                                                        },
                                                        (errorSubmitTx) => {
                                                            log.error('Error Submitting Tx');
                                                        }
                                                    );
                                                }
                                            },
                                            (errorSignTx) => {
                                                log.error('Error Signing Fee');
                                            }
                                        );
                                    }
                                },
                                (errorBuildTx) => {
                                    log.error('Error Building Tx');
                                }
                            );
                        }
                    },
                    (errorGetFee) => {
                        log.error('Error Getting Fee');
                    }
                );
            }
        },
        (errorBuildRaw) => {
            log.error('Error Building Raw');
        }
    );
}

function getMintMetadata(policyId, publisher, nftIdentifier, name, imagePath, location) {
    var str = `{"721":{"${policyId}":{"publisher":"${publisher}","${nftIdentifier}":{"name":"${name}","image":"${imagePath}","location":"${location}"}}}}`;
    return str;
}