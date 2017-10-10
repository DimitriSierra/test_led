var exec = require('child_process').exec;
var request = require('request');

function LunoClass() {
  this.getCurrentBTCZAR = function getCurrentBTCZAR(callback) {
    var url = 'https://www.luno.com/ajax/1/display_ticker';
    request(url, function (error, resp) {
      callback(error, resp);
    });
  };

  this.getTicker = function getTicker(callback) {
    var command = 'curl https://api.mybitx.com/api/1/ticker?pair=XBTZAR';
    exec(command, function (err, result) {
      err = JSON.parse(err);
      result = JSON.parse(result);
      callback(err, result);
    });
  };

  this.getOrderBook = function getOrderBook(callback) {
    var command = 'curl https://api.mybitx.com/api/1/orderbook?pair=XBTZAR';
    exec(command, function (err, result) {
      err = JSON.parse(err);
      result = JSON.parse(result);
      callback(err, result);
    });
  };

  this.getTrades = function getTrades(callback) {
    var command = 'curl https://api.mybitx.com/api/1/trades?pair=XBTZAR';
    exec(command, function (err, result) {
      err = JSON.parse(err);
      result = JSON.parse(result);
      callback(err, result);
    });
  };

  this.getBalances = function getBalances(apiObject, callback) {
    var command = 'curl -u ' + apiObject.keyID + ':' + apiObject.secretID;
    command += ' https://api.mybitx.com/api/1/balance';
    exec(command, function (err, result) {
      err = JSON.parse(err);
      if (result.indexOf('Unauthorized') !== -1) return callback(result);
      result = JSON.parse(result);
      callback(err, result);
    });
  };

  this.getListOrders = function getListOrders(apiObject, callback) {
    var command = 'curl -u ' + apiObject.keyID + ':' + apiObject.secretID;
    command += ' https://api.mybitx.com/api/1/listorders';
    exec(command, function (err, result) {
      err = JSON.parse(err);
      if (result.indexOf('Unauthorized') !== -1) return callback(result);
      result = JSON.parse(result);
      callback(err, result);
    });
  };

  this.setPostLimitOrder = function setPostLimitOrder(apiObject, orderPrice, orderVolume, bidOrAsk, callback) {
    var command = 'curl -u ' + apiObject.keyID + ':' + apiObject.secretID + ' -X POST -d pair=XBTZAR';
    command += ' -d type=' + bidOrAsk + ' -d volume=' + orderVolume + ' -d price=' + orderPrice;
    command += ' https://api.mybitx.com/api/1/postorder';
    exec(command, function (err, result) {
      err = JSON.parse(err);
      if (result.indexOf('Unauthorized') !== -1) return callback(result);
      result = JSON.parse(result);
      callback(err, result);
    });
  };

  this.setStopAnOrder = function setStopAnOrder(apiObject, orderID, callback) {
    var command = 'curl -u ' + apiObject.keyID + ':' + apiObject.secretID + ' -X POST -d order_id=';
    command += orderID + ' https://api.mybitx.com/api/1/stoporder';
    exec(command, function (err, result) {
      err = JSON.parse(err);
      if (result.indexOf('Unauthorized') !== -1) return callback(result);
      if (result.indexOf('Invalid order') !== -1) return callback(result);
      result = JSON.parse(result);
      callback(err, result);
    });
  };
}

var lunoModule = new LunoClass();
module.exports = lunoModule;
