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

// Example route
var router = express.Router();
router.get('/', function(req, res) {
   res.send("Hello World!");
});
app.use(router);

// API routes
var commands = express.Router();

commands.route('/utxos')
  .get(CommandCtrl.getUtxos);

app.use('/api', commands);

app.listen(4200, function() {
  console.log("Node server running on http://localhost:4200");
});
