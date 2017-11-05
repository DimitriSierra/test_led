#!/usr/bin/env node
var async = require('async');
var utils = require('./utils.js');
var userDefined = require('./userDefined.js');

var nextState = 1;
var state = {
  buy: 1,
  monitorBuy: 2,
  sell: 3,
  monitorSell: 4
};

var ratioBuyCounter = 0;
var buyOrderID = '';
var sellOrderID = '';

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
      var currentZarBalance = 0;
      var currentBtcPriceBuy = 0;
      var lastBid = 0;
      var priceToBuy = 0;
      var topBuyVolume = 0;
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
              console.log('State: Buy - Ratio: ' + ratio.toFixed(2));
              ratioBuyCounter = 0;
              return cb(true);
            }
            console.log('State: Buy - Ratio: ' + ratio.toFixed(2) + ' RatioCounter: ' + ratioBuyCounter);
            if (ratioBuyCounter < userDefined.ratioRepeat) {
              ratioBuyCounter++;
              return cb(true);
            }
            topBuyVolume = parseFloat(result.topBidVolume);
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
            currentBtcPriceBuy = result;
            if (currentBtcPriceBuy * userDefined.tradingVolume >= currentZarBalance) {
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
            if (lastBid >= parseInt(currentBtcPriceBuy)) {
              console.log('The last bid is the same as the current price, we cant buy now');
              return cb(true);
            }
            if (lastBid == currentBtcPriceBuy - 1) priceToBuy = lastBid.toString();
            else priceToBuy = (lastBid + 1).toString();
            ratioBuyCounter = 0;
            return cb();
          });
        },
        function (cb) {
          // If we get here, we can place the buy order
          console.log('LastBid: ' + lastBid + ' CurrentPrice: ' + currentBtcPriceBuy + ' PriceToBuy: ' + priceToBuy);
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
          if (orderBuyDetails.state === 'COMPLETE') {
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
          var filledValue = parseFloat(orderBuyDetails.baseBTC);
          if (filledValue > 0) {
            // This means it has been partially filled
            var floatLastBidPrice = parseFloat(lastBidPrice);
            var floatBuyPrice = parseFloat(orderBuyDetails.price);
            if (floatLastBidPrice > floatBuyPrice + 1) {
              console.log('Someone has out bid us, stop the current order');
              utils.setStopOrder(userDefined.transactionDetails, buyOrderID, function (err, result) {
                if (err) {
                  console.error('Unexpected error 10: ' + err);
                  return cb(true);
                }
                if (!result || result !== true) {
                  console.error('Partial Buy Order Failed to stop ... : ' + result);
                  return cb(true);
                }
                console.log('Partial Buy Order Stopped Successfully');
                return cb(state.sell);
              });
              return;
            }
            console.log('Buy Order is at least on the top, partially filled');
            return cb(true);
          }
          var floatLastBidPriceB = parseFloat(lastBidPrice);
          var floatBuyOrderPriceB = parseFloat(orderBuyDetails.price);
          if (floatLastBidPriceB <= floatBuyOrderPriceB) {
            console.log('Buy Order is at least on the top, not partially filled');
            return cb(true);
          }
          console.log('Buy Order is not on the top, not partially filled');
          return cb();
        },
        function (cb) {
          utils.setStopOrder(userDefined.transactionDetails, buyOrderID, function (err, result) {
            if (err) {
              console.error('Unexpected error 11: ' + err);
              return cb(true);
            }
            if (!result || result !== true) {
              console.error('Buy Order Failed to stop ... : ' + result);
              return cb(true);
            }
            console.log('Buy Order Stopped Successfully');
            return cb(state.buy);
          });
        }
      ], function (err) {
        if (err === true) return callback();
        nextState = err;
        callback();
      });
      break;
    }

    case state.sell: {
      var currentBtcBalance = 0;
      var currentBtcPrice = 0;
      var orderArraySell = [];
      var orderBuyDetailsSell = {};
      var volumeToSell = 0;
      var priceToSell = 0;
      var lastAskPrice = 0;
      var placeAndForget = false;
      var topSellVolume = 0;
      async.series([
        function (cb) {
          utils.getOrderBookSummary(userDefined.orderRandHistory, function (err, result) {
            if (err) {
              console.error('Unexpected error 13: ' + err);
              return cb(true);
            }
            var orderTotal = parseFloat(result.bidVolume) + parseFloat(result.askVolume);
            var ratio = parseFloat(result.bidVolume) / orderTotal;
            if (ratio > userDefined.ratioSell) {
              console.log('State: Sell - Ratio: ' + ratio.toFixed(2));
              return cb(true);
            }
            console.log('State Sell - Ratio: ' + ratio.toFixed(2));
            topSellVolume = parseFloat(result.topAskVolume);
            return cb();
          });
        },
        function (cb) {
          utils.getAccountBalances(userDefined.transactionDetails, function (err, result) {
            if (err) {
              console.error('Unexpected error 14: ' + err);
              return cb(true);
            }
            currentBtcBalance = result.xbtBalance;
            return cb();
          });
        },
        function (cb) {
          utils.getOrders(userDefined.transactionDetails, function (err, result) {
            if (err) {
              console.error('Unexpected error 15: ' + err);
              return cb(true);
            }
            orderArraySell = result.orders;
            return cb();
          });
        },
        function (cb) {
          utils.getOrderDetailsByID(orderArraySell, buyOrderID, function (err, result) {
            if (err) {
              console.error('Unexpected error 16: ' + err);
              return cb(true);
            }
            orderBuyDetailsSell = result.orderDetails;
            return cb();
          });
        },
        function (cb) {
          utils.getCurrentPrice(function (err, result) {
            if (err) {
              console.error('Unexpected error 17: ' + err);
              return callback(true);
            }
            currentBtcPrice = result;
            volumeToSell = parseFloat(orderBuyDetailsSell.baseBTC) - parseFloat(orderBuyDetailsSell.feeBaseBTC);
            var floatBtcBalance = parseFloat(currentBtcBalance);
            if (volumeToSell > floatBtcBalance) {
              console.log('Not enough bitcoins to sell what we bought');
              console.log('Going back to buy, leaving bitcoins');
              return cb(state.buy);
            }
            return cb();
          });
        },
        function (cb) {
          utils.getLastTicket(function (err, result) {
            if (err) {
              console.error('Unexpected error 18: ' + err);
              return cb(true);
            }
            lastAskPrice = result.ask;
            var floatLastAskPrice = parseFloat(lastAskPrice);
            var floatCurrentBtcPrice = parseFloat(currentBtcPrice);
            if (floatLastAskPrice <= floatCurrentBtcPrice) {
              console.log('The last ask is the same as the current price, we cant sell now');
              return cb(true);
            }
            return cb();
          });
        },
        function (cb) {
          var floatFeeAmount = parseFloat(orderBuyDetailsSell.feeCounterZAR);
          var floatLastAskPrice = parseFloat(lastAskPrice);
          var floatCurrentBtcPrice = parseFloat(currentBtcPrice);
          if (floatLastAskPrice == floatCurrentBtcPrice + 1) priceToSell = lastAskPrice;
          else priceToSell = lastAskPrice - 1;

          var floatPriceToSell = parseFloat(priceToSell);
          var floatPriceBought = parseFloat(orderBuyDetailsSell.price);
          if (floatPriceToSell < floatPriceBought) {
            console.log('Want to sell lower, setting hardlimit and forgetting');
            priceToSell = parseInt(floatPriceBought) + parseInt(userDefined.hardLimit);
            placeAndForget = true;
          }
          if (floatFeeAmount > 0) {
            console.log('We got a fee, adding the fee to our hard limit');
            priceToSell += parseInt(floatFeeAmount);
            placeAndForget = true;
          }
          priceToSell = priceToSell.toString();
          console.log('CurrentPrice: ' + currentBtcPrice + ' PriceToSell: ' + priceToSell);
          return cb();
        },
        function (cb) {
          utils.setSellOrder(userDefined.transactionDetails, priceToSell.toString(), volumeToSell.toString(), function (err, result) {
            if (err) {
              console.error('Unexpected error 19: ' + err);
              return cb(true);
            }
            if (!result) {
              console.error('Unexpected error 20: ' + err);
              return cb(true);
            }
            sellOrderID = result;
            console.log('Sell order has been set ... monitor it now');
            if (placeAndForget === true) {
              console.log('Not monitoring, was a hard limit/fee based');
              return cb(state.buy);
            }
            return cb(state.monitorSell);
          });
        }
      ], function (err) {
        if (err === true) return callback();
        nextState = err;
        callback();
      });
      break;
    }

    case state.monitorSell: {
      console.log('State: monitorSell');
      var orderArrayMonitorSell = [];
      var orderAskDetails = {};
      var lastAskPriceMonitorSell = 0;
      async.series([
        function (cb) {
          utils.getOrders(userDefined.transactionDetails, function (err, result) {
            if (err) {
              console.error('Unexpected error 21: ' + err);
              return cb(true);
            }
            orderArrayMonitorSell = result.orders;
            return cb();
          });
        },
        function (cb) {
          utils.getOrderDetailsByID(orderArrayMonitorSell, sellOrderID, function (err, result) {
            if (err) {
              console.error('Unexpected error 22: ' + err);
              return cb(true);
            }
            orderAskDetails = result.orderDetails;
            return cb();
          });
        },
        function (cb) {
          if (orderAskDetails.state === 'COMPLETE') {
            console.log('Sell Order has gone through, look for buy');
            return cb(state.buy);
          }
          console.log('Sell Order is still pending');
          return cb();
        },
        function (cb) {
          utils.getLastTicket(function (err, result) {
            if (err) {
              console.error('Unexpected error 23: ' + err);
              return cb(true);
            }
            lastAskPriceMonitorSell = result.ask;
            return cb();
          });
        },
        function (cb) {
          var filledValue = parseFloat(orderAskDetails.baseBTC);
          if (filledValue > 0) {
            // This means it has been partially filled
            console.log('Sell order started selling - not waiting for it to fill - go buy again');
            return cb(state.buy);
          }
          var floatLastAskPrice = parseFloat(lastAskPriceMonitorSell);
          var floatAskOrderPrice = parseFloat(orderAskDetails.price);
          if (floatLastAskPrice >= floatAskOrderPrice) {
            console.log('Sell Order is at least on the top, not partially filled');
            return cb(true);
          }
          console.log('Sell Order is not on the top, and we are not partially filled');
          return cb();
        },
        function (cb) {
          utils.setStopOrder(userDefined.transactionDetails, sellOrderID, function (err, result) {
            if (err) {
              console.error('Unexpected error 24: ' + err);
              return cb(true);
            }
            if (!result || result !== true) {
              console.error('Sell Order Failed to stop ... : ' + result);
              return cb(true);
            }
            console.log('Sell Order Stopped Successfully');
            return cb(state.sell);
          });
        }
      ], function (err) {
        if (err === true) return callback();
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