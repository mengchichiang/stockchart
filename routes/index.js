var express = require('express');
var router = express.Router();
var Portfolio = require('../lib/portfolio.js'),
    stockUtil = require('../lib/stockUtil.js'),  
    stockData = require('../lib/stockData.js');  

var fs = require('fs');
var portfolioCount=0;

router.get('/', function (req, res) {
   res.redirect("/portfolio");
});

router.get('/portfolio', function (req, res) {
   res.redirect("/portfolio/TW");
});

router.get('/portfolio/:pfGroup(TW|US|HK)', function (req, res) {
   ppppp="/portfolio/" + req.params.pfGroup + "/pf0"
   console.log(ppppp);
   //res.redirect("/portfolio" + req.params.pfGroup + "/pf0");
   res.redirect(ppppp);
});

router.get('/portfolio/:pfGroup/:pfIndex(pf[0-9])', function (req, res) {
  var pfGroup=req.params.pfGroup;
  var pfIndexNumber=parseInt(req.params.pfIndex.replace(/pf/g,""));
  //console.log("pfIndex",pfIndexNumber);
  //console.log("pfGroup",pfGroup);
  Portfolio.get({"group":pfGroup}, {"_id":0,"group":1,"index":1,"name":1}, function (err, pfNameArray) { //get all portfolio name of selected pfGroup
    if (err) {
      pfNameArray = [];
    } 
    pfNameArray.sort(function(a,b){ return parseInt(a.index)-parseInt(b.index); });
    //console.log(pfNameArray);
    Portfolio.get({"group":pfGroup,"index":pfIndexNumber},{},function (err, portfolio) {  //get selected portfolio to list stockArray
      if (err) {
        console.log("Portfolio not find");
        portfolio = [];
      } 
      console.log(JSON.stringify(portfolio));
      res.render('portfolio', {
        pfGroup: pfGroup,
        pfIndex: req.params.pfIndex,
        pfNameArray: pfNameArray,
        currentPortfolio: JSON.stringify(portfolio[0]), // get {obj} from 1D object array [{object}] as parameter 
      });
    });
  });
});

/* edit  portfolio */
router.get('/portfolio/:pfGroup/edit', function (req, res) {
      var curPath=__dirname;
      var rootPath=curPath.replace(/\/routes/g,"");
      //console.log(curPath);
      //console.log(rootPath);
      res.sendFile( rootPath + '/views/portfolioGroup_edit.html' );
});

/* reorder  portfolio */
router.get('/portfolio/:pfGroup/reorder', function (req, res) {
      var curPath=__dirname;
      var rootPath=curPath.replace(/\/routes/g,"");
      //console.log(curPath);
      //console.log(rootPath);
      res.sendFile( rootPath + '/views/portfolioGroup_reorder.html' );
});

/* create portfolio */
router.get('/portfolio/:pfGroup/create', function (req, res) {
      var curPath=__dirname;
      var rootPath=curPath.replace(/\/routes/g,"");
      //console.log(curPath);
      //console.log(rootPath);
      res.sendFile( rootPath + '/views/portfolioGroup_create.html' );
});

router.post('/portfolio/:pfGroup/create', function (req, res) {
  createPortfolio(req.params.pfGroup, req.body.pfName, req.body.symbol,function(err){
    if (err) {
      return res.redirect('/portfolio/' + req.params.pfGroup);
    }
    res.redirect('/portfolio/' + req.params.pfGroup);
  });
});

function createPortfolio(pfGroup, portfolioName, symbolList, callback){
  var stockArray=[];
  var inputArray=[];
  var stockSymbol='';
  if (symbolList != '') {  inputArray=symbolList.toUpperCase().split(" "); 
    for(i=0; i<inputArray.length ;i++)
      {
        stockSymbol=inputArray[i];
        //the followings copy from addSymbol
        marketType = stockUtil.getMarketTypeFromSymbol(pfGroup, stockSymbol); //If stockSymbol not "xxxx.HK" form, set marketType=pfGroup
        stockSymbol1= stockUtil.getStockIdFromSymbol(pfGroup, stockSymbol);//If stockSymbol=xxxx.HK, stockSymbol1=xxxxx
        stockName = stockUtil.getStockNameFromCSV(marketType ,stockSymbol1); //Assume input is stockName. if input not in CSV, stockName is set Null 
        stockId = stockUtil.getStockIdFromCSV(marketType, stockSymbol1); //Assume input is stockId.  if input not in CSV, stockId is set as null
        if ((stockId==null) && (stockName!=null)) { stockId=stockSymbol1; } //input is stockId
        if ((stockId!=null) && (stockName==null)) { stockName=stockSymbol1; }  //input is stockName
        if ((stockId==null) && (stockName==null)) { stockId=stockSymbol1; }  //input can't found in csv Table
        stockArray.push( {"stockId":stockId , "stockName":stockName, "marketType":marketType});
      }
       // console.log(stockArray);
  }
  Portfolio.getCount({"group":pfGroup},function(err,portfolioCount){ //set portfolio index field = the last one in group
    //console.log("portfolioCount",portfolioCount); 
    var newPortfolio=new Portfolio(pfGroup, portfolioCount, portfolioName, stockArray );
    console.log(newPortfolio);
    newPortfolio.save(callback);
  });
}
/* End create portfolio */
/* delete portfolio */
router.get('/portfolio/:pfGroup/delete', function (req, res) {
      var curPath=__dirname;
      var rootPath=curPath.replace(/\/routes/g,"");
      res.sendFile( rootPath + '/views/portfolioGroup_delete.html' );
});

//for Ajax of  portfolioGroup_edit.html, portfolioGroup_reorder.html, portfolioGroup_delete.html
//PortfolioList response all portfolio of selected group but response not include stockArray field.
router.post('/portfolio/:pfGroup/portfolioList', function (req, res) { 
  Portfolio.get({"group":req.params.pfGroup},{"_id":1,"group":1,"index":1,"name":1},function (err, portfolios) { //get all portfolio name of pfGroup  
     if (err) {
       portfolios = [];
       console.log(err);
     } 
     console.log(portfolios);
     res.json(portfolios);
   });
});

//for Ajax of portfolioGroup_edit.html and portfolioGroup_reorder.html
router.post('/portfolio/:pfGroup/updatePortfolioList', function (req, res) { //update portfolio in the group except stockArray field.
  console.log(JSON.parse(JSON.stringify(req.body)));
  Portfolio.updateManyById(req.body, function(err,result){ 
    res.send(String(result));
  });
});

//for Ajax portfolioGroup_delete.html
//req.body.delete is portfolio _id that will be deleted, req.body.update is portfolio that will be updated(update "group,name,index" field)
router.post('/portfolio/:pfGroup/deletePortfolioList', function (req, res) {
  console.log(JSON.parse(JSON.stringify(req.body)));
  Portfolio.deleteManyById(req.body.delete, function(err,result){  
     Portfolio.updateManyById(req.body.update, function(err,result){
       res.send(String(result));  
     });
  });
});

router.get('/portfolio/:pfGroup/import', function (req, res) {
  var curPath=__dirname;
  var rootPath=curPath.replace(/\/routes/g,"");
  res.sendFile( rootPath + '/views/portfolioGroup_import.html' );
});

router.post('/portfolio/:pfGroup/import', function (req, res) {
  var curPath=__dirname,qryString='';
  var rootPath=curPath.replace(/\/routes/g,"");
  var i,iCount,pfNameArray=[];
  //console.log(req.files);
  importFile=rootPath + "/" + req.files.upload.path;
  var inArray=stockUtil.importPortfolioFile(importFile);
  console.log("import Array:");
  console.log(inArray);
  for(i=0,iCount=inArray.length ; i<iCount ; i++){    //delete [] in the inArray (empty column in CSV)
    if (inArray[i].length==0) { inArray.splice(i,1); i--; iCount--}
  }
  inArray.forEach(function(element,index){ pfNameArray.push(element.shift()); } ) //take out portfolio Name of first row
  console.log(inArray);
  console.log(pfNameArray);
  if (req.params.pfGroup=='HK'){ //tranform stockId+stockName to stockId
    inArray.forEach(function(itemI,indexI){
      itemI.forEach(function(itemJ,indexJ){
        var stockId=stockUtil.getStockIdFromPfLine(itemJ); //itemJ is symbol
        inArray[indexI][indexJ]=stockId;
        //console.log(itemJ);
        //console.log(stockId);
      }); 
    });
  }
  console.log("Final Array:");
  console.log(inArray);
  var i=0;
  (function repeat(i){
    if (i>=inArray.length) return res.redirect('/portfolio/' + req.params.pfGroup);
    else{
       createPortfolio(req.params.pfGroup, pfNameArray[i], String(inArray[i]).replace(/,/g,' '), function(){ repeat(i+1); } );
    }
  })(0)
});

router.get('/portfolio/:pfGroup/export', function (req, res) {
	var curPath=__dirname, rootPath=curPath.replace(/\/routes/g,"");
	var pfGroup=req.params.pfGroup;
	var i,iCount,j,jCount,maxjCount=0,pfArray=[],exportArray=[],tempArray=[],temp2Array=[],csvText='';
  //console.log("pfGroup",pfGroup);
  Portfolio.get({"group":pfGroup}, {"index":1,"name":1,"stockArray":1}, function (err, pfArray) { //get all portfolio name of one pfGroup
    if (err) {
      pfArray=[];
    } 
    pfArray.sort(function(a,b){ return parseInt(a.index)-parseInt(b.index); });
    //console.log(pfArray);
    //console.log(pfArray[0].stockArray);
    //res.sendFile( rootPath + '/views/portfolioGroup_export.html' );
    iCount=pfArray.length;
    for(i=0; i<iCount ; i++){ //i: portfolio, j: stockObj
    tempArray[i]=[];
      jCount=pfArray[i].stockArray.length
        for(j=0; j<jCount ; j++){
          if (pfGroup=='TW') { if (pfArray[i].stockArray[j].marketType=='US') tempArray[i][j] = pfArray[i].stockArray[j].stockId + '.US';
                               else
                                 tempArray[i][j] = pfArray[i].stockArray[j].stockName;//TW stock export stockName 
                              }
          //港股export stockId + stockName
          if (pfGroup=='HK') {  if (pfArray[i].stockArray[j].marketType=='US') tempArray[i][j] = pfArray[i].stockArray[j].stockId + '.US';
                                else
                                  tempArray[i][j] = pfArray[i].stockArray[j].stockId + pfArray[i].stockArray[j].stockName; 
                             }
          if (pfGroup=='US') tempArray[i][j] = pfArray[i].stockArray[j].stockId;//US stock export stockId
        }
        if (jCount>maxjCount) maxjCount=jCount;       
        tempArray[i].unshift(pfArray[i].name); //add portfolio name
    }
    maxjCount++;
    //console.log(tempArray);
    //transpose
    for(j=0; j<maxjCount; j++){
      temp2Array[j]=[];
      for(i=0; i<iCount; i++){
        if (tempArray[i][j]==undefined) tempArray[i][j]=''
        temp2Array[j][i]=tempArray[i][j];
      }
    }
    //console.log(temp2Array);
    temp2Array.forEach(function(item,index){
      csvText=csvText + item.join(',') + '\n';
    });
    res.attachment("portfolio" + pfGroup +".csv");
    res.end(csvText);
  });
});

router.post('/portfolio/:pfGroup/:pfIndex/addSymbol', function (req, res) {
  var stockSymbol, marketType, stockId, stockName;
  if (req.body.symbol != '') {
    stockSymbol=req.body.symbol.toUpperCase();
    marketType = stockUtil.getMarketTypeFromSymbol(req.params.pfGroup, stockSymbol); //If stockSymbol not "xxxx.HK" form, set marketType=pfGroup
    console.log('addSymbol=' + stockSymbol);
    console.log(marketType);
    stockSymbol1= stockUtil.getStockIdFromSymbol(req.params.pfGroup, stockSymbol);//If stockSymbol=xxxx.HK, stockSymbol1=xxxxx
    stockName = stockUtil.getStockNameFromCSV(marketType ,stockSymbol1); //Assume input is stockName. if input not in CSV, stockName is set Null 
    stockId = stockUtil.getStockIdFromCSV(marketType, stockSymbol1); //Assume input is stockId.  if input not in CSV, stockId is set as null
    console.log("KKKKKKK");
    console.log(stockId);
    console.log(stockName);
    if ((stockId==null) && (stockName!=null)) { stockId=stockSymbol1; } //input is stockId
    if ((stockId!=null) && (stockName==null)) { stockName=stockSymbol1; }  //input is stockName
    if ((stockId==null) && (stockName==null)) { stockId=stockSymbol1; }  //input can't found in csv Table
    console.log(stockId);
    var found = stockSymbol.match(/(^\S+)\.(\w+$)/i)  //symbol is  xxxx.TW, xxxx.US in portfolio
    if ((marketType=="HK") && (found==null) && (!isNaN(Number(stockId)))) stockId=String(Number(stockId));
    console.log(stockId);
    console.log("marketType=",marketType);
    console.log("stockSymbol1=",stockSymbol1);
    console.log("stockId=",stockId);
    console.log("stockName=",stockName);

    Portfolio.insertStock(req.params.pfGroup,req.params.pfIndex, {"stockId":stockId , "stockName":stockName, "marketType":marketType},function (err,docs) {
      if (err) {
        //req.flash('error', err); 
        return res.redirect('/');
      }
      //console.log('Success');
    });
  }
  res.redirect('/portfolio/' + req.params.pfGroup + '/' + req.params.pfIndex);
});

//for Ajax of portfolioSymbol_edit.html, portfolioSymbol_reorder.html. Response the portfolio that include stockArray
router.post('/portfolio/:pfGroup/:pfIndex(pf[0-9])/symbolList', function (req, res) { //ajax response
  pfGroup=req.params.pfGroup;
  pfIndex=req.params.pfIndex;
  pfIndexNumber=parseInt(req.params.pfIndex.replace(/pf/g,""));
  console.log("pfIndex",pfIndexNumber);
  console.log("pfGroup",pfGroup);
  Portfolio.get({"group":pfGroup,"index":pfIndexNumber},{},function (err, portfolio) {  //get one portfolio to list stockArray
    if (err) {
      portfolio = [];
    } 
    console.log("TTTTTTTTTT");
    console.log(portfolio);
    console.log(JSON.stringify(portfolio[0].stockArray));
     res.json(portfolio[0]);
   });
});

//for Ajax of portfolioSymbol_edit.html, portfolioSymbol_reorder.html. Update stockArray in the portfolio.
router.post('/portfolio/:pfGroup/:pfIndex/updatePortfolioSymbolList', function (req, res) {
  console.log("req.body");
  console.log(req.body);
  if (req.body != '') {
    Portfolio.updateById(req.body, function (err,result) {
       res.redirect('/portfolio/' + req.params.pfGroup + '/' + req.params.pfIndex);
    })
  } else
  res.redirect('/portfolio/' + req.params.pfGroup + '/' + req.params.pfIndex);
});

/* edit symbol */
router.get('/portfolio/:pfGroup/:pfIndex(pf[0-9])/edit', function (req, res) {
      var curPath=__dirname;
      var rootPath=curPath.replace(/\/routes/g,"");
      //console.log(curPath);
      //console.log(rootPath);
      res.sendFile( rootPath + '/views/portfolioSymbol_edit.html' );
});

/* reorder symbol */
router.get('/portfolio/:pfGroup/:pfIndex(pf[0-9])/reorder', function (req, res) {
      var curPath=__dirname;
      var rootPath=curPath.replace(/\/routes/g,"");
      //console.log(curPath);
      //console.log(rootPath);
      res.sendFile( rootPath + '/views/portfolioSymbol_reorder.html' );
});

router.get('/portfolio/:pfGroup/:pfIndex(pf[0-9])/chart', function (req, res) {
      //console.log("req.query=");      
      console.log(req.query);      
      var curPath=__dirname;
      var rootPath=curPath.replace(/\/routes/g,"");
      //console.log(curPath);
      //console.log(rootPath);
      Portfolio.getCount({"group":req.params.pfGroup},function(err,portfolioCount){ //set portfolio index field = the last one in group
        //console.log("portfolioCount",portfolioCount); 
        res.render( 'portfolioSymbol_chart', 
                  { stockObj:JSON.stringify({stockId:req.query.stockId, marketType:req.query.marketType, stockName:req.query.stockName}),
                    period:req.query.period, portfolioCount:portfolioCount	
                  });
      });
});

//for  portfolioSymbol.edit.html and addSymbol in portfolio.ejs.
router.get('/portfolio/:pfGroup/:pfIndex(pf[0-9])/getStockNameAuto', function (req, res) { //for autocomplete. Return stock name in CSV file
  //console.log("req.query",req.query);
  res.send(stockUtil.searchStockNameFromCSV(req.params.pfGroup, req.query.term));
})

//for portfolioSymbol.edit.html and addSymbol in portfolio.ejs.
router.get('/portfolio/:pfGroup/:pfIndex(pf[0-9])/getStockIdName', function (req, res) {
  var stockSymbol, marketType, stockId, stockName;
    console.log("req.query",req.query);              //queryString stockId is regard as stockSymbol. Input maybe XXXX.TW format
  if ((req.query.stockId !='')&&(req.query.stockId !=undefined)) { //keyin text in portfolioSymbol_edit.html stockId field, response mapped stockName
    //console.log("req.query.stockId",req.query.stockId);              ///queryString stockId is regard as stockSymbol. Input could be XXXX.TW format
    stockSymbol=req.query.stockId.toUpperCase();
    marketType = stockUtil.getMarketTypeFromSymbol(req.params.pfGroup, stockSymbol);
    stockId = stockUtil.getStockIdFromSymbol(req.params.pfGroup, stockSymbol);
    stockName = stockUtil.getStockNameFromCSV(marketType ,stockId); //if input is stock symbol
    console.log("stockName=",stockName);
    res.send(String(stockName));
  } 
  if ((req.query.stockName !='')&&(req.query.stockName !=undefined)) {//Keyin text in portfolioSymbol_edit.html stockName field,response mapped stockId
    //console.log("req.query.stockName",req.query.stockName);
    stockName=req.query.stockName.toUpperCase();
    marketType=req.params.pfGroup;
    stockId = stockUtil.getStockIdFromCSV(marketType, stockName); //if input is stock name
    console.log("stockId=",stockId);
    res.send(stockId);
  }
});

router.post('/portfolio/:pfGroup/:pfIndex(pf[0-9])/queryLastStockData', function (req, res) {
  //console.log("req.body",req.body);
  stockData.getHistoryLastData(req.body.stockId, req.body.marketType, function(err,result){ 
    //console.log(result);
    res.send(result);
  });
});

router.get('/portfolio/:pfGroup/:pfIndex(pf[0-9])/queryStockData', function (req, res) {
  console.log("req.query",req.query);
  var from=new Date("2000-01-01"),
      to=new Date();
  stockData.getHistoryData(req.query.stockId, req.query.marketType, from, to, function(err,result){ 
    //console.log(result);
    res.send(result);
  });
});

module.exports = router;
