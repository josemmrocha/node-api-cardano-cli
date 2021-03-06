const axios = require('axios');
var mysql = require('mysql');

module.exports = {
    getBlockfrostOptions: function (host, path, blockFrostApiKey) {
        return {
            host : host,
            path: path,
            headers: {
                "project_id": blockFrostApiKey
            },
        };
    },
    httpGet: async function (url) {   
        try {
            let res = await axios.get(url);
            return res.data;
        } catch (error) {
            return undefined;
        }   
    },
    ExecuteGetQueryinDB: async function (query) {
        var con = mysql.createConnection({
            host     : 'localhost',
            user     : 'nft',
            password : 'nftpassword',
            database: 'nft'
        });
          
        con.connect(function(err) {
            if (err) throw err;
            con.query(query, function (err, result) {
              if (err) throw err;
              console.log("Result: " + result);
            });
          });
    },
    ExecuteInsertQueryinDB: function (query) {
        var result;
        var connection = mysql.createConnection({
            host: 'localhost',
            user: 'nft',
            password: 'nftpassword',
            database: 'nft'
          });
          
          connection.connect();
          
          connection.query(query, function(err, res) {
            if (err) throw err;
            result = res;
          });
          
          connection.end();

          return result;
    },
};