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

commands.route('/buildTxToMint/:fee/:available/:address/:policy/:utxo/:ix/:usePath')
  .get(CommandCtrl.buildTx);

commands.route('/buildTx/:fee/:available/:nftAddress/:paymentAddress/:policy/:utxo/:ix/:usePath')
  .get(CommandCtrl.buildTx);


commands.route('/fee/:usePath')
  .get(CommandCtrl.getFee);

commands.route('/signTxMint/:usePath')
  .get(CommandCtrl.signTxMint);

  commands.route('/signTx/:usePath')
  .get(CommandCtrl.signTx);

commands.route('/submitTx/:usePath')
  .get(CommandCtrl.submitTx);

commands.route('/txUtxos/:txHash')
  .get(ApiCtrl.getTxUtxos);

commands.route('/addrUtxos/:addr')
  .get(ApiCtrl.getAddrUtxos);

app.use('/api', commands);

app.listen(4200, function() {
  console.log("Node server running on http://localhost:4200");
});
