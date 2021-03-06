const { exec } = require('child_process');
const constants = require('./constants/constants');
const testNFTPath = constants.testNFTPath;
const adaWithToken = constants.adaWithToken;
var opts = {
    logFilePath: constants.testNFTPath + 'server.log',
    timestampFormat:'YYYY-MM-DD HH:mm:ss.SSS'
};
const log = require('simple-node-logger').createSimpleLogger(opts);

exports.getPolicyId = function(req, res) {
	var usePath = req.params.usePath;
	var path = usePath ? testNFTPath : '';

	exec(`cardano-cli transaction policyid --script-file ${path}policy.script`, (err, stdout, stderr) => {
		if (err || stderr) {
			log.error(`err: ${err}`);
			log.error(`stderr: ${stderr}`);
			res.status(500).jsonp('');
  		} else {
			log.error(`stdout: ${stdout}`);
			log.error('GET /policyId');	
			res.status(200).jsonp(stdout);
		}
	});
};

exports.getUtxos = function(req, res) {
	var addr = req.params.addr;

	exec(`cardano-cli query utxo --address ${addr} --mainnet`, (err, stdout, stderr) => {
		if (err || stderr) {
			log.error(`err: ${err}`);
			log.error(`stderr: ${stderr}`);
			res.status(500).jsonp([]);
  		} else {
			log.info('GET /utxos');
			var lines = stdout.split("\n");
			var utxoInfos = [];
			var cont = 0;
			lines.forEach(line => {
				if (cont !== 0 && cont !== 1 && line) {
					var localUtxo = line.substring(0,64);
					var localIx = line.substring(69).substring(0,9).trim();
					var allArr = line.substring(78).split(" ");
					var localAvailable = allArr[0];
					var utxoInfo = {
						utxo: localUtxo,
						ix: localIx,
						available: localAvailable
					};
					utxoInfos.push(utxoInfo);
				}
				cont++;
			});
	
			res.status(200).jsonp(utxoInfos);
		} 
	});
};

exports.buildTxMint = function(req, res) {
	var fee = req.params.fee;
	var available = req.params.available;
	var address = req.params.address;
	var policy = req.params.policy;
	var utxo = req.params.utxo;
	var ix = req.params.ix;
	var usePath = req.params.usePath;
	var nftIdentifier = req.params.nftIdentifier;

	var path = usePath ? testNFTPath : '';
	var returned = fee === 0 ? 0 : available - fee;

	log.info('GET /buildTxMint/' + req.params.fee + '/' + req.params.available);	

	exec(`cardano-cli transaction build-raw \
	--mary-era \
	--fee ${fee} \
	--tx-in ${utxo}#${ix} \
	--metadata-json-file ${path}metadata.json \
	--tx-out ${address}+${returned}+"1 ${policy}.${nftIdentifier}"\
	--mint="1 ${policy}.${nftIdentifier}"\
	--out-file ${path}matx.raw`, (err, stdout, stderr) => {
		if (err || stderr) {
			log.error(`err: ${err}`);
			log.error(`stderr: ${stderr}`);
			res.status(500).jsonp(false);
  		} else {
			log.info(`stdout: ${stdout}`);
			res.status(200).jsonp(true);
		}
	});
};

exports.buildTx = function(req, res) {
	var fee = req.params.fee;
	var available = req.params.available;
	var nftAddress = req.params.nftAddress;
	var paymentAddress = req.params.paymentAddress;
	var policy = req.params.policy;
	var utxo = req.params.utxo;
	var ix = req.params.ix;
	var usePath = req.params.usePath;
	var path = usePath ? testNFTPath : '';

	var transactionAmount = adaWithToken;

	var returnedToNftAddr = fee === 0 ? 0 : available - fee - transactionAmount;
	var sendToBuyerAddr = fee === 0 ? 0 : transactionAmount;

	exec(`cardano-cli transaction build-raw \
	--mary-era \
	--fee ${fee} \
	--tx-in ${utxo}#${ix} \
	--tx-out ${nftAddress}+${returnedToNftAddr}\
	--tx-out ${paymentAddress}+${sendToBuyerAddr}\
	--out-file ${path}matx.raw`, (err, stdout, stderr) => {
		if (err || stderr) {
			log.error(`err: ${err}`);
			log.error(`stderr: ${stderr}`);
			res.status(500).jsonp(false);
  		} else {
			log.info(`stdout: ${stdout}`);
			log.info('GET /buildTx/' + req.params.fee + '/' + req.params.available);
			res.status(200).jsonp(true);
		}
	});
};

exports.buildTxWithToken = function(req, res) {
	var fee = req.params.fee;
	var available = req.params.available;
	var nftAddress = req.params.nftAddress;
	var paymentAddress = req.params.paymentAddress;
	var policy = req.params.policy;
	var utxo = req.params.utxo;
	var ix = req.params.ix;
	var usePath = req.params.usePath;
	var nftIdentifier = req.params.nftIdentifier;

	log.info('GET /buildTxWithToken/' + fee + '/' + available);

	var path = usePath ? testNFTPath : '';
	var transactionAmount = adaWithToken;
	var returnedToNftAddr = fee === 0 ? 0 : available - fee - transactionAmount;
	var sendToBuyerAddr = fee === 0 ? 0 : transactionAmount;

	var command = `cardano-cli transaction build-raw \
	--mary-era \
	--fee ${fee} \
	--tx-in ${utxo}#${ix} \
	--tx-out ${nftAddress}+${returnedToNftAddr} \
	--tx-out ${paymentAddress}+${sendToBuyerAddr}+"1 ${policy}.${nftIdentifier}" \
	--out-file ${path}matx.raw`;

	log.info('Command: ' + command);

	exec(command, (err, stdout, stderr) => {
		if (err || stderr) {
			log.error(`err: ${err}`);
			log.error(`stderr: ${stderr}`);
			res.status(500).jsonp(false);
  		} else {
			log.info(`stdout: ${stdout}`);
			res.status(200).jsonp(true);
		}
	});
};

exports.buildTxMultipleInputs = function(req, res) {
	var resquest = req.body;
	var fee = resquest.fee;
	var paymentAddress = resquest.paymentAddress;
	var usePath = resquest.usePath;
	var utxoInfoList = resquest.utxoInfoList;

	var totalAvailable = 0;
	var totalIputs = '';

	utxoInfoList.forEach(utxoInfo => {
		var available = utxoInfo.available;
		var utxo = utxoInfo.utxo;
		var ix = utxoInfo.ix;
		var input = `--tx-in ${utxo}#${ix} `;
		totalIputs += input;
		totalAvailable += parseInt(available);
	});

	log.info('totalAvailable: ' + totalAvailable);

	var path = usePath ? testNFTPath : '';
	var sendToBuyerAddr = fee === 0 ? 0 : totalAvailable - fee;

	exec(`cardano-cli transaction build-raw --mary-era --fee ${fee} ${totalIputs}--tx-out ${paymentAddress}+${sendToBuyerAddr} --out-file ${path}matx.raw`, (err, stdout, stderr) => {
		if (err || stderr) {
			log.error(`err: ${err}`);
			log.error(`stderr: ${stderr}`);
			res.status(500).jsonp(false);
  		} else {
			log.info(`stdout: ${stdout}`);
			log.info('GET /buildTx/' + req.params.fee + '/' + req.params.available);
			res.status(200).jsonp(true);
		}
	});
};

exports.buildTxRefund = function(req, res) {
	var fee = req.params.fee;
	var available = req.params.available;
	var paymentAddress = req.params.paymentAddress;
	var utxo = req.params.utxo;
	var ix = req.params.ix;
	var usePath = req.params.usePath;
	var path = usePath ? testNFTPath : '';

	var sendToBuyerAddr = fee === 0 ? 0 : parseInt(available) - parseInt(fee);

	exec(`cardano-cli transaction build-raw \
	--mary-era \
	--fee ${fee} \
	--tx-in ${utxo}#${ix} \
	--tx-out ${paymentAddress}+${sendToBuyerAddr}\
	--out-file ${path}matx.raw`, (err, stdout, stderr) => {
		if (err || stderr) {
			log.error(`err: ${err}`);
			log.error(`stderr: ${stderr}`);
			res.status(500).jsonp(false);
  		} else {
			log.info(`stdout: ${stdout}`);
			log.info('GET /buildTx/' + req.params.fee + '/' + req.params.available);
			res.status(200).jsonp(true);
		}
	});
};

exports.getLastUtxo = function(req, res) {
	var usePath = req.params.usePath;
	var path = usePath ? testNFTPath : '';

	log.info('GET /getLastUtxo/');

	var command = `cardano-cli transaction txid --tx-body-file ${path}matx.raw`;

	log.info('Command: ' + command);

	exec(command, (err, stdout, stderr) => {
		if (err || stderr) {
			log.error(`err: ${err}`);
			log.error(`stderr: ${stderr}`);
			res.status(500).jsonp(false);
  		} else {
			log.info(`stdout: ${stdout}`);
			res.status(200).jsonp(stdout);
		}
	});
};

exports.getFee = function(req, res) {
	log.info('GET /fee');
	var inTxCount = req.params.inTxCount; // 1
	var outTxCount = req.params.outTxCount; // 1
	var witnessCount = req.params.witnessCount; // 2
	var usePath = req.params.usePath;
	var path = usePath ? testNFTPath : '';

	var command = `cardano-cli transaction calculate-min-fee \
	--tx-body-file ${path}matx.raw \
	--tx-in-count ${inTxCount} \
	--tx-out-count ${outTxCount} \
	--witness-count ${witnessCount} \
	--mainnet \
	--protocol-params-file ${path}protocol.json`;

	log.info('Command: ' + command);

	exec(command, (err, stdout, stderr) => {
		if (err || stderr) {
			log.error(`err: ${err}`);
			log.error(`stderr: ${stderr}`);
			res.status(500).jsonp(0);
  		} else {
			log.info(`stdout: ${stdout}`);
			var arr = stdout.split(" ");
			var fee = arr[0];		
			res.status(200).jsonp(fee);
		  }
	});
};

exports.signTxMint = function(req, res) {
	var usePath = req.params.usePath;
	var path = usePath ? testNFTPath : '';

	exec(`cardano-cli transaction sign \
	--signing-key-file ${path}payment.skey \
	--signing-key-file ${path}policy.skey \
	--script-file ${path}policy.script \
	--mainnet \
	--tx-body-file ${path}matx.raw \
	--out-file ${path}matx.signed`, (err, stdout, stderr) => {
		if (err || stderr) {
			log.error(`err: ${err}`);
			log.error(`stderr: ${stderr}`);
			res.status(500).jsonp(false);
  		} else {
			log.info(`stdout: ${stdout}`);
			log.info('GET /signTx');	
			res.status(200).jsonp(true);
		  }
	});
};

exports.signTx = function(req, res) {
	var usePath = req.params.usePath;
	var path = usePath ? testNFTPath : '';

	log.info('GET /signTx');		

	var command = `cardano-cli transaction sign \
	--signing-key-file ${path}payment.skey \
	--mainnet \
	--tx-body-file ${path}matx.raw \
	--out-file ${path}matx.signed`;

	log.info('Command: ' + command);

	exec(command, (err, stdout, stderr) => {
		if (err || stderr) {
			log.error(`err: ${err}`);
			log.error(`stderr: ${stderr}`);
			res.status(500).jsonp(false);
  		} else {
			log.info(`stdout: ${stdout}`);
			res.status(200).jsonp(true);
		  }
	});
};

exports.submitTx = function(req, res) {
	var usePath = req.params.usePath;
	var path = usePath ? testNFTPath : '';

	log.info('GET /submitTx');	

	var command = `cardano-cli transaction submit --tx-file  ${path}matx.signed --mainnet`;

	log.info('Command: ' + command);

	exec(command, (err, stdout, stderr) => {
		if (err || stderr) {
			log.error(`err: ${err}`);
			log.error(`stderr: ${stderr}`);
			res.status(500).jsonp(false);
  		} else {
			log.info(`stdout: ${stdout}`);
			res.status(200).jsonp(true);
		  }
	});
};

exports.createMetadataFile = function(req, res) {
	var jsonstr = JSON.stringify(req.body);
	var usePath = req.params.usePath;
	var path = usePath ? testNFTPath : '';

	log.info('GET /createMetadataFile');	

	exec(`echo '${jsonstr}' > ${path}metadata.json`, (err, stdout, stderr) => {
		if (err || stderr) {
			log.error(`err: ${err}`);
			log.error(`stderr: ${stderr}`);
			res.status(500).jsonp(false);
  		} else {
			log.info(`stdout: ${stdout}`);
			res.status(200).jsonp(true);
		  } 
	});
};

