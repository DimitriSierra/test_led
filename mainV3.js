#!/usr/bin/env node
var fs = require('fs');
var async = require('async');
var utils = require('./utils.js');
var userDefined = require('./userDefined.js');

var nextState = 1;
var state = {
  buy: 1,
  monitorBuy: 2,
  sell: 3,
  monitorSell: 4,
  finish: 5
};

var ratioBuyCounter = 0;
var buyOrderID = '';
var sellOrderID = '';
var gapBuy = false;

cycleState();

function cycleState() {
  async.series([
    // Cycle through the state machine
    stateMachine
  ], function () {
    // The loop is finished, re run the state machine with defined delay
    setTimeout(function () {
      cycleState();
    }, userDefined.cycleDelay);
  });
}

function stateMachine(callback) {
  switch (nextState) {
    case state.buy: {
      var currentZarBalance = 0;
      var currentBtcPriceBuy = 0;
      var lastBid = 0;
      var priceToBuy = 0;
      async.series([
        function (cb) {
          utils.getOrderBookSummary(userDefined.orderRandHistory, function (err, result) {
            if (err) {
              console.error('Unexpected error 1: ' + err);
              return cb(true);
            }
            var gapLastBidPrice = parseFloat(result.topBidVolume.price);
            var gapLastAskPrice = parseFloat(result.topAskVolume.price);
            var gap = gapLastAskPrice - gapLastBidPrice;
            if (gap > userDefined.gapRange) {
              console.log('State: Buy - Gap: ' + gap);
              gapBuy = true;
              return cb();
            }
            // If we get here, it is not gap buy, check the ratio
            gapBuy = false;
            var orderTotal = parseFloat(result.bidVolume) + parseFloat(result.askVolume);
            var ratio = parseFloat(result.bidVolume) / orderTotal;
            if (ratio < userDefined.ratioBuy) {
              setTimeout(function(){
                console.log('State: Buy - Ratio: ' + ratio.toFixed(2));
                ratioBuyCounter = 0;
                cb(true);
                },userDefined.ratioDelay);
              return;
            }
            console.log('State: Buy - Ratio: ' + ratio.toFixed(2) + ' RatioCounter: ' + ratioBuyCounter + ' of ' + userDefined.ratioRepeat);
            if (ratioBuyCounter < userDefined.ratioRepeat) {
              ratioBuyCounter++;
              return cb(true);
            }
            //ratioBuyCounter = 0;
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
            var tradingVolume = userDefined.tradingVolume;
            if (gapBuy) tradingVolume = userDefined.tradingGapVolume;
            if (currentBtcPriceBuy * tradingVolume >= currentZarBalance) {
              setTimeout(function(){
                console.error('Not enough rands to buy bitcoin');
                cb(true);
              },userDefined.noCashDelay);
              return;
            }
            return cb();
          });
        },
        function (cb) {
          //ratioBuyCounter = 1;
          utils.getOrderBookSummary(userDefined.orderRandHistory, function (err, result) {
            if (err) {
              console.error('Unexpected error 4: ' + err);
              return cb(true);
            }
            lastBid = parseInt(result.topBidVolume.price);
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
          var startTime = new Date().getTime();
          console.log('Time before placing ' + startTime);
          var tradingVolume = userDefined.tradingVolume;
          if (gapBuy) tradingVolume = userDefined.tradingGapVolume;
          utils.setBuyOrder(userDefined.transactionDetails, priceToBuy, tradingVolume, function (err, result) {
            if (err) {
              console.error('Unexpected error 5: ' + err);
              return cb(true);
            }
            if (!result) {
              console.error('Unexpected error 6: ' + err);
              return cb(true);
            }
            buyOrderID = result;
            console.log('OrderID: ' + buyOrderID + " - 134");
            var placedTime = new Date().getTime();
            var delay = placedTime - startTime;
            console.log('Buy order has been set ... monitor it now ' + placedTime + '++' + delay);
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
          utils.getOrderBookSummary(userDefined.orderRandHistory, function (err, result) {
            if (err) {
              console.error('Unexpected error 9: ' + err);
              return cb(true);
            }
            lastBidPrice = result.topBidVolume.price;
            return cb();
          });
        },
        function (cb) {
          var filledValue = parseFloat(orderBuyDetails.baseBTC);
          if (filledValue > 0) {
            // This means it has been partially filled
            var floatLastBidPrice = parseFloat(lastBidPrice);
            var floatBuyPrice = parseFloat(orderBuyDetails.price);
            if (floatLastBidPrice > floatBuyPrice + 1) { //todo see if we want this
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
          console.log('OrderID: ' + buyOrderID + ' - 225');
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
      async.series([
        function (cb) {
          if (gapBuy) return cb(); // Done need to look for the ratio if it is a gap buy
          utils.getOrderBookSummary(userDefined.orderRandHistory, function (err, result) {
            if (err) {
              console.error('Unexpected error 13: ' + err);
              return cb(true);
            }
            var orderTotal = parseFloat(result.bidVolume) + parseFloat(result.askVolume);
            var ratio = parseFloat(result.bidVolume) / orderTotal;
            console.log('State: Sell - Ratio: ' + ratio.toFixed(2));
            if (ratio > userDefined.ratioSell) return cb(true); // Stay in the state
            return cb(); // Move on to sell
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
              console.error('Not enough bitcoins to sell what we bought');
              console.error('Going back to buy, leaving bitcoins');
              return cb(state.buy);
            }
            if (volumeToSell < 0.0005) {
              console.error('Volume to small to sell, buying again');
              return cb(state.buy);
            }
            return cb();
          });
        },
        function (cb) {
          utils.getOrderBookSummary(userDefined.orderRandHistory, function (err, result) {
            if (err) {
              console.error('Unexpected error 18: ' + err);
              return cb(true);
            }
            lastAskPrice = result.topAskVolume.price;
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
          var floatFeeAmount = parseFloat(orderBuyDetailsSell.price * orderBuyDetailsSell.feeBaseBTC);
          var floatLastAskPrice = parseFloat(lastAskPrice);
          var floatCurrentBtcPrice = parseFloat(currentBtcPrice);
          if (floatLastAskPrice == floatCurrentBtcPrice + 1) priceToSell = floatLastAskPrice;
          else priceToSell = floatLastAskPrice - 1;
          var floatPriceToSell = parseFloat(priceToSell);
          var floatPriceBought = parseFloat(orderBuyDetailsSell.price);
          if (floatPriceToSell < floatPriceBought) {
            console.error('Want to sell lower, setting hardlimit and forgetting');
            priceToSell = parseInt(floatPriceBought) + parseInt(userDefined.hardLimit);
            placeAndForget = true;
          }
          if (floatFeeAmount > 0) {
            console.error('We got a fee, adding the fee to our hard limit');
            priceToSell = (parseInt(floatPriceBought) + parseInt(userDefined.hardLimit)) * userDefined.feePercentMakeUp;
            placeAndForget = true;
          }
          priceToSell = priceToSell.toFixed(0);
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
              console.error('Not monitoring, was a hard limit/fee based');
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
            console.log('Sell Order has gone through, update MrTommy');
            return cb(state.finish);
          }
          console.log('Sell Order is still pending');
          return cb();
        },
        function (cb) {
          utils.getOrderBookSummary(userDefined.orderRandHistory, function (err, result) {
            if (err) {
              console.error('Unexpected error 23: ' + err);
              return cb(true);
            }
            lastAskPriceMonitorSell = result.topAskVolume.price;
            return cb();
          });
        },
        function (cb) {
          var filledValue = parseFloat(orderAskDetails.baseBTC);
          if (filledValue > 0) {
            // This means it has been partially filled
            console.error('Sell order started selling - not waiting for it to fill - go buy again');
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

    case state.finish: {
      console.log('State: Finish');
      var accountBalance = 0;
      var pendingAmount = 0;
      var expectedAmount = 0;
      var fileAmount = '';
      var pendingOrders = {};

      async.series([
        function (callback) {
          utils.getAccountBalances(userDefined.transactionDetails, function (err, result) {
            if (err) {
              console.error(err);
              return callback(state.buy);
            }
            accountBalance = result.zarBalance;
            callback();
          });
        },
        function (callback) {
          utils.getPendingOrders(userDefined.transactionDetails, function (err, result) {
            if (err) {
              console.error(err);
              return callback(state.buy);
            }
            pendingOrders = result;
            callback();
          });
        },
        function (callback) {
          if (!pendingOrders.orders) return callback(state.buy);
          var pendingArray = pendingOrders.orders;
          for (var i = 0; i < pendingArray.length; i++) {
            if (pendingArray[i].type != 'ASK') continue;
            pendingAmount += parseFloat(pendingArray[i].limit_price * pendingArray[i].limit_volume - pendingArray[i].counter);
          }
          expectedAmount = accountBalance + pendingAmount;
          fileAmount = utils.getDateTime();
          fileAmount += '\t';
          fileAmount += 'ExpectedProfit: ' + (expectedAmount - userDefined.inputAmount).toFixed(2);
          fileAmount += '\n';
          callback();
        },
        function (callback) {
          fs.appendFile('mrTommy.txt', fileAmount, function (err) {
            if (err) console.error('Fail to write MrTommy');
            console.log('Looking for buy again..');
            return callback(state.buy);
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
