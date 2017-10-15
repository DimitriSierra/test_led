#!/usr/bin/env node
var async = require('async');
var utils = require('./utils.js');
var userDefined = require('./userDefined.js');

//todo: add in these for the console logs
var debugOption = userDefined.debug;

var nextState = 2;
var state = {
  startUp: 0,
  tradeDirection: 1,
  lookForBuy: 2,
  buy: 3,
  monitorBuy: 4,
  lookForSell: 5,
  sell: 6,
  monitorSell: 7,
  sellPartial: 8
};

var lastBuyPrice = '';
var lastSellPrice = '';
var tradeProfit = 0;
var ratioCounter = 0;
var partialAmount = userDefined.tradingVolume;

cycleState();

function cycleState() {
  async.series([
    // Cycle through the state machine
    stateMachine
  ], function () {
    // The loop is finished,
    // Re-run the state machine in 10 seconds
    setTimeout(function () {
      cycleState();
    }, 10000);
  });
}

function stateMachine(callback) {
  switch (nextState) {
    case state.startUp: {
      console.log('State: startUp');

      // Check if we have any pending orders out
      utils.getPendingOrders(userDefined.transactionDetails, userDefined.tradingVolume, function (err, result) {
        if (err) {
          console.error('Unexpected error 1: ' + err);
          // Stay in the current state
          return callback();
        }
        //console.log('Debug 1: ' + JSON.stringify(result));
        if (result.pendingOrdersBid.length || result.pendingOrdersAsk.length) {
          console.log('starting up, we have pending orders');
          if (result.pendingOrdersBid.length) nextState = state.monitorBuy;
          else nextState = state.monitorSell;
          return callback();
        }
        // No pending orders, now check the balances
        console.log('starting up, we have no pending orders, check balances');
        utils.getAccountBalances(userDefined.transactionDetails, function (err, result) {
          if (err) {
            console.error('Unexpected error 2: ' + err);
            // Stay in the current state
            return callback();
          }
          //console.log('Debug 2: ' + JSON.stringify(result));
          if (result.xbtBalance) {
            console.log('positive xbt balance');
            nextState = state.lookForSell;
            return callback();
          }
          else if (result.zarBalance) {
            console.log('positive zar balance');
            nextState = state.lookForBuy;
            return callback();
          }
          else {
            console.error('no balances');
            return callback();
          }
        });
      });
      break;
    }

    case state.lookForBuy: {
      console.log('State: lookForBuy');
      utils.getOrderBookSummary(userDefined.orderRandHistory, function (err, result) {
        if (err) {
          console.error('Unexpected error 3: ' + err);
          return callback();
        }

        //console.log('Debug 3: ' + JSON.stringify(result));

        var orderTotal = parseFloat(result.bidVolume) + parseFloat(result.askVolume);

        var ratio = result.bidVolume / orderTotal;

        if (ratio < userDefined.ratioBuy) {
          console.log('Ratio is not correct to buy: ' + ratio.toFixed(2));
          ratioCounter = 0;
          return callback();
        }

        console.log('Ratio is correct to buy: ' + ratio.toFixed(2) + ' RatioCounter: ' + ratioCounter);

        if (ratioCounter < userDefined.ratioRepeat) {
          ratioCounter++;
          return callback();
        }
        ratioCounter = 0;

        nextState = state.buy;
        callback();
      });
      break;
    }

    case state.buy: {
      console.log('State: buy');
      utils.getAccountBalances(userDefined.transactionDetails, function (err, result) {
        if (err) {
          console.error('Unexpected error 4: ' + err);
          nextState = state.lookForBuy;
          return callback();
        }

        //console.log('Debug 4: ' + JSON.stringify(result));

        var currentZarBalance = result.zarBalance;

        console.log('Current ZAR Balance: ' + currentZarBalance);

        utils.getCurrentPrice(function (err, result) {
          if (err) {
            console.error('Unexpected error 5: ' + err);
            nextState = state.lookForBuy;
            return callback();
          }

          //console.log('Debug 5: ' + JSON.stringify(result));

          var currentPrice = result;

          console.log('Current BTC Price: ' + currentPrice);

          if (currentPrice * userDefined.tradingVolume >= currentZarBalance) {
            console.log('Not enough money to buy');
            nextState = state.lookForBuy;
            return callback();
          }

          //console.log('Placing buy order now');

          utils.getLastTicket(function (err, result) {
            if (err) {
              console.error('Unexpected error 6: ' + err);
              return callback();
            }

            //console.log('Debug 6: ' + JSON.stringify(result));

            var lastBid = parseInt(result.bid);

            if (lastBid >= currentPrice) {
              console.log('The last bid is the same as the current price, we cant buy now');
              nextState = state.lookForBuy;
              return callback();
            }

            var priceToBuy = 0;
            if (lastBid == currentPrice - 1) priceToBuy = lastBid.toString();
            else priceToBuy = (lastBid + 1).toString();

            // if we get here we can one up and place sell order
            console.log('Last BID: ' + lastBid);
            console.log('Current Price: ' + currentPrice);
            console.log('Placing Buy Order at: ' + priceToBuy);

            utils.setBuyOrder(userDefined.transactionDetails, priceToBuy, userDefined.tradingVolume, function (err, result) {
              if (err) {
                console.error('Unexpected error 7: ' + err);
                nextState = state.lookForBuy;
                return callback();
              }

              if (!result) {
                console.error('Buy Order not set correctly...');
                nextState = state.lookForBuy;
                return callback();
              }

              //console.log('Debug 7: ' + JSON.stringify(result));
              console.log('Buy order has been set... monitor it now: ' + result);
              lastBuyPrice = priceToBuy;
              nextState = state.monitorBuy;
              callback();
            });
          });
        });
      });
      break;
    }

    case state.monitorBuy: {
      console.log('State: monitorBuy');
      utils.getPendingOrders(userDefined.transactionDetails, userDefined.tradingVolume, function (err, result) {
        if (err) {
          console.error('Unexpected error 8: ' + err);
          return callback();
        }

        //console.log('Debug 8: ' + JSON.stringify(result));

        var pendingOrders = result.pendingOrdersBid;

        if (pendingOrders.length == 0) {
          console.log('We have no pending orders, buy must have gone through, look for sell');
          nextState = state.lookForSell;
          return callback();
        }

        //console.log('Debug: ' + JSON.stringify(pendingOrders, null, 2));

        console.log('We have pending buy order');

        var lastPendingOrder = pendingOrders[pendingOrders.length - 1];

        if (lastPendingOrder.baseBTC != 0) {
          // This means it has been partially filled
          utils.getLastTicket(function (err, result) {
            if (err) {
              console.error('Unexpected error 9: ' + err);
              return callback();
            }

            //console.log('Debug 9: ' + JSON.stringify(result));

            if (result.bid > lastPendingOrder.price) {
              console.log('Someone has out bid us, stop the current order');
              utils.setStopOrder(userDefined.transactionDetails, lastPendingOrder.orderID, function (err, result) {
                if (err) {
                  console.error('Unexpected error 10: ' + err);
                  return callback();
                }

                if (!result || result != true) {
                  console.log('Failed to stop the order, trying again: ' + result);
                  return callback();
                }

                //console.log('Debug 10: ' + JSON.stringify(result));
                console.log('We stopped the order successfully, look for sell: ' + result);
                partialAmount = parseFloat(lastPendingOrder.baseBTC);
                if (partialAmount < parseFloat(userDefined.tradingVolume) / 2) nextState = state.sellPartial;
                else nextState = state.lookForSell;
                callback();
              });
              return;
            }

            console.log('we are still at least on the top of the order book');
            callback();
          });
          return;
        }

        console.log('Our buy order is not partially filed');
        utils.getLastTicket(function (err, result) {
          if (err) {
            console.error('Unexpected error 11: ' + err);
            return callback();
          }

          //console.log('Debug 11: ' + JSON.stringify(result));

          if (result.bid <= lastPendingOrder.price) {
            console.log('We are still at least on top of the order book');
            return callback();
          }

          console.log('We are no longer on top of the order book, and we not partially fil');

          utils.setStopOrder(userDefined.transactionDetails, lastPendingOrder.orderID, function (err, result) {
            if (err) {
              console.error('Unexpected error 12: ' + err);
              return callback();
            }

            if (!result || result != true) {
              console.error('Failed to stop order ... : ' + result);
              return callback();
            }

            console.log('Order Stopped Successfully: ' + result);

            //console.log('Debug 12: ' + JSON.stringify(result));
            nextState = state.lookForBuy;
            callback();
          });
        });
      });
      break;
    }

    case state.lookForSell: {
      console.log('State: lookForSell');
      utils.getOrderBookSummary(userDefined.orderRandHistory, function (err, result) {
        if (err) {
          console.error('Unexpected error 13: ' + err);
          return callback();
        }

        //console.log('Debug 13: ' + JSON.stringify(result));

        var orderTotal = parseFloat(result.bidVolume) + parseFloat(result.askVolume);

        var ratio = result.bidVolume / orderTotal;

        if (ratio > userDefined.ratioSell) {
          console.log('Ratio is not correct to sell: ' + ratio.toFixed(2));
          return callback();
        }

        console.log('Ratio is correct to sell: ' + ratio.toFixed(2));
        nextState = state.sell;
        callback();
      });
      break;
    }

    case state.sell: {
      console.log('State: sell');
      utils.getAccountBalances(userDefined.transactionDetails, function (err, result) {
        if (err) {
          console.error('Unexpected error 14: ' + err);
          nextState = state.lookForSell;
          return callback();
        }

        //console.log('Debug 14: ' + JSON.stringify(result));

        var currentXbtBalance = result.xbtBalance;

        console.log('Current XBT Balance: ' + currentXbtBalance);

        utils.getCurrentPrice(function (err, result) {
          if (err) {
            console.error('Unexpected error 15: ' + err);
            nextState = state.lookForSell;
            return callback();
          }

          //console.log('Debug 15: ' + JSON.stringify(result));

          var currentPrice = result;

          console.log('Current Price: ' + currentPrice);

          var volumeToSell = parseFloat(userDefined.tradingVolume);

          if (partialAmount != volumeToSell) volumeToSell = partialAmount;

          if (volumeToSell > parseFloat(currentXbtBalance)) {
            console.log('Not enough bitcoins to sell pre defined volume, selling what we have: ' + currentXbtBalance);
            volumeToSell = currentXbtBalance;
          }

          console.log('Placing sell order now with volume : ' + volumeToSell);

          utils.getLastTicket(function (err, result) {
            if (err) {
              console.error('Unexpected error 16: ' + err);
              return callback();
            }

            //console.log('Debug 16: ' + JSON.stringify(result));

            var lastAsk = parseInt(result.ask);

            console.log('Last Ask Price: ' + lastAsk);

            if (lastAsk <= currentPrice) {
              console.log('The last ask is the same as the current price, we cant sell now');
              nextState = state.lookForSell;
              return callback();
            }

            var priceToSell = 0;
            if (lastAsk == currentPrice + 1) priceToSell = lastAsk.toString();
            else priceToSell = (lastAsk - 1).toString();

            var placeAndForget = false;
            if (priceToSell < lastBuyPrice) {
              console.log('We want to sell lower than bought price');
              console.log('Setting hard limit and forgetting');
              console.log('BuyPrice: ' + lastBuyPrice);
              priceToSell = parseInt(lastBuyPrice) + parseInt(userDefined.hardLimit);
              placeAndForget = true;
            }

            // if we get here we can one up and place sell order
            console.log('Current Price: ' + currentPrice);
            console.log('Placing Sell Order At: ' + priceToSell);

            utils.setSellOrder(userDefined.transactionDetails, priceToSell.toString(), volumeToSell.toString(), function (err, result) {
              if (err) {
                console.error('Unexpected error 17: ' + err);
                nextState = state.lookForSell;
                return callback();
              }

              if (!result) {
                console.error('Failed to set sell order...');
                nextState = state.lookForSell;
                return callback();
              }

              console.log('Sell order has been set... monitor it now: ' + result);

              if (placeAndForget == true) {
                console.log('We have set hard limit, looking for buy again');
                nextState = state.lookForBuy;
                return callback();
              }

              lastSellPrice = parseInt(priceToSell);

              //console.log('Debug 17: ' + JSON.stringify(result));
              nextState = state.monitorSell;
              callback();
            });
          });
        });
      });
      break;
    }

    case state.monitorSell: {
      console.log('State: monitorSell');
      utils.getPendingOrders(userDefined.transactionDetails, userDefined.tradingVolume, function (err, result) {
        if (err) {
          console.error('Unexpected error 18: ' + err);
          return callback();
        }

        //console.log('Debug 18: ' + JSON.stringify(result));

        var pendingOrders = result.pendingOrdersAsk;

        if (pendingOrders.length == 0) {
          console.log('We have no pending orders, sell must have gone through, look for buy');
          tradeProfit += parseFloat(lastSellPrice) - parseFloat(lastBuyPrice);
          console.log('***********************************************************************************************');
          console.log('************************************************');
          console.log('Expected Profit: ' + tradeProfit.toFixed(2));
          console.log('************************************************');
          console.log('***********************************************************************************************');

          partialAmount = userDefined.tradingVolume;
          nextState = state.lookForBuy;
          //fs.writeFile('calculations.txt', tradeProfit.toFixed(2).toString(), 'utf8', callback);
          callback();
          return;
        }

        console.log('We have pending sell orders');

        var lastSellPendingOrder = pendingOrders[pendingOrders.length - 1];

        if (lastSellPendingOrder.baseBTC != 0) {
          // This means it has been partially filled
          console.log('We are waiting for the sell order to completely fill');
          return callback();
        }

        console.log('Our sell order is not partially filed');
        utils.getLastTicket(function (err, result) {
          if (err) {
            console.error('Unexpected error 21: ' + err);
            return callback();
          }

          //console.log('Debug 21: ' + JSON.stringify(result));

          if (result.ask >= lastSellPendingOrder.price) {
            console.log('We are still at least on top of the order book');
            return callback();
          }

          console.log('We are no longer on the top, stopping the sell order');

          utils.setStopOrder(userDefined.transactionDetails, lastSellPendingOrder.orderID, function (err, result) {
            if (err) {
              console.error('Unexpected error 22: ' + err);
              return callback();
            }

            if (!result || result != true) {
              console.error('Failed to stop the order ... ... ... : ' + result);
              return callback();
            }

            console.log('Success stopping the sell order, look to sell again: ' + result);

            //console.log('Debug 22: ' + JSON.stringify(result));
            nextState = state.lookForSell;
            callback();
          });
        });
      });
      break;
    }

    case state.sellPartial: {
      var priceToSell = parseInt(lastBuyPrice) + parseInt(userDefined.hardLimit);
      utils.setSellOrder(userDefined.transactionDetails, priceToSell, partialAmount, function (err, result) {
        if (err) {
          console.error('Unexpected error 23: ' + err);
          return callback();
        }

        if (!result) {
          console.error('Failed to set sell order...');
          return callback();
        }

        console.log('Set partial hard limit');
        nextState = state.lookForBuy;
        partialAmount = userDefined.tradingVolume;
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


