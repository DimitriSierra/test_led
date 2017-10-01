var luno = require('./luno');
var _ = require('lodash');

function UtilsClass() {

  this.getCurrentPrice = function getCurrentPrice(callback) {
    luno.getTicker(function (err, result) {
      if (err) return callback(err);
      if (!result || !result.last_trade) return callback('Result unexpected');
      callback(err, result.last_trade);
    });
  };

  this.getOrderBookSummary = function getOrderBookSummary(numOrders, callback) {
    if (numOrders == null) return callback('numOrders passed incorrectly');
    if (!_.isInteger(numOrders)) return callback('numOrders not integer');
    if (numOrders <= 0) return callback('numOrders not larger than 0');
    luno.getOrderBook(function (err, result) {
      if (err) return callback(err);
      if (!result || !result.bids || !result.asks) return callback('Result unexpected');
      var arrayBids = result.bids.slice(0, numOrders);
      var arrayAsks = result.asks.slice(0, numOrders);
      var bidVolume = 0;
      var askVolume = 0;
      for (var i = 0; i < numOrders; i++) {
        bidVolume += parseFloat(arrayBids[i].volume);
        askVolume += parseFloat(arrayAsks[i].volume);
      }
      callback(err, {bidVolume: bidVolume, askVolume: askVolume});
    });
  };

  this.getRecentTradeSummary = function getRecentTradeCount(numTrades, callback) {
    if (numTrades == null) return callback('numTrades passed incorrectly');
    if (!_.isInteger(numTrades)) return callback('numTrades not integer');
    if (numTrades <= 0) return callback('numTrades not larger than 0');
    luno.getTrades(function (err, result) {
      if (err) return callback(err);
      if (!result || !result.trades) return callback('Result unexpected');
      var arrayTrades = result.trades.slice(0, numTrades);
      var boughtCount = 0;
      var soldCount = 0;
      for (var i = 0; i < numTrades; i++) {
        if (arrayTrades[i].is_buy === true) boughtCount++;
        else soldCount++;
      }
      callback(err, {boughtCount: boughtCount, soldCount: soldCount});
    });
  };

  this.getAccountBalances = function getAccountBalances(apiObject, callback) {
    if (!apiObject || !apiObject.keyID || !apiObject.secretID) {
      return callback('API Object passed incorrectly');
    }
    luno.getBalances(apiObject, function (err, result) {
      if (err) return callback(err);
      if (!result || !result.balance) return callback('Result unexpected');
      var xbtBalance = 0;
      var zarBalance = 0;
      for (var i = 0; i < result.balance.length; i++) {
        if (result.balance[i].asset === 'XBT') xbtBalance += parseFloat(result.balance[i].balance);
        if (result.balance[i].asset === 'ZAR') zarBalance += parseFloat(result.balance[i].balance);
      }
      callback(err, {xbtBalance: xbtBalance, zarBalance: zarBalance});
    });
  };

  this.getPendingOrders = function getPendingOrders(apiObject, callback) {
    if (!apiObject || !apiObject.keyID || !apiObject.secretID) {
      return callback('API Object passed incorrectly');
    }
    luno.getListOrders(apiObject, function (err, result) {
      if (err) return callback(err);
      if (!result || !result.orders) return callback('Result unexpected');
      var pendingOrderArrayBid = [];
      var pendingOrderArrayAsk = [];
      for (var i = 0; i < result.orders.length; i++) {
        if (result.orders[i].state !== 'PENDING') continue;
        var tempObject = {
          orderID: result.orders[i].order_id,
          type: result.orders[i].type,
          price: result.orders[i].limit_price,
          volume: result.orders[i].limit_volume
        };
        if (tempObject.type === 'BID') pendingOrderArrayBid.push(tempObject);
        else pendingOrderArrayAsk.push(tempObject);
      }
      callback(err, {pendingOrdersBid: pendingOrderArrayBid, pendingOrdersAsk: pendingOrderArrayAsk});
    });
  };

  this.setBuyOrder = function setBuyOrder(apiObject, orderPrice, orderVolume, callback) {
    if (!apiObject || !apiObject.keyID || !apiObject.secretID) return callback('API Object passed incorrectly');
    if (!orderPrice) return callback('OrderPrice passed incorrectly');
    if (!orderVolume) return callback('OrderVolume passed incorrectly');
    // orderPrice evaluation
    var iOrderPrice = parseInt(orderPrice);
    if (!_.isInteger(iOrderPrice)) return callback('OrderPrice invalid - not number string');
    if (iOrderPrice < 10) return callback('OrderPrice invalid - smaller than 10');
    // orderVolume evaluation
    var iOrderVolume = parseFloat(orderVolume);
    if (!iOrderVolume) return callback('OrderVolume invalid');
    if (iOrderVolume < 0.0005) return callback('OrderVolume invalid - smaller than 0.005');
    luno.setPostLimitOrder(apiObject, orderPrice, orderVolume, 'BID', function (err, result) {
      if (err) return callback(err);
      if (!result || !result.order_id) return callback('Result unexpected');
      callback(err, result.order_id);
    });
  };

  this.setSellOrder = function setSellOrder(apiObject, orderPrice, orderVolume, callback) {
    if (!apiObject || !apiObject.keyID || !apiObject.secretID) return callback('API Object passed incorrectly');
    if (!orderPrice) return callback('OrderPrice passed incorrectly');
    if (!orderVolume) return callback('OrderVolume passed incorrectly');
    // orderPrice evaluation
    var iOrderPrice = parseInt(orderPrice);
    if (!_.isInteger(iOrderPrice)) return callback('OrderPrice invalid - not number string');
    if (iOrderPrice < 10) return callback('OrderPrice invalid - smaller than 10');
    // orderVolume evaluation
    var iOrderVolume = parseFloat(orderVolume);
    if (!iOrderVolume) return callback('OrderVolume invalid');
    if (iOrderVolume < 0.0005) return callback('OrderVolume invalid - smaller than 0.005');
    luno.setPostLimitOrder(apiObject, orderPrice, orderVolume, 'ASK', function (err, result) {
      if (err) return callback(err);
      if (!result || !result.order_id) return callback('Result unexpected');
      callback(err, result.order_id);
    });
  };

  this.setStopOrder = function setStopOrder(apiObject, orderID, callback) {
    if (!apiObject || !apiObject.keyID || !apiObject.secretID) return callback('API Object passed incorrectly');
    if (!orderID) return callback('OrderID passed incorrectly');
    luno.setStopAnOrder(apiObject, orderID, function (err, result) {
      if (err) return callback(err);
      if (!result || !result.success) return callback('Result unexpected');
      callback(err, result.success);
    });
  };
}

var utilsModule = new UtilsClass();
module.exports = utilsModule;
