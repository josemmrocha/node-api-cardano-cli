const { exec } = require('child_process');
const testNFTPath = "/home/anon/nft/test/";

exports.getPolicyId = function(req, res) {
	var usePath = req.params.usePath;
	var path = usePath ? testNFTPath : '';

	exec(`cardano-cli transaction policyid --script-file ${path}policy.script`, (err, stdout, stderr) => {
		if (err) {
			console.log(`err: ${err}`);
			res.status(500).jsonp(err);
  		}
		if (stderr) {
			console.log(`stderr: ${stderr}`);
			res.status(500).jsonp(stderr);
  		}	

	    console.log(`stdout: ${stdout}`);
		console.log('GET /policyId');	

		res.status(200).jsonp(stdout);
	});
};

exports.getUtxos = function(req, res) {
	var addr = req.params.addr;

	exec(`cardano-cli query utxo --address ${addr} --mainnet`, (err, stdout, stderr) => {
  		if (err) {
			console.log(`err: ${err}`);
			res.status(500).jsonp(err);
  		}
		else if (stderr) {
			console.log(`stderr: ${stderr}`);
			res.status(500).jsonp(stderr);
  		} else if (stdout) {
			console.log('GET /utxos');
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

exports.buildTxToMint = function(req, res) {
	var fee = req.params.fee;
	var available = req.params.available;
	var address = req.params.address;
	var policy = req.params.policy;
	var utxo = req.params.utxo;
	var ix = req.params.ix;
	var usePath = req.params.usePath;
	var path = usePath ? testNFTPath : '';

	var returned = fee === 0 ? 0 : available - fee;

	exec(`cardano-cli transaction build-raw \
	--mary-era \
	--fee ${fee} \
	--tx-in ${utxo}#${ix} \
	--metadata-json-file metadata.json \
	--tx-out ${address}+${returned}+"1 ${policy}.MountainGorilla + 1 ${policy}.BrownBear"\
	--mint="1 ${policy}.MountainGorilla + 1 ${policy}.BrownBear"\
	--out-file matx.raw`, (err, stdout, stderr) => {
		if (err) {
			console.log(`err: ${err}`);
			res.status(500).jsonp(err);
  		}
		if (stderr) {
			console.log(`stderr: ${stderr}`);
			res.status(500).jsonp(stderr);
  		}	

	    console.log(`stdout: ${stdout}`);
		console.log('GET /buildTx/' + req.params.fee + '/' + req.params.available);

		res.status(200).jsonp(true);
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

	var transactionAmount = 1500000; // 10000000 = 10 ADA

	var returnedToNftAddr = fee === 0 ? 0 : available - fee - transactionAmount;
	var sendToBuyerAddr = fee === 0 ? 0 : transactionAmount;

	exec(`cardano-cli transaction build-raw \
	--mary-era \
	--fee ${fee} \
	--tx-in ${utxo}#${ix} \
	--tx-out ${nftAddress}+${returnedToNftAddr}\
	--tx-out ${paymentAddress}+${sendToBuyerAddr}\
	--out-file ${path}matx.raw`, (err, stdout, stderr) => {
		if (err) {
			console.log(`err: ${err}`);
			res.status(500).jsonp(err);
  		}
		if (stderr) {
			console.log(`stderr: ${stderr}`);
			res.status(500).jsonp(stderr);
  		}	

	    console.log(`stdout: ${stdout}`);
		console.log('GET /buildTx/' + req.params.fee + '/' + req.params.available);

		res.status(200).jsonp(true);
	});
};

exports.getFee = function(req, res) {
	var usePath = req.params.usePath;
	var path = usePath ? testNFTPath : '';

	exec(`cardano-cli transaction calculate-min-fee \
	--tx-body-file ${path}matx.raw \
	--tx-in-count 1 \
	--tx-out-count 1 \
	--witness-count 2 \
	--mainnet \
	--protocol-params-file ${path}protocol.json`, (err, stdout, stderr) => {
		if (err) {
			console.log(`err: ${err}`);
			res.status(500).jsonp(err);
  		}
		if (stderr) {
			console.log(`stderr: ${stderr}`);
			res.status(500).jsonp(stderr);
  		}
  		console.log(`stdout: ${stdout}`);
		console.log('GET /fee');
		var arr = stdout.split(" ");
		var fee = arr[0];		

		res.status(200).jsonp(fee);
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
		if (err) {
			console.log(`err: ${err}`);
			res.status(500).jsonp(err);
  		}
		if (stderr) {
			console.log(`stderr: ${stderr}`);
			res.status(500).jsonp(stderr);
  		}

	    console.log(`stdout: ${stdout}`);
		console.log('GET /signTx');	

		res.status(200).jsonp(true);
	});
};

exports.signTx = function(req, res) {
	var usePath = req.params.usePath;
	var path = usePath ? testNFTPath : '';

	exec(`cardano-cli transaction sign \
	--signing-key-file ${path}payment.skey \
	--mainnet \
	--tx-body-file ${path}matx.raw \
	--out-file ${path}matx.signed`, (err, stdout, stderr) => {
		if (err) {
			console.log(`err: ${err}`);
			res.status(500).jsonp(err);
  		}
		if (stderr) {
			console.log(`stderr: ${stderr}`);
			res.status(500).jsonp(stderr);
  		}

	    console.log(`stdout: ${stdout}`);
		console.log('GET /signTx');	

		res.status(200).jsonp(true);
	});
};


exports.submitTx = function(req, res) {
	var usePath = req.params.usePath;
	var path = usePath ? testNFTPath : '';

	exec(`cardano-cli transaction submit --tx-file  ${path}matx.signed --mainnet`, (err, stdout, stderr) => {
		if (err) {
			console.log(`err: ${err}`);
			res.status(500).jsonp(err);
  		}
		if (stderr) {
			console.log(`stderr: ${stderr}`);
			res.status(500).jsonp(stderr);
  		}

	    console.log(`stdout: ${stdout}`);
		console.log('GET /submitTx');	

		res.status(200).jsonp(true);
	});
};
