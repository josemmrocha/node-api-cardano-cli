const axios = require('axios');

exports.scanAndSend = function(req, res) {
    var address = req.params.addr;
    getUtxos(address).then((response) => {
        console.log(response);
        if (response) {
            response.forEach(element => {
                console.log('Element TX HASH: ' + element.utxo);
            });
            res.send(200, response[0].utxo);
        } else {
            res.send(500, 'err');
        }
      }, (error) => {
        console.log(error);
        res.status(500).send('err');
      });
};

async function getUtxos(addr) {
    var url = 'http://localhost:4200/api/' + '/utxos/' + addr;

    try {
        let res = await axios.get(url);
        let data = res.data;
        console.log(data);
        return data;
    } catch (error) {
        console.log(error);
        return undefined;
    }   
  }