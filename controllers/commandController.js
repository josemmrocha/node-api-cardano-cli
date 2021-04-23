const { exec } = require('child_process');

exports.getPolicyId = function(req, res) {
	exec('cardano-cli transaction policyid --script-file policy.script', (err, stdout, stderr) => {
  		if (err) {
			res.send(500, err);
  		}	

	    console.log(`stdout: ${stdout}`);
  		console.log(`stderr: ${stderr}`);
		console.log('GET /policyId');	

		res.status(200).jsonp(stdout);
	});
};

exports.getUtxos = function(req, res) {
	var addr = req.params.addr;

	exec(`cardano-cli query utxo --address ${addr} --mainnet`, (err, stdout, stderr) => {
  		if (err) {
			res.send(500, err);
  		}

  		console.log(`stdout: ${stdout}`);
  		console.log(`stderr: ${stderr}`);
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
	});
};

exports.buildTx = function(req, res) {
	var fee = req.params.fee;
	var available = req.params.available;
	var address = req.params.address;
	var policy = req.params.policy;
	var utxo = req.params.utxo;
	var ix = req.params.ix;

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
			res.send(500, err);
  		}	

	    console.log(`stdout: ${stdout}`);
  		console.log(`stderr: ${stderr}`);
		console.log('GET /buildTx/' + req.params.fee + '/' + req.params.available);

		res.status(200).jsonp(true);
	});
};

exports.getFee = function(req, res) {
	exec('cardano-cli transaction calculate-min-fee \
	--tx-body-file matx.raw \
	--tx-in-count 1 \
	--tx-out-count 1 \
	--witness-count 2 \
	--mainnet \
	--protocol-params-file protocol.json', (err, stdout, stderr) => {
  		if (err) {
			res.send(500, err);
  		}
  		console.log(`stdout: ${stdout}`);
  		console.log(`stderr: ${stderr}`);
		console.log('GET /fee');
		var arr = stdout.split(" ");
		var fee = arr[0];		

		res.status(200).jsonp(fee);
	});
};

exports.signTx = function(req, res) {
	exec('cardano-cli transaction sign \
	--signing-key-file payment.skey \
	--signing-key-file policy.skey \
	--script-file policy.script \
	--mainnet \
	--tx-body-file matx.raw \
	--out-file matx.signed', (err, stdout, stderr) => {
  		if (err) {
			res.send(500, err);
  		}	

	    console.log(`stdout: ${stdout}`);
  		console.log(`stderr: ${stderr}`);
		console.log('GET /signTx');	

		res.status(200).jsonp(true);
	});
};

exports.submitTx = function(req, res) {

	exec('cardano-cli transaction submit --tx-file  matx.signed --mainnet', (err, stdout, stderr) => {
  		if (err) {
			res.send(500, err);
  		}	

	    console.log(`stdout: ${stdout}`);
  		console.log(`stderr: ${stderr}`);
		console.log('GET /submitTx');	

		res.status(200).jsonp(true);
	});
};
