const axios = require('axios');
var mysql = require('mysql');
const { response } = require('express');
const { createMetadataFile } = require('./commandController');
var tools = require('./tools/tools');
const policyIdTestNFT = '79d04870cc49ea029f95e7ad19576981620b4665b921c95f79b2a726';
const publisherName = 'test.com'; // adachess.com
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
                                            var availableUtxos = responseGetUtxos.filter(x => x.available > 3000000); // 3000000 = 3 ADA
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

exports.scanAddrTxMintAndSend = function(req, res) {
    var address = req.params.addr;
    res.status(200).send('running');
  
    getAllTx(address).then(
        (responseGetAllTx) => {
            if (responseGetAllTx) {
                var allTxs = JSON.parse(responseGetAllTx);
                console.log(`There are ${allTxs.length} txs in this address`);
                con.query('SELECT txHash FROM ProcessedTx;', function (err, rows, fields) {
                    if (err) throw err;
                    var nonProcessedTx = allTxs.filter(x => !rows.includes(x));
                    console.log('Non processed txs: ' + nonProcessedTx.length);
                    if (nonProcessedTx.length > 0) {
                        var tx = nonProcessedTx[0];                      
                        console.log(`Getting utxos for tx: ${tx}`);
                        getOuputsFromUtxo(tx).then(
                            (responseGetOuputsFromUtxo) => {
                                var addressToSend = getEntrantAddress(address, responseGetOuputsFromUtxo);
        
                                if (addressToSend) {
                                    getUtxos(address).then(
                                        (responseGetUtxos) => {
                                            if (responseGetUtxos && responseGetUtxos.length > 0) {
                                                var availableUtxos = responseGetUtxos.filter(x => x.available > 3000000); // 3000000 = 3 ADA
                                                console.log('availableUtxos.count: ' + availableUtxos.length);
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
            } else {
                res.status(500).send('err');
            }
        }, 
        (errorGetAllTx) => {
            res.status(500).send('err');
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

async function buildTxMint(fee, available, address, policy, utxo, ix, usePath, nftIdentifier) {
    var url = `http://localhost:4200/api/buildTxMint/${fee}/${available}/${address}/${policy}/${utxo}/${ix}/${usePath}/${nftIdentifier}`;

    try {
        let res = await axios.get(url);
        return res.data;
    } catch (error) {
        return undefined;
    }   
}

async function buildTxWithToken(fee, available, nftAddress, paymentAddress, policy, utxo, ix, usePath, nftIdentifier) {
    var url = `http://localhost:4200/api/buildTxWithToken/${fee}/${available}/${nftAddress}/${paymentAddress}/${policy}/${utxo}/${ix}/${usePath}/${nftIdentifier}`;

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

async function signTxMint(usePath) {
    var url = `http://localhost:4200/api/signTxMint/${usePath}`;

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

async function createmetadataFile(jsonstr, usePath) {
    var url = `http://localhost:4200/api/createMetadataFile/${jsonstr}/${usePath}`;

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

function selectTokenMintAndSend(available, addressForNft, paymentAddress, policy, utxo, ix, usePath, txHash) {
    con.query('SELECT * FROM TestNft;', function (err, rows, fields) {
        if (err) throw err;
        var nonProcessedNfts = rows.filter(x => x.minted !== true);
        console.log('NonProcessedNfts: ' + nonProcessedNfts.length);
        var randomNftFromNonProcessed = nonProcessedNfts[Math.floor(Math.random() * nonProcessedNfts.length)];
        console.log('Random TestNft Selected. Identifier: ' + randomNftFromNonProcessed.identifier);

        mintandSendToken(available, addressForNft, paymentAddress, policy, utxo, ix, usePath,
            randomNftFromNonProcessed.nftIdentifier, randomNftFromNonProcessed.name,
            randomNftFromNonProcessed.imagePath, randomNftFromNonProcessed.location, txHash);
    });
}

function mintandSendToken(available, addressForNft, paymentAddress, policy, utxo, ix, usePath, nftIdentifier, name, imagePath, location, txHash) {
    console.log(`Going to mint token. Address: ${addressForNft}. Available: ${available}.  
        Policy: ${policy}.  Utxo: ${utxo}.  ix: ${ix}. 
        UsePath: ${usePath}. NftIdentifier: ${nftIdentifier}.`);

    var metadata = getMintMetadata(policy, publisherName, nftIdentifier, name, imagePath, location);

    createmetadataFile(metadata, usePath).then(
        (createMetadataFileResponse) => {
            buildTxMint(0, available, addressForNft, policy, utxo, ix, usePath, nftIdentifier).then(
                (responseBuildRaw) => {
                    if (responseBuildRaw) {
                        getFee(usePath).then(
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
                                                                         sendToken(available, addressForNft, paymentAddress, policy, utxo, ix, usePath, nftIdentifier, txHash);
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
        },
        (createMetadataFileError) => {
            console.log('Error creating metadata file');
        }
    );
}

function sendToken(available, nftAddress, paymentAddress, policy, utxo, ix, usePath, nftIdentifier, txHash) {
    console.log(`Going to send token. NftAddress: ${nftAddress}. PaymentAddress: ${paymentAddress}.  
        Available: ${available}. Policy: ${policy}.  Utxo: ${utxo}.  ix: ${ix}. UsePath: ${usePath}. 
        NftIdentifier: ${nftIdentifier}`);
       
    buildTxWithToken(0, available, nftAddress, paymentAddress, policy, utxo, ix, usePath, nftIdentifier).then(
        (responseBuildRaw) => {
            if (responseBuildRaw) {
                getFee(usePath).then(
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
                                                                con.query(`INSERT INTO ProcessedTx (txHash) VALUES ('${txHash}');`, function (err, rows, fields) {
                                                                    if (err) throw err;
                                                                    console.log('Inserted ProcessedTx: ' + txHash);
                                                                });

                                                                con.query(`UPDATE TestNft SET minted = true WHERE nftIdentifier = '${nftIdentifier}';
                                                                UPDATE TestNft SET addressSent = '${paymentAddress}' WHERE nftIdentifier = '${nftIdentifier}';`, function (err, result) {
                                                                    if (err) throw err;
                                                                    console.log(result.affectedRows + " record(s) updated (TestNft)");
                                                                });
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

function getMintMetadata(policyId, publisher, nftIdentifier, name, imagePath, location) {
    var str = `{"721":{${policyId}:{"publisher":${publisher},${nftIdentifier}:{"name":${name},"image":${imagePath},"location":${location}}}}}`;
    return str;
}