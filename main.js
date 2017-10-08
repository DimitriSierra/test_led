#!/usr/bin/env node
var async = require('async');
var utils = require('./utils.js');
var userDefined = require('./userDefined.js');

//todo: add in these for the console logs
var debugOption = userDefined.debug;

var nextState = 0;
var state = {
  startUp: 0,
  tradeDirection: 1,
  lookForBuy: 2,
  buy: 3,
  monitorBuy: 4,
  lookForSell: 5,
  sell: 6,
  monitorSell: 7
};

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
    case state.startUp:
    {
      console.log('State: startUp');
      //todo: check pending orders
      // if no pending orders, check balance
      // else perform action on those pending orders
      //todo: check balances
      // if xbt is positive, we need to look for a sell order
      // else make sure rand is positive, then look for a direction(buy)

      // Check if we have any pending orders out
      utils.getPendingOrders(userDefined.transactionDetails, function (err, result) {
        if (err) {
          console.error('Unexpected error 1: ' + err);
          // Stay in the current state
          return callback();
        }
        console.log('Debug 1: ' + JSON.stringify(result));
        if (result.pendingOrdersBid.length || result.pendingOrdersAsk.length) {
          console.log('pending orders');
          //todo: go to the appropriate state
          return callback();
        }
        // No pending orders, now check the balances
        utils.getAccountBalances(userDefined.transactionDetails, function (err, result) {
          if (err) {
            console.error('Unexpected error 2: ' + err);
            // Stay in the current state
            return callback();
          }
          console.log('Debug 2: ' + JSON.stringify(result));
          if (result.xbtBalance) {
            console.log('positive xbt balance');
            //todo: go to the appropriate state to look for a sell order
            return callback();
          }
          else if (result.zarBalance) {
            console.log('positive zar balance');
            //todo: we have a positive zar balance, so we can buy, look for direction
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

    case state.lookForBuy:
    {
      console.log('State: lookForBuy');
      utils.getOrderBookSummary(userDefined.orderRandHistory, function (err, result) {
        if (err) {
          console.error('Unexpected error 3: ' + err);
          return callback();
        }

        console.log('Debug 3: ' + JSON.stringify(result));

        var orderTotal = parseFloat(result.bidVolume) + parseFloat(result.askVolume);

        var ratio = result.bidVolume / orderTotal;

        if (ratio < userDefined.ratioBuy) {
          console.log('Ratio is not correct to buy: ' + ratio.toFixed(2));
          return callback();
        }

        console.log('Ratio is correct to buy: ' + ratio.toFixed(2));
        nextState = state.buy;
        callback();
      });
      break;
    }

    case state.buy:
    {
      console.log('State: buy');
      utils.getAccountBalances(userDefined.transactionDetails, function (err, result) {
        if (err) {
          console.error('Unexpected error 4: ' + err);
          nextState = state.lookForBuy;
          return callback();
        }

        console.log('Debug 4: ' + JSON.stringify(result));

        var currentZarBalance = result.zarBalance;
        utils.getCurrentPrice(function (err, result) {
          if (err) {
            console.error('Unexpected error 5: ' + err);
            nextState = state.lookForBuy;
            return callback();
          }

          console.log('Debug 5: ' + JSON.stringify(result));

          var currentPrice = result;

          if (currentPrice * userDefined.tradingVolume >= currentZarBalance) {
            console.log('Not enough money to buy');
            nextState = state.lookForBuy;
            return callback();
          }

          console.log('Placing buy order now');

          utils.getLastTicket(function (err, result) {
            if (err) {
              console.error('Unexpected error 6: ' + err);
              return callback();
            }

            console.log('Debug 6: ' + JSON.stringify(result));

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
            console.log('Current Price: ' + currentPrice);
            console.log('WE ARE PLACING A BUY ORDER AT: ' + priceToBuy);

            utils.setBuyOrder(userDefined.transactionDetails, priceToBuy, userDefined.tradingVolume, function (err, result) {
              if (err) {
                console.error('Unexpected error 7: ' + err);
                nextState = state.lookForBuy;
                return callback();
              }

              console.log('Debug 7: ' + JSON.stringify(result));
              console.log('Buy order has been set... monitor it now');
              nextState = state.monitorBuy;
              callback();
            });
          });
        });
      });
      break;
    }

    case state.monitorBuy:
    {
      console.log('State: monitorBuy');
      utils.getPendingOrders(userDefined.transactionDetails, function (err, result) {
        if (err) {
          console.error('Unexpected error 8: ' + err);
          return callback();
        }

        console.log('Debug 8: ' + JSON.stringify(result));

        var pendingOrders = result.pendingOrdersBid;

        if (pendingOrders.length == 0) {
          console.log('We have no pending orders, buy must have gone through, look for sell');
          nextState = state.lookForSell;
          return callback();
        }

        //todo: we need to handle multiple pending orders here
        if (pendingOrders[0].baseBTC != 0) {
          // This means it has been partially filled
          utils.getLastTicket(function (err, result) {
            if (err) {
              console.error('Unexpected error 9: ' + err);
              return callback();
            }

            console.log('Debug 9: ' + JSON.stringify(result));

            if (result.bid > pendingOrders[0].price) {
              console.log('Someone has out bid us, stop the current order');
              utils.setStopOrder(userDefined.transactionDetails, pendingOrders[0].orderID, function (err, result) {
                if (err) {
                  console.error('Unexpected error 10: ' + err);
                  return callback();
                }

                console.log('Debug 10: ' + JSON.stringify(result));
                console.log('We stopped the order successfully, look for buy');
                nextState = state.lookForSell;
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

          console.log('Debug 11: ' + JSON.stringify(result));

          if (result.bid <= pendingOrders[0].price) {
            console.log('We are still at least on top of the order book');
            return callback();
          }

          utils.setStopOrder(userDefined.transactionDetails, pendingOrders[0].orderID, function (err, result) {
            if (err) {
              console.error('Unexpected error 12: ' + err);
              return callback();
            }

            console.log('Debug 12: ' + JSON.stringify(result));
            nextState = state.lookForBuy;
            callback();
          });
        });
      });
      break;
    }

    case state.lookForSell:
    {
      console.log('State: lookForSell');
      utils.getOrderBookSummary(userDefined.orderRandHistory, function (err, result) {
        if (err) {
          console.error('Unexpected error 13: ' + err);
          return callback();
        }

        console.log('Debug 13: ' + JSON.stringify(result));

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

    case state.sell:
    {
      console.log('State: sell');
      utils.getAccountBalances(userDefined.transactionDetails, function (err, result) {
        if (err) {
          console.error('Unexpected error 14: ' + err);
          nextState = state.lookForSell;
          return callback();
        }

        console.log('Debug 14: ' + JSON.stringify(result));

        var currentXbtBalance = result.xbtBalance;
        utils.getCurrentPrice(function (err, result) {
          if (err) {
            console.error('Unexpected error 15: ' + err);
            nextState = state.lookForSell;
            return callback();
          }

          console.log('Debug 15: ' + JSON.stringify(result));

          var currentPrice = result;

          var volumeToSell = parseFloat(userDefined.tradingVolume);

          if (volumeToSell >= parseFloat(currentXbtBalance)) {
            console.log('Not enough bitcoins to sell pre defined volume, selling what we have: ' + currentXbtBalance);
            volumeToSell = currentXbtBalance;
          }

          console.log('Placing sell order now');

          utils.getLastTicket(function (err, result) {
            if (err) {
              console.error('Unexpected error 16: ' + err);
              return callback();
            }

            console.log('Debug 16: ' + JSON.stringify(result));

            var lastAsk = parseInt(result.ask);

            if (lastAsk <= currentPrice) {
              console.log('The last ask is the same as the current price, we cant sell now');
              nextState = state.lookForSell;
              return callback();
            }

            var priceToSell = 0;
            if (lastAsk == currentPrice + 1) priceToSell = lastAsk.toString();
            else priceToSell = (lastAsk - 1).toString();

            // if we get here we can one up and place sell order
            console.log('Current Price: ' + currentPrice);
            console.log('WE ARE PLACING A SELL ORDER AT: ' + priceToSell);

            utils.setSellOrder(userDefined.transactionDetails, priceToSell, volumeToSell.toString(), function (err, result) {
              if (err) {
                console.error('Unexpected error 17: ' + err);
                nextState = state.lookForSell;
                return callback();
              }

              console.log('Debug 17: ' + JSON.stringify(result));
              console.log('Sell order has been set... monitor it now');
              nextState = state.monitorSell;
              callback();
            });
          });
        });
      });
      break;
    }

    case state.monitorSell:
    {
      console.log('State: monitorSell');
      utils.getPendingOrders(userDefined.transactionDetails, function (err, result) {
        if (err) {
          console.error('Unexpected error 18: ' + err);
          return callback();
        }

        console.log('Debug 18: ' + JSON.stringify(result));

        var pendingOrders = result.pendingOrdersAsk;

        if (pendingOrders.length == 0) {
          console.log('We have no pending orders, sell must have gone through, look for buy');
          nextState = state.lookForBuy;
          return callback();
        }

        //todo: we need to handle multiple pending orders here
        var lastSellPendingOrder = pendingOrders.pop();

        if (lastSellPendingOrder.baseBTC != 0) {
          // This means it has been partially filled
          utils.getLastTicket(function (err, result) {
            if (err) {
              console.error('Unexpected error 19: ' + err);
              return callback();
            }

            console.log('Debug 19: ' + JSON.stringify(result));

            //todo: forcing this to never hit, how do we wanna handle a sell order thats partial
            if ((result.ask < lastSellPendingOrder.price) && 0) {
              console.log('Someone has out bid us, stop the current order');
              utils.setStopOrder(userDefined.transactionDetails, lastSellPendingOrder.orderID, function (err, result) {
                if (err) {
                  console.error('Unexpected error 20: ' + err);
                  return callback();
                }

                console.log('Debug 20: ' + JSON.stringify(result));
                console.log('We stopped the order successfully, look for buy');
                //todo: dont think this is correct
                nextState = state.lookForBuy;
                callback();
              });
              return;
            }

            console.log('we are still at least on the top of the order book');
            callback();
          });
          return;
        }

        console.log('Our sell order is not partially filed');
        utils.getLastTicket(function (err, result) {
          if (err) {
            console.error('Unexpected error 21: ' + err);
            return callback();
          }

          console.log('Debug 21: ' + JSON.stringify(result));

          if (result.ask >= lastSellPendingOrder.price) {
            console.log('We are still at least on top of the order book');
            return callback();
          }

          utils.setStopOrder(userDefined.transactionDetails, lastSellPendingOrder.orderID, function (err, result) {
            if (err) {
              console.error('Unexpected error 22: ' + err);
              return callback();
            }

            console.log('Debug 22: ' + JSON.stringify(result));
            nextState = state.lookForSell;
            callback();
          });
        });
      });
      break;
    }

    default:
    {
      console.log('State: unknown (' + nextState + ')');
      callback();
      break;
    }
  }
}


