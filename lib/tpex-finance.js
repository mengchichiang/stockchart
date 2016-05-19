/*
  台股個股歷史股價下載
  資料來源: 證券櫃檯買賣中心
  櫃買中心下載歷史股價網址為"http://www.tpex.org.tw/web/stock/aftertrading/daily_trading_info/st43.php?l=zh-tw"
*/

var request=require("request"),
    fs = require('fs'),
    iconv = require('iconv-lite');

//var url="http://www.tpex.org.tw/web/stock/aftertrading/daily_trading_info/st43_download.php?l=zh-tw&d=100/03&stkno=6121&s=0,asc,0";

/*
   useage: getHistorical({"symbol":"6121", "year"="100", "month"="03"}, function(err, symbol, quotes){});
 
*/
function getHistorical(params, callback) {
  var symbol = params.symbol || "6121",
      year = params.year,
      month = params.month,
      url="http://www.tpex.org.tw/web/stock/aftertrading/daily_trading_info/st43_download.php?l=zh-tw&d=" +
          year + "/" + month  +  "&stkno=" + symbol + "&s=0,asc,0";

  var options = { 
    encoding: null, //encodeing=null 下載會變成binary
    method:"GET",
    url: url
  };

  request(options, function (err, res, body) {
    if (err) {
      console.log('Error :' ,err)
      return
    }         
    csvUtf8=iconv.decode(body,"Big5"); //將原來下載的big碼變成utf8
    //console.log("Source File:\n" + csvUtf8);
    quotes=csvUtf8.split("\r\n"); //csv字串轉陣列
    quotes.splice(0,4); //刪除前4列
    quotes.splice((quotes.length-1),1); //刪除最後1列
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
        //console.log("found=",found);
        if (found!=null){
          str1= found[0];
          str2=str1.replace(/,/g,'').replace(/"/g,'');
          //console.log("str1="+ str1 + ", str2=" +str2);
          str=str.replace(str1,str2);
          //console.log("new str",str);
        }
      } while(found!=null);
      //console.log(str);
      //strArray=str.split(','); //轉2-D陣列
      str=str.replace(/"/g,'');
      quotes[index]=str;
    }
    //console.log("After process:\n", quotes);
    callback(err,symbol,quotes);
  });
}

exports.getHistorical = getHistorical;
