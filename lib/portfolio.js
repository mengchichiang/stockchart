var mongodb = require('mongodb');
var mongoClient = mongodb.MongoClient;
var fs = require('fs');
var config = require('../lib/ini').parse(fs.readFileSync('./config.ini', 'utf-8')),
    urlMongodb=config.urlMongodb;
var util=require("../lib/stockUtil");

/* 'Portfolio' is Object. 'portfolio' is mongodb document. 'portfolios'  mongodb collection name.*/
function Portfolio(group ,index , name, stockArray) {
  this.group = group;
  this.index = index;
  this.name = name;
  this.stockArray = stockArray;
}

Portfolio.prototype.save = function(callback) {
  var portfolio = {
    group: this.group,    //portfolio group
    index: this.index,  //order
    name: this.name,
    stockArray: this.stockArray
    };
  mongoClient.connect(urlMongodb, function (err, db) {
    if (err) {
      return callback(err);
    } else {
      var collection = db.collection('portfolios');
      collection.insert(portfolio, function (err, result) {
        db.close();
        if (err) {
          callback(err);
        } else {
          callback(null);//If success, return err=null
        }
     }); 
    } 
  });
};

Portfolio.get = function(query, projection, callback) {
  mongoClient.connect(urlMongodb,function (err, db) {
    if (err) {
        // console.log("Connection Fail to", urlMongodb);
      return callback(err);
    } else {
      //console.log("Connection established to", urlMongodb);
      var collection = db.collection('portfolios');
      collection.find(query, projection).toArray(function (err, docs) {
        db.close();
        if (err) {
          console.log("Mongodb Errorrrrrrr", err);
          return callback(err); //If error, return err
        }
        //console.log(docs);
        callback(null, docs);//If success, return object array.
      });
    };
  });
};

Portfolio.getByIndex = function(index, callback) {
      var query = {},
          projection = {};
      if (index) {
        query.index = index; //{ index:index }
      }
      console.log(query);
      Portfolio.get(query, projection, callback);
};

Portfolio.getAll = function(callback) {
      var query = {},
          projection = {};
      Portfolio.get(query, projection, callback);
};

Portfolio.getCount = function(query,callback) {
  mongoClient.connect(urlMongodb,function (err, db) {
    if (err) {
        // console.log("Connection Fail to", urlMongodb);
      return callback(err);
    } else {
      //console.log("Connection established to", urlMongodb);
      var collection = db.collection('portfolios');
      collection.find(query).count(function (err, count) {
        db.close();
        if (err) {
          console.log("Mongodb Errorrrrrrr", err);
          return callback(err);
        }
        //console.log("Portfolio Count:",count);
        callback(null, count);
      });
    }
  });
};


Portfolio.updateById = function(portfolio, callback) {
  var o_id = new mongodb.ObjectID(portfolio._id); 
  Portfolio.update({ _id:o_id }, {$set:{stockArray:portfolio.stockArray}}, callback);
}

Portfolio.update = function(selectString, updateString, callback) {
  mongoClient.connect(urlMongodb,function (err, db) {
    if (err) {
      console.log("Connection Fail to", urlMongodb);
      return callback(err);
    } else {
     // console.log("Connection established to", urlMongodb);
     // db.collection('portfolios').find(updatestr1).toArray( function(err,docs){ console.log(docs); repeat(i+1);});
      db.collection('portfolios').update(selectString, updateString , function(){ db.close(callback(err,result))});
    }    
  });
}

Portfolio.updateManyById = function(portfolios, callback) { //不更新stockArray欄位
  var i=0;
  //console.log(portfolios);
  mongoClient.connect(urlMongodb,function (err, db) {
    if (err) {
        // console.log("Connection Fail to", urlMongodb);
      return callback(err);
    } else {
     // console.log("Connection established to", urlMongodb);
      var collection = db.collection('portfolios');
      (function repeat(i){
         if(i >= portfolios.length){
           db.close();
           if (err) {
             console.log("Mongodb Errorrrrrrr", err);
             return callback(err);
           }
           callback(null, "Success");
         }else{
           var o_id = new mongodb.ObjectID(portfolios[i]._id); 
           //collection.find({ _id:o_id }).toArray( function(err,docs){ console.log(docs); repeat(i+1);});
           collection.update({ _id:o_id }, {$set:{group:portfolios[i].group,index:portfolios[i].index,
           name:portfolios[i].name}}, function(){ repeat(i+1); });
         }    
      })(0);
    };
  });
}

Portfolio.deleteManyById = function(pfDelArray, callback) {
var i=0;
console.log("YYYYYYYYYYYYYYYYYYYY");
console.log(pfDelArray);
  mongoClient.connect(urlMongodb,function (err, db) {
    if (err) {
        // console.log("Connection Fail to", urlMongodb);
      return callback(err);
    } else {
     // console.log("Connection established to", urlMongodb);
      (function repeat(i){
         if(i >= pfDelArray.length){
           db.close();
           if (err) {
             console.log("Mongodb Errorrrrrrr", err);
             return callback(err);
           }
           callback(null, "Success");
         }else{
           var o_id = new mongodb.ObjectID(pfDelArray[i]); 
           //console.log("i=" + i + o_id);
           //db.collection('portfolios').find({ _id:o_id }).toArray( function(err,docs){ console.log(docs); repeat(i+1);});
           db.collection('portfolios').remove({ _id:o_id }, function(){ repeat(i+1); });
         }    
      })(0);
    };
  });
}

Portfolio.deleteUpdate = function(pfGroup, portfolio, callback) { //delete all ptType old portfolo, create new pfGroup portfolio to collections
  console.log(portfolio);
  mongoClient.connect(urlMongodb,function (err, db) {
    if (err) {
        // console.log("Connection Fail to", urlMongodb);
        return callback(err);
    } else {
      //console.log("Connection established to", urlMongodb);
        if (portfolio.length==0) {
          db.collection('portfolios').remove({"group":pfGroup}, function (err, result) { callback(err,1); })
        }
        else {
          db.collection('portfoliosTemp').insert(portfolio, function (err, result) {
            if (err) {
              db.close();
              console.log(err);
            } else {
              db.collection('portfolios').remove({"group":pfGroup}, function(err,result){
                if (err) {
                  db.close();
                  console.log(err);
                } else {
                  db.collection('portfolios').insert(portfolio,function(err,result){
                    if (err) {
                      db.close();
                      console.log(err);
                    } else {
                      db.collection('portfoliosTemp').drop(function(err,result){
                        if (err) {
                          db.close();
                          console.log(err);
                        } else {
                          db.close();
                          console.log('update success');
                          callback(err,1);
                        }
                      });
                    }
                  });
                }
              });
            }
          });
        }
    }
  });
};

Portfolio.insertStock = function(pfGroup, pfIndex, stockIdObj, callback) { //insert stock symbol to stockArray of portfolio
  pfIndexNumber=parseInt(pfIndex.replace(/pf/g,""));
  mongoClient.connect(urlMongodb,function (err, db) {
    if (err) {
        // console.log("Connection Fail to", urlMongodb);
      return callback(err);
    } else {
      //console.log("Connection established to", urlMongodb);
      db.collection('portfolios').findOne({"group":pfGroup,"index":pfIndexNumber},function (err, doc) {
        if (err) {
          db.close();
          console.log("Mongodb Error", err);
          return callback(err);
        } else {
              console.log(doc);
          if (doc==null) { 
             console.log("find portfolio is null. Please create new  portfolio");
             return callback(null,doc); 
          }          
          console.log("add StockSymbol:", stockIdObj);
          doc.stockArray.push(stockIdObj);
          db.collection('portfolios').update({"group":pfGroup,"index":pfIndexNumber},{$set:{"stockArray":doc.stockArray}}, function(err,doc2){
            if (err) {
              db.close();
              console.log("Mongodb Error", err);
              return callback(err);
            } else {
              callback(null, doc2);
            }
          });
        }
      });
    };
  });
};

Portfolio.updateStockArray = function(pfGroup, pfIndex, portfolio, callback) { //update stockArray in portfolio
  var pfIndexNumber=parseInt(pfIndex.replace(/pf/g,""));
  Portfolio.update({"group":pfGroup,"index":pfIndexNumber},{$set:{"stockArray":portfolio.stockArray}}, callback);
};

Portfolio.update = function(queryString, updateString, callback) { //update stockArray in portfolio
  mongoClient.connect(urlMongodb,function (err, db) {
    if (err) {
        // console.log("Connection Fail to", urlMongodb);
      return callback(err);
    } else {
      //console.log("Connection established to", urlMongodb);
        db.collection('portfolios').update(queryString, updateString, function(err,doc){
          if (err) {
            db.close();
            console.log("Mongodb Errorrrrrrr", err);
            return callback(err);
          } else {
              callback(null, doc);
          }
        });
    }
 });
};

module.exports = Portfolio;
