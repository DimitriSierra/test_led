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
    exec(command, {maxBuffer: Infinity}, callback);
  };

  this.getOrderBook = function getOrderBook(callback) {
    var command = 'curl https://api.mybitx.com/api/1/orderbook?pair=XBTZAR';
    exec(command, {maxBuffer: Infinity}, callback);
  };

  this.getOrderBookPending = function getOrderBookPending(apiObject, callback) {
    var command = 'curl -u ' + apiObject.keyID + ':' + apiObject.secretID;
    command += ' https://api.mybitx.com/api/1/listorders?state=PENDING';
    exec(command, {maxBuffer: Infinity}, callback);
  };

  this.getTrades = function getTrades(callback) {
    var command = 'curl https://api.mybitx.com/api/1/trades?pair=XBTZAR';
    exec(command, {maxBuffer: Infinity}, callback);
  };

  this.getBalances = function getBalances(apiObject, callback) {
    var command = 'curl -u ' + apiObject.keyID + ':' + apiObject.secretID;
    command += ' https://api.mybitx.com/api/1/balance';
    exec(command, {maxBuffer: Infinity}, callback);
  };

  this.getListOrders = function getListOrders(apiObject, callback) {
    var command = 'curl -u ' + apiObject.keyID + ':' + apiObject.secretID;
    command += ' https://api.mybitx.com/api/1/listorders';
    exec(command, {maxBuffer: Infinity}, callback);
  };

  this.setPostLimitOrder = function setPostLimitOrder(apiObject, orderPrice, orderVolume, bidOrAsk, callback) {
    var command = 'curl -u ' + apiObject.keyID + ':' + apiObject.secretID + ' -X POST -d pair=XBTZAR';
    command += ' -d type=' + bidOrAsk + ' -d volume=' + orderVolume + ' -d price=' + orderPrice;
    command += ' https://api.mybitx.com/api/1/postorder';
    exec(command, {maxBuffer: Infinity}, callback);
  };

  this.setStopAnOrder = function setStopAnOrder(apiObject, orderID, callback) {
    var command = 'curl -u ' + apiObject.keyID + ':' + apiObject.secretID + ' -X POST -d order_id=';
    command += orderID + ' https://api.mybitx.com/api/1/stoporder';
    exec(command, {maxBuffer: Infinity}, callback);
  };
}

var lunoModule = new LunoClass();
module.exports = lunoModule;
