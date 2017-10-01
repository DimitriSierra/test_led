//#!/usr/bin/env node
//var async = require('async');
//var luno = require('./luno');
//
////todo: end of each cycle we want to right the prices to a file
////todo: it must load the bought and sell price from the file, or retrieve it
//
//var transactionDetails = {
//  'keyID': 'naw2ktw67anhq',
//  'secretID': '1Lc3sZJ91OYHED8JLXvyIvwk3vOBCT-XNrQIGx8sipI',
//  'tradeVolume': 0.007,
//  'priceBuyChange': 10.00,
//  'priceSellIncrease': 1100,
//  'priceSellDecrease': -25.00
//};
//var currentState = 0;
//var state = {
//  'startCheckOrders': 0,
//  'getCurrentPrice': 1,
//  'orderBuy': 2,
//  'orderSell': 3,
//  'monitorBuy': 4,
//  'monitorSell': 5
//};
//var orderDetails = {
//  'priceBuy': 0,
//  'priceSell': 0,
//  'id': ''
//};
//var timerWatch;
//var timerWatchPeriod = 120 * 60 * 1000; // 120 minutes
//var timerWatchReached = false;
//
//cycleState();
//
//function cycleState() {
//
//  async.series([
//    function (cb) {
//      switch (currentState) {
//        default:
//          cb('Unknown State ... ' + currentState);
//          break;
//
//        case state.startCheckOrders:
//          lunoApi.getOrdersPending(transactionDetails, function (err, result) {
//            if (err || !result) return cb('Failed to check pending orders: ' + err);
//            // Check pending orders and assign appropriate state
//            if ((result.buy == 0) && (result.sell == 0)) {
//              currentState = state.getCurrentPrice;
//              console.log('Retrieving current bitcoin price');
//              return cb();
//            }
//            // If we have buy orders out
//            if (result.buy > 0) {
//              console.log('We have a buy order out');
//              currentState = state.monitorBuy;
//            }
//            // Else we have sell orders out
//            else {
//              console.log('We have a sell order out');
//              currentState = state.monitorSell;
//            }
//            timerWatch = setTimeout(function () {
//              timerWatchReached = true;
//            }, timerWatchPeriod);
//            cb();
//          });
//          break;
//
//        case state.getCurrentPrice:
//          lunoApi.getLastTradePrice(function (err, result) {
//            if (err || !result || !result.lastTrade) {
//              return cb('Failed to get the last trade / current price: ' + err);
//            }
//            console.log('Current Price: ' + result.lastTrade);
//            orderDetails.priceBuy = lunoApi.calculateBuyPrice(result.lastTrade, transactionDetails.priceBuyChange);
//            console.log('Buy Price: ' + orderDetails.priceBuy);
//            currentState = state.orderBuy;
//            cb();
//          });
//          break;
//
//        case state.orderBuy:
//          lunoApi.setOrderBuy(transactionDetails, orderDetails.priceBuy, transactionDetails.tradeVolume, function (err, result) {
//            if (err || !result || !result.order_id) {
//              currentState = state.getCurrentPrice;
//              return cb('Failed to place buy order: ' + err);
//            }
//            orderDetails.id = result.order_id;
//            console.log('BuyID: ' + orderDetails.id);
//            timerWatchReached = false;
//            timerWatch = setTimeout(function () {
//              timerWatchReached = true;
//            }, timerWatchPeriod);
//            currentState = state.monitorBuy;
//            cb();
//          });
//          break;
//
//        case state.orderSell:
//          lunoApi.getBitCoinBalance(transactionDetails, function (err, result) {
//            if (err || !result || !result.bitCoinBalance) {
//              return cb('Failed to get XBT balance: ' + err);
//            }
//            var sellVolume = result.bitCoinBalance;
//            if (sellVolume <= 0) return cb('XBT balance is not positive');
//            console.log('Sell Volume: ' + sellVolume);
//            lunoApi.setOrderSell(transactionDetails, orderDetails.priceSell, sellVolume, function (err, result) {
//              if (err || !result) return cb('Failed to place sell: ' + err);
//              if (result.error == 'Insufficient balance.') return cb('Insufficient balance');
//              orderDetails.id = result.order_id;
//              timerWatchReached = false;
//              timerWatch = setTimeout(function () {
//                timerWatchReached = true;
//              }, timerWatchPeriod);
//              currentState = state.monitorSell;
//              cb();
//            });
//          });
//          break;
//
//        case state.monitorBuy:
//          lunoApi.getOrdersPending(transactionDetails, function (err, result) {
//            if (err || !result) return cb('Failed to check pending orders in buy monitor: ' + err);
//
//            if (timerWatchReached === true) {
//              console.log('Timeout reached, stopping the buy order');
//              lunoApi.setOrderStop(transactionDetails, orderDetails.id, function (err, result) {
//                if (err || !result || result.success === false) return cb('Failed to stop buy order: ' + err);
//                if (result.success === true) {
//                  console.log('Success stopping buy order');
//                  lunoApi.getBitCoinBalance(transactionDetails, function (err, result) {
//                    if (err || !result) {
//                      currentState = state.startCheckOrders;
//                      return cb('Failed to get XBT buy balance: ' + err);
//                    }
//                    var bitCoinBalance = result.bitCoinBalance;
//                    if (bitCoinBalance <= 0) {
//                      currentState = state.startCheckOrders;
//                      return cb('XBT balance is not positive, nothing was bought');
//                    }
//                    // If it gets here we have something to sell
//                    orderDetails.priceSell = lunoApi.calculateSellPrice(orderDetails.priceBuy, transactionDetails.priceSellIncrease);
//                    console.log('Calculated sell price - partial: ' + orderDetails.priceSell);
//                    currentState = state.orderSell;
//                    cb();
//                  });
//                  return;
//                }
//                return cb('Should not get here to stop buy order');
//              });
//              return;
//            }
//
//            // If buy order is positive, means it has not been fully bought yet
//            if (result.buy > 0) return cb();
//            // Buy order is complete
//            console.log('Buy order was successful');
//            clearTimeout(timerWatch);
//            timerWatchReached = false;
//            orderDetails.priceSell = lunoApi.calculateSellPrice(orderDetails.priceBuy, transactionDetails.priceSellIncrease);
//            console.log('Calculated sell price: ' + orderDetails.priceSell);
//            currentState = state.orderSell;
//            cb();
//          });
//          break;
//
//        case state.monitorSell:
//          lunoApi.getOrdersPending(transactionDetails, function (err, result) {
//            if (err || !result) return cb('Failed to check pending orders in sell monitor: ' + err);
//
//            if (timerWatchReached === true) {
//              console.log('Timeout reached, stopping the sell order');
//              lunoApi.setOrderStop(transactionDetails, orderDetails.id, function (err, result) {
//                if (err || !result || result.success === false) {
//                  return cb('Failed to stop sell order: ' + err);
//                }
//                if (result.success === true) {
//                  console.log('Success stopping sell order');
//                  orderDetails.priceSell = lunoApi.calculateSellPrice(orderDetails.priceSell, transactionDetails.priceSellDecrease);
//                  console.log('New sell price: ' + orderDetails.priceSell);
//                  currentState = state.orderSell;
//                  return cb();
//                }
//                return cb('Should not get here to stop sell order');
//              });
//              return;
//            }
//            if (result.sell > 0) return cb();
//            console.log('Sell order has gone through');
//            clearTimeout(timerWatch);
//            timerWatchReached = false;
//            currentState = state.startCheckOrders;
//            cb();
//          });
//          break;
//      }
//    }
//  ], function (err) {
//    if (err)console.log(err);
//    // The switch statement is complete
//    // Re run the state machine in 10 seconds
//    setTimeout(function () {
//      cycleState();
//    }, 10000);
//  });
//}
