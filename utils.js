var luno = require('./luno');
var _ = require('lodash');

function UtilsClass() {

  this.getCurrentPrice = function getCurrentPrice(callback) {
    luno.getCurrentBTCZAR(function (err, result) {
      if (err) return callback(err);
      if (!result) return callback('Result unknown');
      if (!result.body) return callback('Result unexpected');
      var foundBTCZAR = result.body.indexOf('BTC/ZAR ');
      if (foundBTCZAR == -1) return callback('Body unexpected');
      var stringBTC = result.body.substring(foundBTCZAR);
      var foundBTCZAR2 = stringBTC.indexOf('BTC/ZAR ');
      var currentPrice = stringBTC.substring(foundBTCZAR2 + 8, stringBTC.indexOf('"}'));
      currentPrice = parseInt(currentPrice.replace(/,/g, ''));
      callback(err, currentPrice);
    });
  };

  this.getLastTicket = function getLastTicket(callback) {
    luno.getTicker(function (err, result) {
      if (err) return callback(err);
      if (!result) return callback('Result unknown');
      console.log('Debug1: ' + JSON.stringify(result));
      try {
        result = JSON.parse(result);
      } catch (err) {
        console.error('Error1: ' + err.message);
        return callback(result);
      }
      if (!result.ask) return callback('Result ask unexpected');
      if (!result.bid) return callback('Result bid unexpected');
      callback(err, {'bid': result.bid, 'ask': result.ask});
    });
  };

  this.getOrderBookSummary = function getOrderBookSummary(priceHistory, callback) {
    if (priceHistory == null) return callback('numOrders passed incorrectly');
    if (!_.isInteger(priceHistory)) return callback('numOrders not integer');
    if (priceHistory <= 0) return callback('numOrders not larger than 0');
    luno.getOrderBook(function (err, result) {
        if (err) return callback(err);
        if (!result) return callback('Result unknown');
        //console.log('Debug2: ' + JSON.stringify(result));
        try {
          result = JSON.parse(result);
        } catch (err) {
          console.error('Error2: ' + err.message);
          return callback(result);
        }
        if (!result.bids) return callback('Result unexpected - bids');
        if (!result.asks) return callback('Result unexpected - asks');
        var bidArray = [];
        for (var i = 0; i < result.bids.length; i++) {
          if (i == result.bids.length - 1) continue;
          if (result.bids[i].price == result.bids[i + 1].price) {
            var addedVolume = parseFloat(result.bids[i + 1].volume) + parseFloat(result.bids[i].volume);
            result.bids[i + 1].volume = addedVolume.toString();
            continue;
          }
          bidArray.push(result.bids[i]);
        }

        var bidArrayFiltered = [];
        for (var i = 0; i < bidArray.length; i++) {
          if (parseInt(bidArray[0].price) - parseInt(bidArray[i].price) > priceHistory) continue;
          bidArrayFiltered.push(bidArray[i]);
        }

        var bidVolume = 0;
        for (var i = 0; i < bidArrayFiltered.length; i++) {
          bidVolume += parseFloat(bidArrayFiltered[i].volume);
        }

        var askArray = [];
        for (var i = 0; i < result.asks.length; i++) {
          if (i == result.asks.length - 1) continue;
          if (result.asks[i].price == result.asks[i + 1].price) {
            var addedVolume = parseFloat(result.asks[i + 1].volume) + parseFloat(result.asks[i].volume);
            result.asks[i + 1].volume = addedVolume.toString();
            continue;
          }
          askArray.push(result.asks[i]);
        }

        var askArrayFiltered = [];
        for (var i = 0; i < askArray.length; i++) {
          if (parseInt(askArray[i].price) - parseInt(askArray[0].price) > priceHistory) continue;
          askArrayFiltered.push(askArray[i]);
        }

        var askVolume = 0;
        for (var i = 0; i < askArrayFiltered.length; i++) {
          askVolume += parseFloat(askArrayFiltered[i].volume);
        }

        callback(err, {'bidVolume': bidVolume, 'askVolume': askVolume});
      }
    );
  };

  this.getRecentTradeSummary = function getRecentTradeCount(numTrades, callback) {
    if (numTrades == null) return callback('numTrades passed incorrectly');
    if (!_.isInteger(numTrades)) return callback('numTrades not integer');
    if (numTrades <= 0) return callback('numTrades not larger than 0');
    luno.getTrades(function (err, result) {
      if (err) return callback(err);
      if (!result) return callback('Result unknown');
      //console.log('Debug3: ' + JSON.stringify(result));
      try {
        result = JSON.parse(result);
      } catch (err) {
        console.error('Error3: ' + err.message);
        return callback(result);
      }
      if (!result.trades) return callback('Result unexpected');

      var arrayTrades = result.trades.slice(0, numTrades);
      var boughtCount = 0;
      var boughtVolume = 0;
      var soldCount = 0;
      var soldVolume = 0;
      for (var i = 0; i < numTrades; i++) {
        if (arrayTrades[i].is_buy === true) {
          boughtCount++;
          boughtVolume += parseFloat(arrayTrades[i].volume);
        }
        else {
          soldCount++;
          soldVolume += parseFloat(arrayTrades[i].volume);
        }
      }
      var returnObject = {
        'boughtCount': boughtCount,
        'boughtVolume': boughtVolume,
        'soldCount': soldCount,
        'soldVolume': soldVolume
      };
      callback(err, returnObject);
    });
  };

  this.getAccountBalances = function getAccountBalances(apiObject, callback) {
    if (!apiObject || !apiObject.keyID || !apiObject.secretID) {
      return callback('API Object passed incorrectly');
    }
    luno.getBalances(apiObject, function (err, result) {
      if (err) return callback(err);
      if (!result) return callback('Result unknown');
      //console.log('Debug4: ' + JSON.stringify(result));
      try {
        result = JSON.parse(result);
      } catch (err) {
        console.error('Error4: ' + err.message);
        return callback(result);
      }
      if (!result.balance) return callback('Result unexpected');
      var xbtBalance = 0;
      var zarBalance = 0;
      for (var i = 0; i < result.balance.length; i++) {
        if (result.balance[i].asset === 'XBT') xbtBalance += parseFloat(result.balance[i].balance);
        if (result.balance[i].asset === 'ZAR') zarBalance += parseFloat(result.balance[i].balance);
      }
      callback(err, {'xbtBalance': xbtBalance, 'zarBalance': zarBalance});
    });
  };

  this.getOrders = function getPendingOrders(apiObject, callback) {
    if (!apiObject || !apiObject.keyID || !apiObject.secretID) {
      return callback('API Object passed incorrectly');
    }
    luno.getListOrders(apiObject, function (err, result) {
      if (err) return callback(err);
      if (!result) return callback('Result unknown');
      //console.log('Debug5: ' + JSON.stringify(result));
      try {
        result = JSON.parse(result);
      } catch (err) {
        console.error('Error5: ' + err.message);
        return callback(result);
      }
      if (!result.orders) return callback('Result unexpected');
      var ordersArray = [];
      for (var i = 0; i < result.orders.length; i++) {
        var tempObject = {
          'orderID': result.orders[i].order_id,
          'type': result.orders[i].type,
          'price': result.orders[i].limit_price,
          'volume': result.orders[i].limit_volume,
          'baseBTC': result.orders[i].base,
          'feeBaseBTC': result.orders[i].fee_base,
          'counterZAR': result.orders[i].counter,
          'feeCounterZAR': result.orders[i].fee_counter,
          'timestamp': result.orders[i].creation_timestamp,
          'state': result.orders[i].state
        };
        ordersArray.push(tempObject);
      }
      ordersArray.sort(function (a, b) {
        return parseInt(a.timestamp) - parseInt(b.timestamp)
      });
      callback(err, {'orders': ordersArray});
    });
  };

  this.getPendingOrders = function getPendingOrders(orderArray, callback) {
    if (!_.isArray(orderArray)) return callback('OrderArray passed incorrectly');
    var pendingOrderArrayBid = [];
    var pendingOrderArrayAsk = [];
    for (var i = 0; i < orderArray.length; i++) {
      if (orderArray[i].state !== 'PENDING') continue;
      if (orderArray[i].type === 'BID') pendingOrderArrayBid.push(orderArray[i]);
      else pendingOrderArrayAsk.push(orderArray[i]);
    }
    pendingOrderArrayBid.sort(function (a, b) {
      return parseInt(a.timestamp) - parseInt(b.timestamp)
    });
    pendingOrderArrayAsk.sort(function (a, b) {
      return parseInt(a.timestamp) - parseInt(b.timestamp)
    });
    callback(null, {'pendingOrdersBid': pendingOrderArrayBid, 'pendingOrdersAsk': pendingOrderArrayAsk});
  };

  this.getCompleteOrders = function getCompleteOrders(orderArray, callback) {
    if (!_.isArray(orderArray)) return callback('OrderArray passed incorrectly');
    var completeOrderArrayBid = [];
    var completeOrderArrayAsk = [];
    for (var i = 0; i < orderArray.length; i++) {
      if (orderArray[i].state !== 'COMPLETE') continue;
      if (orderArray[i].type === 'BID') completeOrderArrayBid.push(orderArray[i]);
      else completeOrderArrayAsk.push(orderArray[i]);
    }
    completeOrderArrayBid.sort(function (a, b) {
      return parseInt(a.timestamp) - parseInt(b.timestamp)
    });
    completeOrderArrayAsk.sort(function (a, b) {
      return parseInt(a.timestamp) - parseInt(b.timestamp)
    });
    callback(null, {'completeOrdersBid': completeOrderArrayBid, 'completeOrdersAsk': completeOrderArrayAsk});
  };

  this.getOrderDetailsByID = function getOrderDetailsByID(orderArray, orderID, callback) {
    if (!_.isArray(orderArray)) return callback('OrderArray passed incorrectly');
    var ordersWithID = [];
    for (var i = 0; i < orderArray.length; i++) {
      if (orderArray[i].orderID != orderID) continue;
      ordersWithID.push(orderArray[i]);
    }
    ordersWithID.sort(function (a, b) {
      return parseInt(a.timestamp) - parseInt(b.timestamp)
    });
    callback(null, {'orderDetails': ordersWithID});
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
      if (!result) return callback('Result unknown');
      //console.log('Debug6: ' + JSON.stringify(result));
      try {
        result = JSON.parse(result);
      } catch (err) {
        console.error('Error6: ' + err.message);
        return callback(result);
      }
      if (result.error_code == 'ErrInsufficientBalance') return callback(result.error_code);
      if (!result.order_id) return callback('Result unexpected: ' + JSON.stringify(result));
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
      if (!result) return callback('Result unknown');
      //console.log('Debug7: ' + JSON.stringify(result));
      try {
        result = JSON.parse(result);
      } catch (err) {
        console.error('Error7: ' + err.message);
        return callback(result);
      }
      if (result.error_code) return callback(result.error_code);
      if (!result.order_id) return callback('Result unexpected: ' + JSON.stringify(result));
      callback(err, result.order_id);
    });
  };

  this.setStopOrder = function setStopOrder(apiObject, orderID, callback) {
    if (!apiObject || !apiObject.keyID || !apiObject.secretID) return callback('API Object passed incorrectly');
    if (!orderID) return callback('OrderID passed incorrectly');
    luno.setStopAnOrder(apiObject, orderID, function (err, result) {
      if (err) return callback(err);
      if (!result) return callback('Result unknown');
      //console.log('Debug8: ' + JSON.stringify(result));
      try {
        result = JSON.parse(result);
      } catch (err) {
        console.error('Error8: ' + err.message);
        return callback(result);
      }
      if (!result.success) return callback('Result unexpected: ' + JSON.stringify(result));
      callback(err, result.success);
    });
  };
}

var utilsModule = new UtilsClass();
module.exports = utilsModule;
