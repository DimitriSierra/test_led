#!/usr/bin/env node
var async = require('async');
var utils = require('./utils.js');
var transactionDetails = require('./transactionDetails.js');

//todo: add in these for the console logs
var debugOption = false;
var debugExclude = false;

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
    default:
      console.log('State: unknown (' + nextState + ')');
      callback();
      break;

    case state.startUp:
      console.log('State: startUp');
      //todo: check pending orders
      // if no pending orders, check balance
      // else perform action on those pending orders
      //todo: check balances
      // if xbt is positive, we need to look for a sell order
      // else make sure rand is positive, then look for a direction(buy)

      // Check if we have any pending orders out
      utils.getPendingOrders(transactionDetails.transactionDetails, function (err, result) {
        if (err) {
          console.error('Unexpected error 1: ' + err);
          // Stay in the current state
          return callback();
        }
        console.log('Debug1: ' + JSON.stringify(result));
        if (result.pendingOrdersBid.length || result.pendingOrdersAsk.length) {
          console.log('pending orders');
          //todo: go to the appropriate state
          return callback();
        }
        // No pending orders, now check the balances
        utils.getAccountBalances(transactionDetails.transactionDetails, function (err, result) {
          if (err) {
            console.error('Unexpected error 2: ' + err);
            // Stay in the current state
            return callback();
          }
          console.log('Debug2: ' + JSON.stringify(result));
          if (result.xbtBalance && debugExclude) {
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
            console.error('Unexpected error 3 - no balances');
            return callback();
          }
        });
      });
      break;

    case state.lookForBuy:
      console.log('State: lookForBuy');
      //todo: getOrderBookSummary
      // if its looking up, check the direction
      // if direction is up, place buy order
      //else stay in the state.

      //todo: the smaller we have these numbers, the more accurate we should be for small trades?
      utils.getOrderBookSummary(15, function (err, result) {
        if (err) {
          console.error('Unexpected error 4: ' + err);
          // Stay in the current state
          return callback();
        }
        console.log('Debug3: ' + JSON.stringify(result));
        var orderTotal = result.bidVolume + result.askVolume;
        var ratio = result.bidVolume / orderTotal;
        if (ratio < 0.75) {
          console.log('Ratio is not correct to buy: ' + ratio);
          return callback();
        }

        //todo: do we want the direction here?

        utils.getRecentTradeSummary(15, function (err, result) {
          if (err) {
            console.error('Unexpected error 5: ' + err);
            // Stay in the current state
            return callback();
          }

          console.log('Debug4: ' + JSON.stringify(result));
          if ((result.soldCount >= result.boughtCount) && (result.soldVolume >= result.boughtVolume)) {
            // we have a negative direction, expect the price to drop, possible monitor for buy
            console.log('negative direction - do not buy');
            return callback();
          }

          console.log('BOOM WE CAN BUY NOW, WE EXPECT IT TO GO UP');
          nextState = state.buy;
          callback();
        });
      });
      break;

    case state.buy:
      console.log('State: buy');
      //todo: we should check available balance to make sure we can buy that amount
      // if not, we might need to buy less
      // else place the order

      utils.getAccountBalances(transactionDetails.transactionDetails, function (err, result) {
        if (err) {
          console.error('Unexpected error 5: ' + err);
          nextState = state.lookForBuy;
          return callback();
        }

        console.log('Debug5: ' + JSON.stringify(result));

        var currentZarBalance = result.zarBalance;
        utils.getCurrentPrice(function (err, result) {
          if (err) {
            console.error('Unexpected error 6: ' + err);
            nextState = state.lookForBuy;
            return callback();
          }

          console.log('Debug6: ' + JSON.stringify(result));

          var currentPrice = result;

          if (currentPrice * transactionDetails.tradingVolume >= currentZarBalance) {
            console.log('Not enough money to buy');
            nextState = state.lookForBuy;
            return callback();
          }

          console.log('Placing buy order now');

          //todo: what price do we want to sell at
          // we have the ratio with us, so we should try get in as soon as possible?
          // therefor one above last bidding price, unless that is the current price?
          utils.setBuyOrder(transactionDetails, 1000, transactionDetails.tradingVolume, function (err, result) {
            if (err) {
              console.error('Unexpected error 7: ' + err);
              nextState = state.lookForBuy;
              return callback();
            }

            console.log('Debug7: ' + JSON.stringify(result));
            console.log('Buy order has been set... monitor it now');
            nextState = state.monitorBuy;
            callback();
          });
        });
      });
      break;

    case state.monitorBuy:
      console.log('State: monitorBuy');
      //todo: check the bid pending orders
      // if we dont have, it has gone through and we can look for sell or set sell order?

      //todo: check if it has been partially filled, check if we can
      // if its partial filed keep waiting,

      //todo: if it is empty, check the last bid and current price
      // if there is last bid above us, one up it unless its the current price

      utils.getPendingOrders(transactionDetails.transactionDetails, function (err, result) {
        if (err) {
          console.error('Unexpected error 8: ' + err);
          return callback();
        }

        console.log('Debug8: ' + JSON.stringify(result));
        var pendingBids = result.pendingOrdersBid;
        if (!pendingBids.length) {
          console.log('array is empty, means the order has gone through');
          nextState = state.lookForSell;
          return callback();
        }

        callback();

      });
      break;
  }
}


