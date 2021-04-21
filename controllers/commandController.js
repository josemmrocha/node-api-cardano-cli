const { exec } = require('child_process');

//GET - Return all tvshows in the DB
exports.getUtxos = function(req, res) {

	exec('cardano-cli query utxo --address addr1v8tdlrfq86axglt4yw3k945lwrrj5eqzulazgwkq4q8cv0gdgwnye --mainnet', (err, stdout, stderr) => {
  		if (err) {
    			// node couldn't execute the command
			res.send(500, err);
  		}

  		// the *entire* stdout and stderr (buffered)
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

