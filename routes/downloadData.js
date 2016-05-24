var express = require('express');
var router = express.Router();
var fs = require('fs');
var async = require('async')

var Portfolio = require('../lib/portfolio.js'),
    StockData = require('../lib/stockData.js');

var config = require('../lib/ini').parse(fs.readFileSync('./config.ini', 'utf-8'));

var dt = new Date();
var pollMsgQueue=[];

router.get('/', function (req, res) {
      var curPath=__dirname;
      var rootPath=curPath.replace(/\/routes/g,"");
      //console.log(curPath);
      //console.log(rootPath);
      res.render('downloadData' );
});

router.post('/', function (req, res) {
  pollMsgQueue.length=0; //put download status message.
  //fs.unlinkSync("stockHistoryDownload.log"); //If the file was not found, send response error to client
  res.setTimeout(0);
  async.series([
    function(callback){                                                               
      if (req.body.selectTW=="on") {
        StockData.download("TW", pollMsgQueue, function(){ callback(null,"1");});
      } else {
        callback(null,"1");
      }
    },
    function(callback){
      if (req.body.selectUS=="on") {
        StockData.download("US", pollMsgQueue, function(){ callback(null,"2");});
      } else {
        callback(null,"2");
      }
    },
    function(callback){
      if (req.body.selectHK=="on") {
        StockData.download("HK", pollMsgQueue, function(){ callback(null,"3");});
      } else {
       callback(null,"3");
      }
    }],
    function(err,results){
      //console.log(results);
      pollMsgQueue.push("History data download complete.");
      setTimeout(function(){
        res.send("Download Complelte"); //response to ajax form submit. 
        lock=0;
      },6000); //Delay time large than polling interval such that all contect in pollMsgQueue can all be take out.
  });
});

router.post('/status', function (req, res) {
  for (i=0 ; i<pollMsgQueue.length ; i++)
    {
       if (config.stockData.history.logFile==true) 
         fs.appendFileSync('stockHistoryDownload.log',pollMsgQueue[i] + '\n','utf8');
    }
    res.send(pollMsgQueue.toString());
    pollMsgQueue.length=0; //Can't pollMsgQueue=[] to clear array because it seem to new another variable. Use pollMsgQueue.length to clear array.
});

module.exports = router;
