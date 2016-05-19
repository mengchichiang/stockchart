/*
  台股個股歷史股價下載
  資料來源: 證券櫃檯買賣中心
  櫃買中心下載歷史股價網址為"http://www.tpex.org.tw/web/stock/aftertrading/daily_trading_info/st43.php?l=zh-tw"
*/

var request=require("request"),
    fs = require('fs'),
    iconv = require('iconv-lite'),
    d3=require('d3');

//var url="http://www.twse.com.tw/ch/trading/exchange/STOCK_DAY/STOCK_DAY_print.php?genpage=genpage/Report201603/201603_F3_1_8_2498.php&type=csv";

/*
   useage: getHistorical({"symbol":"6121", "year"="100", "month"="03"}, function(err, symbol, quotes){});
 
*/
function getHistorical(params, callback) {
var symbol = params.symbol || "6121",
    year = params.year,
    month = params.month,
    url="http://www.twse.com.tw/ch/trading/exchange/STOCK_DAY/STOCK_DAY_print.php?genpage=genpage" +
         "/Report"+ year + month + "/" + year + month + 
         "_F3_1_8_" + symbol + ".php&type=csv";

var options = { 
  encoding: null, //encodeing=null 下載會變成binary
  method:"GET",
  url: url
};

  request(options, function (err, res, body) {
    var str,str1,str2;
    var found=[];
    if (err) {
      console.log('Error :' ,err)
      return
    }         
    csvUtf8=iconv.decode(body,"Big5"); //將原來下載的big碼變成utf8
    //console.log("Source File:\n" + csvUtf8);
    quotes=csvUtf8.split("\n"); //csv字串轉陣列
    quotes.splice(0,1); // 刪除第1列
    quotes.splice((quotes.length-1),1); //刪除最後1列
    //console.log(quotes);
    //一列一列處理0
    for (index = 0; index < quotes.length; index++) {    
      str=quotes[index];
      //console.log("str=",str);
      //轉換日期格式100/MM/DD為2011-MM-DD
      found=str.match(/(\d+)\/(\d+)\/(\d+)/);
      //console.log("found:"+found);
      if (found!=null) {
        newdate=String(1911+parseInt(found[1])) + "-" + found[2] + "-" + found[3];
        //console.log(newdate);
        str=str.replace(/(\d+)\/(\d+)\/(\d+)/,newdate);
        //console.log(str);
      }
      //轉換數字格式 d,ddd,ddd 為ddddddd
      do {
        found=str.match(/"[,0-9]*,(?:\d{3})+[.0-9]*"/);
        // console.log("found=",found);
        if (found!=null){
          str1= found[0];
          str2=str1.replace(/,/g,'').replace(/"/g,'');
         // console.log("str1="+ str1 + ", str2=" +str2);
          str=str.replace(str1,str2);
         // console.log("new str",str);
        }
      } while(found!=null);
      //strArray=str.split(',');
      //console.log(str);
      quotes[index]=str;
    }
    //console.log("After process:\n", quotes);
    callback(err,symbol,quotes);
  });
}

exports.getHistorical = getHistorical;
