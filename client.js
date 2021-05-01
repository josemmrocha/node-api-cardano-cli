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
var ClientCtrl = require('./controllers/clientController');

// Example route
var router = express.Router();
router.get('/', function(req, res) {
   res.send("Hello World!");
});
app.use(router);

// API routes
var commands = express.Router();

commands.route('/scanAddrTxMintAndSend/:addr')
  .get(ClientCtrl.scanAddrTxMintAndSend);

 commands.route('/scanAddrTxMintAndSend2/:addr')
  .get(ClientCtrl.scanAddrTxMintAndSend2);

commands.route('/sendMintedNotSentTokens/:addr')
  .get(ClientCtrl.sendMintedNotSentTokens);

commands.route('/sendAllUtxosToAddr/:nftAddress/:paymentAddress')
  .get(ClientCtrl.sendAllUtxosToAddr);

commands.route('/testWebDB')
  .get(ClientCtrl.testWebDB);

app.use('/api', commands);

app.listen(4800, function() {
  console.log("Node server running on http://localhost:4800");
});
