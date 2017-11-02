#!/usr/bin/env node
var async = require('async');
var utils = require('./utils.js');
var userDefined = require('./userDefined.js');

var nextState = 0;
var state = {
  buy: 0,
  monitorBuy: 1,
  sell: 2,
  monitorSell: 3
};

var ratioBuyCounter = 0;
var buyOrderID = '';

cycleState();

function cycleState() {
  async.series([
    // Cycle through the state machine
    stateMachine
  ], function () {
    // The loop is finished, re run the state machine in 10 seconds
    setTimeout(function () {
      cycleState();
    }, 10000);
  });
}

function stateMachine(callback) {
  switch (nextState) {
    case state.buy: {
      console.log('State: buy');
      var currentZarBalance = 0;
      var currentBtcPrice = 0;
      var lastBid = 0;
      var priceToBuy = 0;
      async.series([
        function (cb) {
          utils.getOrderBookSummary(userDefined.orderRandHistory, function (err, result) {
            if (err) {
              console.error('Unexpected error 1: ' + err);
              return cb(true);
            }
            var orderTotal = parseFloat(result.bidVolume) + parseFloat(result.askVolume);
            var ratio = parseFloat(result.bidVolume) / orderTotal;
            if (ratio < userDefined.ratioBuy) {
              console.log('Ratio is not correct to buy: ' + ratio.toFixed(2));
              ratioBuyCounter = 0;
              return cb(true);
            }
            console.log('Ratio is correct to buy: ' + ratio.toFixed(2) + ' RatioCounter: ' + ratioBuyCounter);
            if (ratioBuyCounter < userDefined.ratioRepeat) {
              ratioBuyCounter++;
              return cb(true);
            }
            ratioBuyCounter = 0;
            return cb();
          });
        },
        function (cb) {
          utils.getAccountBalances(userDefined.transactionDetails, function (err, result) {
            if (err) {
              console.error('Unexpected error 2: ' + err);
              return cb(true);
            }
            currentZarBalance = result.zarBalance;
            return cb();
          });
        },
        function (cb) {
          utils.getCurrentPrice(function (err, result) {
            if (err) {
              console.error('Unexpected error 3: ' + err);
              return callback(true);
            }
            currentBtcPrice = result;
            if (currentBtcPrice * userDefined.tradingVolume >= currentZarBalance) {
              console.log('Not enough rands to buy bitcoin');
              return cb(true);
            }
            return cb();
          });
        },
        function (cb) {
          ratioBuyCounter = 1;
          utils.getLastTicket(function (err, result) {
            if (err) {
              console.error('Unexpected error 4: ' + err);
              return cb(true);
            }
            lastBid = parseInt(result.bid);
            if (lastBid >= parseInt(currentBtcPrice)) {
              console.log('The last bid is the same as the current price, we cant buy now');
              return cb(true);
            }
            if (lastBid == currentBtcPrice - 1) priceToBuy = lastBid.toString();
            else priceToBuy = (lastBid + 1).toString();
            ratioBuyCounter = 0;
            return cb();
          });
        },
        function (cb) {
          // If we get here, we can place the buy order
          console.log('LastBid: ' + lastBid + ' CurrentPrice: ' + currentBtcPrice + ' PriceToBuy: ' + priceToBuy);
          //todo: take this out
          priceToBuy = '10000';
          utils.setBuyOrder(userDefined.transactionDetails, priceToBuy, userDefined.tradingVolume, function (err, result) {
            if (err) {
              console.error('Unexpected error 5: ' + err);
              return cb(true);
            }
            if (!result) {
              console.error('Unexpected error 6: ' + err);
              return cb(true);
            }
            buyOrderID = result;
            console.log('Buy order has been set ... monitor it now');
            return cb(state.monitorBuy);
          });
        }
      ], function (err) {
        if (err === true) return callback();
        nextState = err;
        callback();
      });
      break;
    }

    case state.monitorBuy: {
      console.log('State: monitorBuy');
      var orderArray = [];
      var orderBuyDetails = {};
      var lastBidPrice = 0;
      async.series([
        function (cb) {
          utils.getOrders(userDefined.transactionDetails, function (err, result) {
            if (err) {
              console.error('Unexpected error 7: ' + err);
              return cb(true);
            }
            orderArray = result.orders;
            return cb();
          });
        },
        function (cb) {
          utils.getOrderDetailsByID(orderArray, buyOrderID, function (err, result) {
            if (err) {
              console.error('Unexpected error 8: ' + err);
              return cb(true);
            }
            orderBuyDetails = result.orderDetails;
            return cb();
          });
        },
        function (cb) {
          if (orderBuyDetails.state == 'COMPLETE') {
            console.log('Buy Order has gone through, look for sell');
            return cb(state.sell);
          }
          console.log('Buy Order is still pending');
          return cb();
        },
        function (cb) {
          utils.getLastTicket(function (err, result) {
            if (err) {
              console.error('Unexpected error 9: ' + err);
              return cb(true);
            }
            lastBidPrice = result.bid;
            return cb();
          });
        },
        function (cb) {
          console.log('TEST: ' + JSON.stringify(orderBuyDetails));
          var filledValue = parseFloat(orderBuyDetails.baseBTC);
          console.log('Test1: ' + filledValue);
          if (filledValue != 0) {
            // This means it has been partially filled
            var floatLastBidPrice = parseFloat(lastBidPrice);
            var floatBuyPrice = parseFloat(orderBuyDetails.price);
            if (floatLastBidPrice > floatBuyPrice) {
              console.log('Someone has out bid us, stop the current order');
              utils.setStopOrder(userDefined.transactionDetails, buyOrderID, function (err, result) {
                if (err) {
                  console.error('Unexpected error 10: ' + err);
                  return cb(true);
                }
                if (!result || result != true) {
                  console.error('Partial Buy Order Failed to stop ... : ' + result);
                  return cb(true);
                }
                console.log('Partial Buy Order Stopped Successfully: ' + result);
                return cb(state.sell);
              });
              return;
            }
            console.log('Buy Order is at least on the top, partially filled');
            return cb(true);
          }
          var floatLastBidPrice = parseFloat(lastBidPrice);
          var floatBuyOrderPrice = parseFloat(orderBuyDetails.price);
          if (floatLastBidPrice <= floatBuyOrderPrice) {
            console.log('Buy Order is at least on the top, not partially filled');
            return cb(true);
          }
          console.log('Buy Order is not on the top, and we are not partially filled');
          return cb();
        },
        function (cb) {
          utils.setStopOrder(userDefined.transactionDetails, buyOrderID, function (err, result) {
            if (err) {
              console.error('Unexpected error 11: ' + err);
              return cb(true);
            }
            if (!result || result != true) {
              console.error('Buy Order Failed to stop ... : ' + result);
              return cb(true);
            }
            console.log('Buy Order Stopped Successfully: ' + result);
            return cb(state.buy);
          });
        }
      ], function (err) {
        if (err == true) return callback();
        nextState = err;
        callback();
      });
      break;
    }

    case state.sell: {
      console.log('State: sell');
      async.series([], function (err) {
        if (err == true) return callback();
        nextState = err;
        callback();
      });
      break;
    }

    case state.monitorSell: {
      console.log('State: monitorSell');
      async.series([], function (err) {
        if (err == true) return callback();
        nextState = err;
        callback();
      });
      break;
    }

    default: {
      console.log('State: unknown (' + nextState + ')');
      callback();
      break;
    }
  }
}
