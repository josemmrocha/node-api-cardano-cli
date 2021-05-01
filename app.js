var express = require("express"),
    app = express(),
    bodyParser  = require("body-parser"),
    methodOverride = require("method-override");

// Middlewares
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride());

// Import Models and controllers
//var models     = require('./models/tvshow')(app, mongoose);
var CommandCtrl = require('./controllers/commandController');
var ApiCtrl = require('./controllers/apiController');

// Example route
var router = express.Router();
router.get('/', function(req, res) {
   res.send("Hello World!");
});
app.use(router);

// API routes
var commands = express.Router();

commands.route('/utxos/:addr')
  .get(CommandCtrl.getUtxos);

commands.route('/policyId/:usePath')
  .get(CommandCtrl.getPolicyId);

commands.route('/buildTxMint/:fee/:available/:address/:policy/:utxo/:ix/:usePath/:nftIdentifier')
  .get(CommandCtrl.buildTxMint);

commands.route('/buildTx/:fee/:available/:nftAddress/:paymentAddress/:policy/:utxo/:ix/:usePath')
  .get(CommandCtrl.buildTx);

commands.route('/buildTxWithToken/:fee/:available/:nftAddress/:paymentAddress/:policy/:utxo/:ix/:usePath/:nftIdentifier')
  .get(CommandCtrl.buildTxWithToken);

commands.route('/buildTxMultipleInputs/')
  .post(CommandCtrl.buildTxMultipleInputs);

commands.route('/buildTxRefund/:fee/:available/:paymentAddress/:utxo/:ix/:usePath')
  .post(CommandCtrl.buildTxRefund);

commands.route('/fee/:inTxCount/:outTxCount/:witnessCount/:usePath')
  .get(CommandCtrl.getFee);

commands.route('/signTxMint/:usePath')
  .get(CommandCtrl.signTxMint);

  commands.route('/signTx/:usePath')
  .get(CommandCtrl.signTx);

commands.route('/submitTx/:usePath')
  .get(CommandCtrl.submitTx);

commands.route('/getLastUtxo/:usePath')
  .get(CommandCtrl.getLastUtxo);

commands.route('/createMetadataFile/:usePath')
  .post(CommandCtrl.createMetadataFile);

commands.route('/txUtxos/:txHash')
  .get(ApiCtrl.getTxUtxos);

commands.route('/addrUtxos/:addr')
  .get(ApiCtrl.getAddrUtxos);

commands.route('/getAllTx/:addr')
  .get(ApiCtrl.getAllTx);

app.use('/api', commands);

app.listen(4200, function() {
  console.log("Node server running on http://localhost:4200");
});
