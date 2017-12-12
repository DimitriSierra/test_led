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

function stateMachine(callback) {
  switch (nextState) {
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
            volumeToSell = currentXbtBalance.toFixed(5);
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
          //console.log('We are waiting for the sell order to completely fill');
          console.log('Order started selling - not waiting for it to fill - LookForBuy');
          nextState = state.lookForBuy;
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


