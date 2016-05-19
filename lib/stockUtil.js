/*
pfGroup:交易市場TW,HK,US. 
stockSymbol是show給使用者看的股票代號.存在資料庫要轉成stockId和marketType
stockId各市場官方股票代碼,港股官方代碼為5碼,yahoo只能用4碼查詢,我們存在db上的stockId會把開頭為0的都去掉.
pfGroup + stockSymbol  -> marketType -> collections
pfGroup + stockSymbol  -> stockId -> as primary key of stockData 
marketType + stockId -> marketId -> 區別上市, 上櫃
marketType + stockId -> StockName
*/

var express = require('express');
var promise = require('bluebird');
var mongodb = promise.promisifyAll(require('mongodb'));
var mongoClient = mongodb.MongoClient;

var asynca = require('asyncawait/async')
    await = require('asyncawait/await');

var fs = require('fs');
var _=require('lodash');
 
//console.log(__filename);
//console.log(__dirname);
var curPath=__dirname;
var config = require(curPath + '/ini').parse(fs.readFileSync(curPath + '/../config.ini', 'utf-8')),
    urlMongodb=config.urlMongodb;

var request = promise.promisifyAll(require('request'));
var cheerio=require('cheerio');

function mongodbInsert(collectionName, cmdString, callback)
{
  return promise.resolve()
    .then(function(){ return mongoClient.connectAsync(urlMongodb) })
    .then(function(db){ return db.collection(collectionName).insertAsync(cmdString)
                               .then(function(){ return db.closeAsync() })
     })
    .catch(function(err){ console.log(err) })
    .nodeify(callback) //support both callack or promise then, callback type: funcion(err,result){...}
}

function mongodbFind(collectionName, queryString, projectionString, callback)
{
  return promise.resolve()
    .then(function(){ return mongoClient.connectAsync(urlMongodb) })
    .then(function(db){ return db.collection(collectionName).findAsync(queryString, projectionString)
                               .then(function(cursor){ return cursor.toArrayAsync() })
                               .then(function(doc){ return db.closeAsync()
                                                             .then(function(){ return doc }) 
                                })
     })
    .catch(function(err){ console.log(err) })
    .nodeify(callback) //support both callack or promise then, callback type: funcion(err,result){...}
}

function mongodbUpdate(collectionName, selectString, updateString, callback)
{
  return promise.resolve()
    .then(function(){ return mongoClient.connectAsync(urlMongodb) })
    .then(function(db){ return db.collection(collectionName).updateAsync(selectString, updateString)
                               .then(function(){ return db.closeAsync() })
     })
    .catch(function(err){ console.log(err) })
    .nodeify(callback) //support both callack or promise then, callback type: funcion(err,result){...}
}

function mongodbRemove(collectionName, cmdString, callback)
{
  return promise.resolve()
    .then(function(){ return mongoClient.connectAsync(urlMongodb) })
    .then(function(db){ return db.collection(collectionName).removeAsync(cmdString)
                                 .then(function(){ return db.closeAsync() })
     })
    .catch(function(err){ console.log(err) })
    .nodeify(callback) //support both callack or promise then, callback type: funcion(err,result){...}
}

function mongodbAggregate(collectionName, cmdString, callback)
{
  return promise.resolve()
    .then(function(){ return mongoClient.connectAsync(urlMongodb) })
    .then(function(db){ return db.collection(collectionName).aggregateAsync(cmdString)
                              // .then(function(cursor){ return cursor.toArrayAsync() })
                               .then(function(doc){ return db.closeAsync()
                                                             .then(function(){ return doc }) 
                                })
     })
    .catch(function(err){ console.log(err) })
    .nodeify(callback) //support both callack or promise then, callback type: funcion(err,result){...}
}

function searchStockNameFromCSV(marketType,queryString){
  var regStr, re, text;
  var matches, found=[] ;
      //regStr= '^(\\d+)' + ' ' + '(\\S*)' + queryString + '(\\S*)$'  // 取出數字部份
      regStr=  '^(\\d+)' + ' ' + '((\\S*)' + queryString + '(\\S*))$'  // 取出數字部份
      //console.log(regStr);
    re=new RegExp(regStr,'gm');
  if (marketType=="US") return stockName
  if (marketType=="TW") {
    text = fs.readFileSync(curPath + "/台股上市公司20160324.csv","utf8");
    while (matches = re.exec(text)) {
        //console.log(matches);
        found.push(matches[2]);
    } 
    text = fs.readFileSync(curPath + "/台股上櫃公司20160324.csv","utf8");
    while (matches = re.exec(text)) {
        // console.log(matches);
         found.push(matches[2]);
    } 
      //console.log(found);
     return found
  } 
  if (marketType=="HK"){
      text = fs.readFileSync(curPath + "/港股代碼20160212.csv","utf8");
      while (matches = re.exec(text)) {
        // console.log(matches);
         found.push(matches[2]);
      } 
      //console.log(found);
      if (found!=null) { return found } //返回港股代號
      return null
  }
}

function getStockNameFromCSV(marketType, stockId){
  var regStr, re, text, found,found1;
    //regStr= '^' + stockId + " " + '((:?\\D+)(:?\\w*))' + '$'; // 取出非數字部份
    regStr= '^' + stockId + " " + '((:?\\D)(:?[^\n]*$))' ; // 取出非數字部份
    re=new RegExp(regStr,'m');
  if (marketType=="US") return stockId
  if (marketType=="TW") { //找上市公司名單
    text = fs.readFileSync(curPath + "/台股上市公司20160324.csv","utf8");
    found1=text.match(re);
    if (found1!=null) { 
      //console.log(found1);
      found=found1[0].match(/(\D+\w*)/);
      //console.log(re);
      //console.log(found);
      if (found!=null) { return found[0].trim() } //返回上市公司名稱
    } else { //上市公司名單中找不到,改找上櫃公司名單
      text = fs.readFileSync(curPath + "/台股上櫃公司20160324.csv","utf8");
      found=text.match(re);
      //console.log(found);
      if (found!=null) { return found[1].trim() } //返回上櫃公司名稱
    }
    return null  //上市櫃名單中都找不到
  }
  if (marketType=="HK"){
      //console.log(stockId);
      stockId1=String(parseInt(stockId)); //去掉開頭0部份例如00836 變 836
      //regStr= '^(:?[0]*)' + stockId1 + " " + '((:?\\D+)(:?\\w*))\\n'; // 取出非數字部份
      regStr= '^(:?[0]*)' + stockId1 + " " + '((:?\\D)(:?[^\n]*$))'; // 取出非數字部份
      re=new RegExp(regStr,'m'); //'m'表示multi line,會讓^符號把換行字元\n也算開頭
      text = fs.readFileSync(curPath + "/港股代碼20160212.csv","utf8");
      found1=text.match(re);
      if (found1!=null) { 
        //console.log(found1);
        found=found1[0].match(/(\D+\w*)/);
        //console.log(re);
        //console.log(found);
        if (found!=null) { return found[0].trim() } //返回港股公司名稱
      } 
      return null 
  } 
  return null 
}

function getStockIdFromCSV(marketType, stockName){
  var regStr, re, text, found;
  var regStr= '^(\\d+)' + ' ' + stockName + '$'  // digit
    re=new RegExp(regStr,'m');
  if (marketType=="US") return stockName
  if (marketType=="TW") {
    text = fs.readFileSync(curPath + "/台股上市公司20160324.csv","utf8");
    found=text.match(re);
      //console.log(text);
      //console.log(found);
    if (found!=null) { return found[1].trim() } //返回上市公司名稱
    else {
      text = fs.readFileSync(curPath + "/台股上櫃公司20160324.csv","utf8");
      found=text.match(re);
      //console.log(found);
      if (found!=null) { return found[1].trim() } //返回上櫃公司名稱
    }
     return null
  } 
  if (marketType=="HK"){
      text = fs.readFileSync(curPath + "/港股代碼20160212.csv","utf8");
      found=text.match(re);
      //console.log(found);
      if (found!=null) { return found[1].trim() } //返回港股代號
      return null
  }
  return null
}

function getMarketId(marketType, stockId){
  var regStr, re, text, found;
  if (marketType=="TW") { //台股上市或上櫃
    text = fs.readFileSync(curPath + "/台股上市公司20160324.csv","utf8");
    if (text.match(stockId) != null)  return marketType
      else { return marketType + 'O' }
  }  
  if (marketType=="US") { 
    var str= '"' + stockId +'"'; 
    //console.log(str);
    text = fs.readFileSync(curPath + "/NYSEcompanylist.csv","utf8");
    if (text.match(str) != null)  return "NYSE"
    text = fs.readFileSync(curPath + "/AMEXcompanylist.csv","utf8");
    if (text.match(str) != null)  return "NYSE"  //AMEX is acquire by NASDAQ
    text = fs.readFileSync(curPath + "/NASDAQcompanylist.csv","utf8");
    if (text.match(str) != null)  return "NASDAQ"
  }  
  if (marketType=="HK") { 
    return marketType
  }
  return marketType
}


function getMarketTypeFromSymbol(pfGroup, stockSymbol){ //Convert stockSymbol in protfolio to stockId and marketType
  var marketType, stockId, found;
        if (found = stockSymbol.match(/(^\S+)\.(\w+$)/i)) {  //symbol is  xxxx.TW, xxxx.US in portfolio
            //console.log("found1=" + found);
            stockId=found[1];
            marketType=found[2];
        } else {
            marketType=pfGroup;
        } 
        //console.log("stockId=" + stockId);
        //console.log("market=" + marketType);
     return  marketType
}

function getStockIdFromSymbol(pfGroup, stockSymbol){ //Convert stockSymbol in protfolio to stockId and marketType
  var marketType, stockId, found;
        if (found = stockSymbol.match(/(^\S+)\.(\w+$)/i)) {  //symbol is  xxxx.TW, xxxx.US in portfolio
            //console.log("found1=" + found);
            stockId=found[1];
            marketType=found[2];
        } else {
          stockId=stockSymbol;
        } 
        //console.log("stockId=" + stockId);
        //console.log("market=" + marketType);
     return  stockId
}

function importPortfolioFile(file){ //After import csv, return portfolio 2D Array[i][j], i:portfolio(excel column), j:stock(excel row)
  var text,inArray=[],outArray=[];
  var i,j,icount,jCount;
  text=fs.readFileSync(file, 'utf8'); //read file content as string
  console.log(text);
  inArray=text.split('\n');
  inArray.pop();
  console.log(inArray);
  inArray.forEach(function(item,index){
    inArray[index]=item.split(',')
  });
  //console.log(inArray);
  iCount=inArray[0].length; //column
  jCount=inArray.length; //row
  for(i=0; i<iCount; i++){ //matrix transpose
    outArray[i]=[];
    for(j=0; j<jCount; j++){
      outArray[i][j]=inArray[j][i];
    }
  }
  console.log(outArray);
  outArray.forEach(function(item,index){
    _.remove(outArray[index],function(item,index){ return item=='' }); //remove [] in output array.
  });
  //console.log("outArray:");
  //console.log(outArray);
  return outArray;
}

function getStockIdFromPfLine(pfdata){ //line by line read stockId + stockname of import file, return stockId
  var regStr, found=[] ;
  var regStr= '(\\d+)' + '(:?(:?\\x020)*)[^0-9](\\S*)'   // get digit part
      //console.log(regStr);
    re=new RegExp(regStr);
      //console.log(stockId);
      found=pfdata.match(re); //get stockId part
      if (found!=null) { //trim space and begin 0. for example 00836 become 836. then return stockId.  
         return String(parseInt(found[1].trim())); 
      }
      else return "";       
}

function googleHistory(queryStockId,from,to,callback)
{ 
  var from=new Date(from); 
  var to=new Date(to); 
  var months = "Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec".split(",");
  var queryFrom= months[from.getMonth()] + '+' + from.getDate() + '+' + from.getFullYear();
  var queryTo= months[to.getMonth()] + '+' +to.getDate() + '+' + to.getFullYear();
  console.log(queryFrom);
  console.log(queryTo);
  var urlGoogle="http://www.google.com/finance/historical?q=" + queryStockId;
  return promise.resolve()
    .then(function(){
       return request.getAsync({ 
                         uri:urlGoogle 
              })
              .spread(function (res, body) {
                        if (res.statusCode === 200) return body;
                        else {  throw new Error(util.format('status %d', res.statusCode)); }
              });

     })
    .then(function(body){     //Extract cid 
                      //console.log(body); console.log("PPPPPPPPPP");
                      $ = cheerio.load(body);
                      return $("input[name='cid']").attr("value");
     })
    .then(function(cid){
             var  url="http://www.google.com/finance/historical?cid=" + cid + 
                      "&startdate=" + queryFrom + "&enddate=" + queryTo + "&start=0&num=100";
                   console.log(url);
             //console.log('cid=' + cid);
       return request.getAsync({ 
                         uri:url 
              })
              .spread(function (res, body) {
                        if (res.statusCode === 200) return body;
                        else {  throw new Error(util.format('status %d', res.statusCode)); }
              })
              .then(function(body){ //extract csv table 
                     //console.log(body); console.log("PPPPPPPPPP");
                     return parseGoogleHistoryHtml(body);
              })
              .then(function(dataTable){
                     //console.log(dataTable)
                     var  url="http://www.google.com/finance/historical?cid=" + cid + 
                              "&startdate=" + queryFrom + "&enddate=" + queryTo + "&start=100&num=100";
                     console.log(url);
                 return request.getAsync({ 
                                   uri:url 
                        })
                        .spread(function (res, body) {
                                  if (res.statusCode === 200) return body;
                                  else {  throw new Error(util.format('status %d', res.statusCode)); }
                        })
                        .then(function(body){ //extract csv table 
                               //console.log(body); console.log("PPPPPPPPPP1111");
                               return dataTable.concat(parseGoogleHistoryHtml(body));
                        })
              })
              .then(function(dataTable){
                     //console.log(dataTable)
                     var  url="http://www.google.com/finance/historical?cid=" + cid + 
                              "&startdate=" + queryFrom + "&enddate=" + queryTo + "&start=200&num=100";
                     console.log(url);
                 return request.getAsync({ 
                                   uri:url 
                        })
                        .spread(function (res, body) {
                                  if (res.statusCode === 200) return body;
                                  else {  throw new Error(util.format('status %d', res.statusCode)); }
                        })
                        .then(function(body){ //extract csv table 
                               //console.log(body); console.log("PPPPPPPPPP");
                               return dataTable.concat(parseGoogleHistoryHtml(body));
                        })
              })
              .then(function(dataTable){ 
                      //console.log(dataTable);
                      dataTable.reverse();
                      return dataTable.map(function(element,index){
                        //console.log(element.date); 
                        date1=new Date(element.date);
                        return {date:date1, open:element.open, high:element.high, low:element.low, close:element.close, volume:parseFloat(element.volume)}
                      })
              })
     })
    .catch(function(err){ console.log(err) })
    .nodeify(callback)
}

function  parseGoogleHistoryHtml(body){
  var output=[],key=[],obj={};
  var $ = cheerio.load(body);
  dataTable= $("table.gf-table.historical_price").html();
  if (dataTable==null) return [];
  $ = cheerio.load(dataTable);
  $('tr').each(function(i,element){
     //console.log("i=" + i);
     //console.log($(this).html());
     $(this).children().each(function(j,element){
        if (i==0) key[j]=$(this).text().trim().toLowerCase();
        else{
          switch(j){
            case key.indexOf("date"): obj.date= new Date($(this).text().trim()); break;
            case key.indexOf("close"): obj.close= Number($(this).text().trim()); break;
            case key.indexOf("open"): obj.open= Number($(this).text().trim()); break;
            case key.indexOf("high"): obj.high= Number($(this).text().trim()); break;
            case key.indexOf("low"): obj.low= Number($(this).text().trim()); break;
            case key.indexOf("volume"): obj.volume= Number($(this).text().trim().replace(/,/g,'')); break; 
          }
        }
     //console.log("j=" + j);
     //console.log($(this).text());
     })
     //console.log(obj);
     if (i!=0) { output.push(JSON.parse(JSON.stringify(obj))); }
     // console.log(output);
  })
  //console.log(output);
  return output
}
exports.mongodbInsert =mongodbInsert;   
exports.mongodbFind =mongodbFind;   
exports.mongodbUpdate =mongodbUpdate;   
exports.mongodbRemove =mongodbRemove;   
exports.mongodbAggregate =mongodbAggregate;   
exports.getMarketTypeFromSymbol =getMarketTypeFromSymbol;      
exports.getMarketId =getMarketId;      
exports.getStockIdFromSymbol = getStockIdFromSymbol;
exports.getStockIdFromCSV = getStockIdFromCSV;
exports.getStockNameFromCSV = getStockNameFromCSV;
exports.searchStockNameFromCSV = searchStockNameFromCSV;
exports.importPortfolioFile = importPortfolioFile;
exports.getStockIdFromPfLine = getStockIdFromPfLine;
exports.googleHistory=googleHistory;
