const axios = require('axios');
var mysql = require('mysql');
const constants = require('./constants/constants');
const { response } = require('express');
const { createMetadataFile } = require('./commandController');
var tools = require('./tools/tools');
var opts = {
    logFilePath: constants.testNFTPath + 'project.log',
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

exports.scanAndSend = function(req, res) {
    var address = req.params.addr;
    res.status(200).send('running');
  
    getUtxos(address).then(
        (responseGetUtxos) => {
            if (responseGetUtxos) {
                responseGetUtxos.forEach(element => {
                    console.log(`Getting inputs for hash: ${element.utxo}`);
                    log.info(`Getting inputs for hash: ${element.utxo}`);

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
                log.info(`There are ${allTxs.length} txs in this address`);

                if (allTxs && allTxs.length > 0) {
                    allTxs.forEach(tx => {
                        console.log(`Getting utxos for tx: ${tx}`);
                        log.info(`Getting utxos for tx: ${tx}`);
                        getOuputsFromUtxo(tx).then(
                            (responseGetOuputsFromUtxo) => {
                                var addressToSend = getEntrantAddress(address, responseGetOuputsFromUtxo);
    
                                if (addressToSend) {
                                    getUtxos(address).then(
                                        (responseGetUtxos) => {
                                            if (responseGetUtxos && responseGetUtxos.length > 0) {
                                                var availableUtxos = responseGetUtxos.filter(x => x.available > minAvailableQtyInUtxo); 
                                                console.log('availableUtxos.count: ' + availableUtxos.length);
                                                log.info('availableUtxos.count: ' + availableUtxos.length);
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
                }
            } else {
                res.status(500).send('err');
            }
        }, 
        (errorGetAllTx) => {
            res.status(500).send('err');
    });
};

exports.scanAddrTxMintAndSend = function(req, res) {
    var address = req.params.addr;
    res.status(200).send('running');
  
    getAllTx(address).then(
        (responseGetAllTx) => {
            if (responseGetAllTx) {
                var allTxs = JSON.parse(responseGetAllTx);
                console.log(`There are ${allTxs.length} txs in this address`);
                log.info(`There are ${allTxs.length} txs in this address`);

                if (allTxs && allTxs.length > 0) {
                    con.query('SELECT txHash FROM ProcessedTx;', function (err, rows, fields) {
                        if (err) throw err;
                        var nonProcessedTx = allTxs.filter(x => !rows.includes(x));
                        console.log('Non processed txs: ' + nonProcessedTx.length);
                        log.info('Non processed txs: ' + nonProcessedTx.length);
                        if (nonProcessedTx.length > 0) {
                            var tx = nonProcessedTx[0];                      
                            console.log(`Getting utxos for tx: ${tx}`);
                            log.info(`Getting utxos for tx: ${tx}`);
                            getOuputsFromUtxo(tx).then(
                                (responseGetOuputsFromUtxo) => {
                                    var addressToSend = getEntrantAddress(address, responseGetOuputsFromUtxo);
            
                                    if (addressToSend) {
                                        getUtxos(address).then(
                                            (responseGetUtxos) => {
                                                if (responseGetUtxos && responseGetUtxos.length > 0) {
                                                    var availableUtxos = responseGetUtxos.filter(x => x.available > minAvailableQtyInUtxo);
                                                    console.log('availableUtxos.count: ' + availableUtxos.length);
                                                    log.info('availableUtxos.count: ' + availableUtxos.length);
                                                    // TODO aqui coger no la primera, sino la que de verdad tiene el token.
                                                    if (availableUtxos && availableUtxos.length > 0) {
                                                        selectTokenMintAndSend(availableUtxos[0].available, address, addressToSend, 
                                                            policyIdTestNFT, availableUtxos[0].utxo, availableUtxos[0].ix, true, tx);
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
                        }
                    });
                }      
            } else {
                console.log(`There are no tx.`);
                log.info(`There are no tx.`);
            }
        }, 
        (errorGetAllTx) => {
            console.log(`Error errorGetAllTx: ` + errorGetAllTx);
            log.error(`Error errorGetAllTx: ` + errorGetAllTx);
    });
};

exports.sendMintedNotSentTokens = function(req, res) {
    var address = req.params.addr;
    res.status(200).send('running');

    con.query('SELECT * FROM TestNft Where minted = 1 and addressSent = 0;', function (err, rows, fields) {
        if (err) throw err;
        console.log(`Found ${rows.length} minted not sent token.`);     
        log.info(`Found ${rows.length} minted not sent token.`);                 
        if (rows && rows.length > 0) {
            sendToken(address, rows[0].paymentAddress, policyIdTestNFT, true, rows[0].identifier, rows[0].txHash);
        }
    });
};

exports.getProcessedTx = function(req, res) {
    con.query('SELECT * FROM ProcessedTx;', function (err, rows, fields) {
        if (err) throw err;
        console.log('PROCESSED RESULT');
        console.log(rows);
    });

    con.query('SELECT * FROM TestNft;', function (err, rows, fields) {
        if (err) throw err;
        console.log('TestNft RESULT');
        console.log(rows);
        var nonProcessedNfts = rows.filter(x => x.minted !== true);
        var randomNftFromNonProcessed = nonProcessedNfts[Math.floor(Math.random() * nonProcessedNfts.length)];
        console.log('Random TestNft');
        console.log(randomNftFromNonProcessed.name);

        var txHash = 'test';
        con.query(`INSERT INTO ProcessedTx (txHash) VALUES ('${txHash}');`, function (err, rows, fields) {
            if (err) throw err;
            console.log('Inserted ProcessedTx: ' + txHash);
        });
    });

    

    var nftName = 'NFTest01';
    con.query(`UPDATE TestNft SET minted = true WHERE name = '${nftName}';`, function (err, result) {
        if (err) throw err;
        console.log(result.affectedRows + " record(s) updated");
    });

    var nftName = 'NFTest01';
    var addressSent = 'afadf';
    con.query(`UPDATE TestNft SET addressSent = '${addressSent}' WHERE name = '${nftName}';`, function (err, result) {
        if (err) throw err;
        console.log(result.affectedRows + " record(s) updated");
    });

    res.status(200).send('running');
}

exports.sendAllUtxosToAddr = function(req, res) {
    var nftAddress = req.params.nftAddress;
    var paymentAddress = req.params.paymentAddress;

    getUtxos(nftAddress).then(
        (responseGetUtxos) => {
            if (responseGetUtxos && responseGetUtxos.length > 0) {
                console.log('availableUtxos.count: ' + responseGetUtxos.length);
                log.info('availableUtxos.count: ' + responseGetUtxos.length);
                if (responseGetUtxos && responseGetUtxos.length > 0) { // TODO ojo, wuedan como available 0?
                    var request = {
                        fee: 0,
                        paymentAddress: paymentAddress,
                        usePath: true,
                        utxoInfoList: responseGetUtxos
                    };

                    console.log(`Going to send multiple inputs tx to ${paymentAddress}`);             
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
                                                                                console.log('SUCCESS Sending Tx');
                                                                                log.info('SUCCESS Sending Tx');
                                                                            }
                                                                        },
                                                                        (errorSubmitTx) => {
                                                                            console.log('Error Submitting Tx');
                                                                            log.error('Error Submitting Tx');
                                                                        }
                                                                    );
                                                                }
                                                            },
                                                            (errorSignTx) => {
                                                                console.log('Error Signing Fee');
                                                                log.error('Error Signing Fee');
                                                            }
                                                        );
                                                    }
                                                },
                                                (errorBuildTx) => {
                                                    console.log('Error Building Tx');
                                                    log.error('Error Building Tx');
                                                }
                                            );
                                        }
                                    },
                                    (errorGetFee) => {
                                        console.log('Error Getting Fee');
                                        log.error('Error Getting Fee');
                                    }
                                );
                            }
                        },
                        (errorBuildRaw) => {
                            console.log('Error Building Raw');
                            log.error('Error Building Raw');
                        }
                    );
                }
            }
        }, 
        (errorGetUtxos) => {
            console.log('Error Getting utxos');
            log.error('Error Getting utxos');
        });

    res.status(200).send('running');
}

async function getUtxos(addr) {
    var url = `http://localhost:4200/api/utxos/${addr}`;

    try {
        let res = await axios.get(url);
        return res.data;
    } catch (error) {
        console.log('Error in getUtxos call: ' + error);
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
        console.log('Error in getAllTx call: ' + error);
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
        console.log('Error in getOuputsFromUtxo call: ' + error);
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
        console.log('Error in buildTx call: ' + error);
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
        console.log('Error in buildTxMint call: ' + error);
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
        console.log('Error in buildTxWithToken call: ' + error);
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
        console.log('Error in buildTxMultipleInputs call: ' + error);
        log.error('Error in buildTxMultipleInputs call: ' + error);
        return undefined;
    }   
}

async function getFee(inTxCount, outTxCount, witnessCount, usePath) {
    var url = `http://localhost:4200/api/fee/${inTxCount}/${outTxCount}/${witnessCount}/${usePath}`;

    try {
        let res = await axios.get(url);
        return res.data;
    } catch (error) {
        console.log('Error in getFee call: ' + error);
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
        console.log('Error in signTx call: ' + error);
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
        console.log('Error in signTxMint call: ' + error);
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
        console.log('Error in submitTx call: ' + error);
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
        console.log('Error in createmetadataFile call: ' + error);
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
        console.log('Error in getLastUtxo call: ' + error);
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
                        }
                    });
                } 
            });
            if (entrantTx) {
                var sentAdaToAddr = '';
                responseGetOuputsFromUtxo.outputs.forEach(output => {
                    if (output.address !== myAddr && !sentAdaToAddr) {
                        output.amount.forEach(element => {
                            if (element.quantity >= nftPrice && element.unit === 'lovelace' && !sentAdaToAddr) {
                                console.log('Addr: ' + output.address + '. Qty: ' + element.quantity);
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
        console.log('Error getEntrantAddress: ' + error);
        log.error('Error getEntrantAddress: ' + error);
    }
    
    return addressToSend;
}

function createAndSendTx(available, nftAddress, paymentAddress, policy, utxo, ix, usePath) {
    console.log(`Going to create and sent Tx. NftAddress: ${nftAddress}. PaymentAddress: ${paymentAddress}.  
        Available: ${available}. Policy: ${policy}.  Utxo: ${utxo}.  ix: ${ix}. UsePath: ${usePath}`);
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
                                                                console.log('SUCCESS SUbmitting Tx');
                                                                log.info('SUCCESS SUbmitting Tx');
                                                            }
                                                        },
                                                        (errorSubmitTx) => {
                                                            console.log('Error Submitting Tx');
                                                            log.error('Error Submitting Tx');
                                                        }
                                                    );
                                                }
                                            },
                                            (errorSignTx) => {
                                                console.log('Error Signing Fee');
                                                log.error('Error Signing Fee');
                                            }
                                        );
                                    }
                                },
                                (errorBuildTx) => {
                                    console.log('Error Building Tx');
                                    log.error('Error Building Tx');
                                }
                            );
                        }
                    },
                    (errorGetFee) => {
                        console.log('Error Getting Fee');
                        log.error('Error Getting Fee');
                    }
                );
            }
        },
        (errorBuildRaw) => {
            console.log('Error Building Raw');
            log.error('Error Building Raw');
        }
    );
}

function selectTokenMintAndSend(available, addressForNft, paymentAddress, policy, utxo, ix, usePath, txHash) {
    con.query('SELECT * FROM TestNft Where minted = 0;', function (err, rows, fields) {
        if (err) throw err;
        var nonProcessedNfts = rows;
        console.log('NonProcessedNfts: ' + nonProcessedNfts.length);
        log.info('NonProcessedNfts: ' + nonProcessedNfts.length);

        if (nonProcessedNfts.length === 0) {
            // TODO aqui meter logica para que devuelva si ya no hay tokens.
            console.log('No more Tokens. NEEDED REFUND to Address: ' + paymentAddress);
            log.info('No more Tokens. NEEDED REFUND to Address: ' + paymentAddress);
        } else {
            var randomNftFromNonProcessed = nonProcessedNfts.length === 1 ? nonProcessedNfts[0] : nonProcessedNfts[Math.floor(Math.random() * nonProcessedNfts.length)];
            console.log('Random TestNft Selected. Identifier: ' + randomNftFromNonProcessed.identifier);
            log.info('Random TestNft Selected. Identifier: ' + randomNftFromNonProcessed.identifier);

            mintandSendToken(available, addressForNft, paymentAddress, policy, utxo, ix, usePath,
                randomNftFromNonProcessed.identifier, randomNftFromNonProcessed.name,
                randomNftFromNonProcessed.image, randomNftFromNonProcessed.location, txHash);
        }      
    });
}

function mintandSendToken(available, addressForNft, paymentAddress, policy, utxo, ix, usePath, nftIdentifier, name, imagePath, location, txHash) {
    console.log(`Going to mint token. Address: ${addressForNft}. Available: ${available}. Policy: ${policy}.  Utxo: ${utxo}.  ix: ${ix}. UsePath: ${usePath}. NftIdentifier: ${nftIdentifier}.`);
    log.info(`Going to mint token. Address: ${addressForNft}. Available: ${available}. Policy: ${policy}.  Utxo: ${utxo}.  ix: ${ix}. UsePath: ${usePath}. NftIdentifier: ${nftIdentifier}.`);

    var metadata = getMintMetadata(policy, publisherName, nftIdentifier, name, imagePath, location);
    console.log('Metadata: ' + metadata);
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
                                                                            console.log('SUCCESS Minting TOKEN');
                                                                            log.info('SUCCESS Minting TOKEN');
                                                                            con.query(`INSERT INTO ProcessedTx (txHash) VALUES ('${txHash}');`, function (err, rows, fields) {
                                                                                if (err) throw err;
                                                                                console.log('Inserted ProcessedTx: ' + txHash);
                                                                                log.info('Inserted ProcessedTx: ' + txHash);
                                                                            });
                                                                            const updateQuery = `UPDATE TestNft SET minted = true, paymentAddress = '${paymentAddress}', txHash = '${txHash}' WHERE identifier = '${nftIdentifier}';`;
                                                                            console.log('Update query' + updateQuery);
                                                                            log.info('Update query' + updateQuery);
                                                                            con.query(updateQuery, function (err, result) {
                                                                                if (err) throw err;
                                                                                console.log(result.affectedRows + " record(s) updated (TestNft)");
                                                                                log.info(result.affectedRows + " record(s) updated (TestNft)");
                                                                                sendToken2(available, addressForNft, paymentAddress, policy, usePath, nftIdentifier, txHash, responseGetFee);
                                                                                // setTimeout(function () {
                                                                                //     sendToken(addressForNft, paymentAddress, policy, usePath, nftIdentifier, txHash);   
                                                                                // }, 40000);
                                                                            });
                                                                        }
                                                                    },
                                                                    (errorSubmitTx) => {
                                                                        console.log('Error Submitting Tx');
                                                                        log.error('Error Submitting Tx');
                                                                    }
                                                                );
                                                            }
                                                        },
                                                        (errorSignTx) => {
                                                            console.log('Error Signing Fee');
                                                            log.error('Error Signing Fee');
                                                        }
                                                    );
                                                }
                                            },
                                            (errorBuildTx) => {
                                                console.log('Error Building Tx');
                                                log.error('Error Building Tx');
                                            }
                                        );
                                    }
                                },
                                (errorGetFee) => {
                                    console.log('Error Getting Fee');
                                    log.error('Error Getting Fee');
                                }
                            );
                        }
                    },
                    (errorBuildRaw) => {
                        console.log('Error Building Raw');
                        log.error('Error Building Raw');
                    }
                );
            }
        },
        (createMetadataFileError) => {
            console.log('Error creating metadata file');
            log.error('Error creating metadata file');
        }
    );
}

function sendToken(nftAddress, paymentAddress, policy, usePath, nftIdentifier, txHash) {
    getUtxos(nftAddress).then(
        (responseGetUtxos) => {
            if (responseGetUtxos && responseGetUtxos.length > 0) {
                var availableUtxos = responseGetUtxos.filter(x => x.available > minAvailableQtyInUtxo); //TODO add && contains token
                console.log('availableUtxos.count: ' + availableUtxos.length);
                log.info('availableUtxos.count: ' + availableUtxos.length);
                if (availableUtxos && availableUtxos.length > 0) {
                    var available = availableUtxos[0].available;
                    var ix = availableUtxos[0].ix;
                    var utxo = availableUtxos[0].utxo;
                    console.log(`Going to send token. NftAddress: ${nftAddress}. PaymentAddress: ${paymentAddress}. Available: ${available}. Policy: ${policy}.  Utxo: ${utxo}.  ix: ${ix}. UsePath: ${usePath}. NftIdentifier: ${nftIdentifier}`);             
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
                                                                                console.log('SUCCESS Sending Tx');
                                                                                log.info('SUCCESS Sending Tx');

                                                                                con.query(`UPDATE TestNft SET addressSent = true WHERE identifier = '${nftIdentifier}';`, function (err, result) {
                                                                                    if (err) throw err;
                                                                                    console.log(result.affectedRows + " record(s) updated (TestNft)");
                                                                                    log.info(result.affectedRows + " record(s) updated (TestNft)");
                                                                                });
                                                                            }
                                                                        },
                                                                        (errorSubmitTx) => {
                                                                            console.log('Error Submitting Tx');
                                                                            log.error('Error Submitting Tx');
                                                                        }
                                                                    );
                                                                }
                                                            },
                                                            (errorSignTx) => {
                                                                console.log('Error Signing Fee');
                                                                log.error('Error Signing Fee');
                                                            }
                                                        );
                                                    }
                                                },
                                                (errorBuildTx) => {
                                                    console.log('Error Building Tx');
                                                    log.error('Error Building Tx');
                                                }
                                            );
                                        }
                                    },
                                    (errorGetFee) => {
                                        console.log('Error Getting Fee');
                                        log.error('Error Getting Fee');
                                    }
                                );
                            }
                        },
                        (errorBuildRaw) => {
                            console.log('Error Building Raw');
                            log.error('Error Building Raw');
                        }
                    );
                }
            }
        }, 
        (errorGetUtxos) => {
            console.log('Error Getting utxos');
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
                    console.log(`Going to send token. NftAddress: ${nftAddress}. PaymentAddress: ${paymentAddress}. Available: ${available}. Policy: ${policy}.  Utxo: ${utxo}.  ix: ${ix}. UsePath: ${usePath}. NftIdentifier: ${nftIdentifier}`);
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
                                                                                console.log('SUCCESS Sending Tx');
                                                                                log.info('SUCCESS Sending Tx');

                                                                                con.query(`UPDATE TestNft SET addressSent = true WHERE identifier = '${nftIdentifier}';`, function (err, result) {
                                                                                    if (err) throw err;
                                                                                    console.log(result.affectedRows + " record(s) updated (TestNft)");
                                                                                    log.info(result.affectedRows + " record(s) updated (TestNft)");
                                                                                });
                                                                            }
                                                                        },
                                                                        (errorSubmitTx) => {
                                                                            console.log('Error Submitting Tx');
                                                                            log.error('Error Submitting Tx');
                                                                        }
                                                                    );
                                                                }
                                                            },
                                                            (errorSignTx) => {
                                                                console.log('Error Signing Fee');
                                                                log.error('Error Signing Fee');
                                                            }
                                                        );
                                                    }
                                                },
                                                (errorBuildTx) => {
                                                    console.log('Error Building Tx');
                                                    log.error('Error Building Tx');
                                                }
                                            );
                                        }
                                    },
                                    (errorGetFee) => {
                                        console.log('Error Getting Fee');
                                        log.error('Error Getting Fee');
                                    }
                                );
                            }
                        },
                        (errorBuildRaw) => {
                            console.log('Error Building Raw');
                            log.error('Error Building Raw');
                        }
                    );
            }
        }, 
        (errorGetLastUtxo) => {
            console.log('Error getiing last utxo Raw');
            log.error('Error getiing last utxo Raw');
    });
}

function getMintMetadata(policyId, publisher, nftIdentifier, name, imagePath, location) {
    var str = `{"721":{"${policyId}":{"publisher":"${publisher}","${nftIdentifier}":{"name":"${name}","image":"${imagePath}","location":"${location}"}}}}`;
    return str;
}