var express = require('express');
var promise = require('bluebird');
var mongodb = promise.promisifyAll(require('mongodb'));
var mongoClient = mongodb.MongoClient;

var asynca = require('asyncawait/async')
    await = require('asyncawait/await');

var fs = require('fs');
var yahooFinance = require('yahoo-finance'),
    Portfolio = require('../lib/portfolio.js'),
    stockUtil=require("../lib/stockUtil");

var config = require('../lib/ini').parse(fs.readFileSync('./config.ini', 'utf-8')),
    urlMongodb=config.urlMongodb;

// stockData Object
/*
collection(stockDataUS)
{
"stockId":"APPL",
"name":"APPL",
"stockClass":"STOCK", //STOCK or INDEX
"info":{"marketType":"US","MarketId":"NYSE", "historyDoneYear":[2001,2015,2016] },
"historyData":["2015":{"date":"2015-3-2","open":100, "high":102, "low":99, "close":100.2, "volume":154680, "adjClose"=1.298},
               "2016":{"date":"2016-3-2","open":100, "high":102, "low":99, "close":100.2, "volume":154680, "adjClose"=1.298}],
"financeData":[  "yearData":{"year":"2015","revenue":2100, "profit":2100, "EPS":1,"dividen":0.1} 
                 "quarterData":{"quarter":"2015Q3","revenue":2100, "profit":2100, "EPS":1,"dividen":0.1} 
                 "monthData":{"month":"201501","revenue":2000 }
              ]
}
*/
var historyDoneYear=[];//history data of the year  have been downloaded
var dbs,data1;

function StockData(stockId,stockName,stockClass,stockInfo,historyData,financeData){
  this.stockid = stockId;
  this.name = stockName;
  this.stockClass = stockClass;
  this.info = stockInfo;
  this.historyData = historyData ;
  this.financeData = financeData ;
}

function stockDataDownload(marketType, stockId, pollMsgQueue){ //download history data and financial data
  var resolver = promise.defer();
  mongoClient.connectAsync(urlMongodb) 
    .then(function(db){ //get stockData object from mongodb.
        dbs=db;
        return db.collection('stockdata' + marketType).findOneAsync({"stockId":stockId});
     })
    .then(function(data){ //If stockData object not exist in mongodb, create a new one.
        //console.log("db.collection.find() result:"); console.log(data);
        if (data==undefined){
          data={
            "stockId":stockId,
            "name":stockUtil.getStockNameFromCSV(marketType,stockId),
            "stockClass":"STOCK",
            "info":{"marketType":marketType,"marketId":stockUtil.getMarketId(marketType,stockId), "historyDoneYear":[] },
            "historyData":[],
            "financeData":{}
          };
          //console.log(newStockData);
          return dbs.collection('stockdata' + marketType).insertAsync(data).then(function(){ return data });
        } else {  
          return data
        }
     })
    .then(function(stockData) { //download history
       // console.log("stockData:"); console.log(stockData);
        return historyDownload(stockData,pollMsgQueue);
     })
    .then(function() { return dbs.closeAsync(); } )
    .then(function() { return resolver.resolve() } )
    .catch(function(err){
         console.log(err);
         return dbs.closeAsync();
     });
  return resolver.promise;
}

function historyDownload(stockData, pollMsgQueue){
  var fromYear = config.stockData.history.from;
  var reDownload = config.stockData.history.reDownload;
  var historySource=config.stockData.history.source;
  var currentTime = new Date();  // current time
  var currentYear = new Date().getFullYear();  // current year
  var from, to= currentTime,
      toYear = currentYear;
  var doneYear = stockData.info.historyDoneYear;
  var queryStockIdYahoo,queryStockIdGoogle,db,col,i,j,quotes; 
  var marketType = stockData.info.marketType;
  var stockId = stockData.stockId;
  var resolver = promise.defer();
  
  switch(marketType){
    case "TW": { 
                          queryStockIdYahoo= stockId + '.' + stockData.info.marketId;
                          queryStockIdGoogle= "TPE:" + stockId;
                          break;
                        }                             
    case "HK": { if (Number(stockId)<1000) { 
                            var str1=String(Number(stockId)+10000);
                            var stockId1=str1.substring(1,str1.length);
                            //console.log("stockId1",stockId1);
                            queryStockIdYahoo= stockId1 + '.' + stockData.info.marketId;
                            queryStockIdGoogle= "HKG:" + stockId1;
                          } else { 
                            queryStockIdYahoo= stockId + '.' + stockData.info.marketId;
                            queryStockIdGoogle= "HKG:" + stockId;
                          }
                        break;
                        }
    case "US": {                            
                          queryStockIdYahoo= stockId;
                          if (stockData.info.marketId=="NASDAQ")   queryStockIdGoogle= "NASDAQ:" + stockId;
                          if (stockData.info.marketId=="NYSE")   queryStockIdGoogle= "NYSE:" + stockId;                                                  
                          break;
                        }  
    default:
                          queryStockIdYahoo= stockId + '.' +marketType;
                          queryStockIdGoogle= marketType + ':' + stockId;
  }
  //console.log("stockId:" + stockId); 
  //console.log("queryStockIdYahoo:" + queryStockIdYahoo);
  //console.log("queryStockIdGoogle:" + queryStockIdGoogle);
  //console.log(stockData);
  //download data for fromYear~currentYear
  asynca ( function(){
    for (i=parseInt(fromYear); i<= parseInt(currentYear); i++)
    { 
      console.log("i=" + i)
      console.log("doneYear=" + doneYear);
      if ((doneYear.indexOf(String(i))<0) || (reDownload==true)) { //i not in doneYear, or config set re-download
        //console.log("DDDDDDDDDDD11111");
        from=String(i) + "-01-01";
          to=String(i) + "-12-31";
        if (String(i)==currentYear) { //set the next day of last stockData in mongodb as start date to download data.
        //console.log("DDDDDDDDDDD22222");
          var lastData=await(StockData.getHistoryLastData(marketType, stockId));
	  console.log(lastData);
          from=String(i) + "-01-01";
          to=currentTime; 
          if (lastData!="") {
            //console.log("DDDDDDDDDDD33333");
            if (Date.parse(lastData[0].historyData.date).valueOf() > Date.parse(currentYear + "-01-01").valueOf()) {
              //console.log("XXXXXXXXXXX");
              //console.log(lastData[0].historyData.date);
              from=new Date((Date.parse(lastData[0].historyData.date)+24*60*60*1000)); //from= next day of last data date in mongodb
            }
          }
          else {
            //console.log("DDDDDDDDDDD44444");
            from=currentYear+ "-01-01"  ; 
          }
        }
        console.log(queryStockIdYahoo +" from " + from + " to " + to + " downloading...");
        if (Date.parse(from).valueOf() >= Date.parse(to).valueOf()) { from=to }
          console.log(queryStockIdYahoo +" from " + from + " to " + to + " downloading...");
        //pollMsgQueue.push(stockId + " from "+ from +" to " + to +" download...");
        if (historySource=='Yahoo') {
            //console.log("DDDDDDDDDDD55555");
            quotes=await(yahooFinance.historical({ symbol: queryStockIdYahoo, from: from, to: to, })
                          .then(function (quotes){
                                 // console.log("Quotes of yahooFinance.history:");
                                 // console.log(quotes);
                                  return quotes
                           }) 
                          .catch(function(err){ console.log(err); })
                        );
        } else {
            quotes=await( stockUtil.googleHistory(queryStockIdGoogle,from,to)
                          .then(function (quotes){
                                  //console.log("Quotes of googleFinance.history:");
                                  //console.log(quotes);
                                  return quotes
                           }) 
                          .catch(function(err){ console.log(err); })
                        );
        } 
        for(j=0; j<quotes.length;j++) { //insert data to mongodb 1-by-1
          //console.log("YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY");
          //console.log(quotes[j]);
          //console.log(stockId);
          await( dbs.collection('stockdata' + marketType).updateAsync({"stockId":stockId},{$addToSet:{ historyData:quotes[j] }},{upsert:true}) );
        }
        if ((quotes.length>0) && (doneYear.indexOf(String(i))<0) && String(i)!=currentYear) { //quotes is not empty
          await( dbs.collection('stockdata' + marketType).updateAsync({"stockId":stockId},{$addToSet:{ 'info.historyDoneYear':String(i)} }) );
          doneYear.push(String(i));
        }
      } //if
    } //for
    //check return is empty. Maybe stock symbol error. 
    var doc = await( dbs.collection('stockdata' + marketType).findAsync({"stockId":stockId})
                                             .then ( function(cursor){ return cursor.toArrayAsync() })
                                             .then ( function(docs){/*console.log(docs)*/; return docs; })
    )
    //console.log("stockData.historyData of download:");
    //console.log(doc);
    //console.log(doc[0].historyData);
    if (doc[0].historyData=="") pollMsgQueue.push(stockId + " " + from +" to " + to + " download is Empty.\n"); 
    else {
      pollMsgQueue.push(stockId + " "+ from +" to " + to +" download OK.\n");
    }
    resolver.resolve();
  })();
  return resolver.promise;
}
/* StockSymbol  is define by user like xxxx.TW, xxxx. MarketType is group of porfolio that can put different market like xxxx.TW xxxx.HK stock in the same portfolio . 
     StockId + marketId locate the index of data in mongodb. StockId is primary key of stockData and marketId define the different collection in Mongodb.
*/
//sweep all stock in portfolio and check stock's market type. Then  download stock data of by market type.
StockData.download = function(pfGroup, pollMsgQueue, callback){
  var marketType,found;
  var portfolio,i,j,resString;

  Portfolio.get({"group":pfGroup}, {"name":1,"index":1,"stockArray":1}, function (err, portfolioArray) { //get all portfolio of one group
    if (err) {
      console.log("Error");
      return 	0;
    } 
    portfolioArray.sort(function(a,b){ return a.index-b.index; })
    asynca(function(){
    for(i=0 ; i< portfolioArray.length ;i++) { //loop 1
      portfolio=portfolioArray[i];
      console.log(portfolio);
      console.log("download stockData in portfolio " + portfolio.name);
      for(j=0 ; j< portfolio.stockArray.length ;j++) { //loop 2
        stockId=portfolio.stockArray[j].stockId;
        marketType=portfolio.stockArray[j].marketType;
        //console.log("stockSymbol:",stockSymbol);
        //stockId=stockUtil.getStockIdFromSymbol(pfGroup,stockSymbol); //parse symbol is  xxxx.TW, xxxx.US in portfolio
        //marketType=stockUtil.getMarketTypeFromSymbol(pfGroup,stockSymbol);
        //console.log("stockId=" + stockId);
        //console.log("marketType=" + marketType);
        pollMsgQueue.push(stockId + " downloading...\n");
        await( stockDataDownload(marketType, stockId, pollMsgQueue));
        pollMsgQueue.push(stockId + " downloading OK.\n");
      } //loop 2 
    } //loop1
    callback();
  })();
  });
}

StockData.getHistoryLastData = function(stockId, marketType, callback){
//var cmdString=[{$match:{stockId:'2498'}}]
//   stockUtil.mongodbAggregate('stockdata'+ marketType, cmdString)
    return promise.resolve()
    .then(function(){ return stockUtil.mongodbAggregate('stockdata'+ marketType, [{$match:{stockId:stockId}},{$unwind:'$historyData'},{$sort:{'historyData.date':-1}},{$limit:1}]) 
     })
    .catch(function(err){ console.log(err) })
    .nodeify(callback) //support both callack or promise then, callback type: funcion(err,result){...}
}

StockData.getHistoryData = function(stockId, marketType, from, to, callback){
    return promise.resolve()
    .then(function(){return stockUtil.mongodbAggregate('stockdata'+ marketType,[{$match:{stockId:stockId}},{$project:{_id:0,historyData:1}},{$unwind:'$historyData'},{$match:{'historyData.date':{$gte:from,$lte:to}}},{$project:{date:'$historyData.date',open:'$historyData.open',close:'$historyData.close',high:'$historyData.high',low:'$historyData.low',volume:'$historyData.volume'}}])
     })
    //.then(function(result){console.log("LLLLLL"); console.log(result)})
    .catch(function(err){ console.log(err) })
    .nodeify(callback) //support both callack or promise then, callback type: funcion(err,result){...}
}

module.exports = StockData;
