var should = require('chai').should();
var lunoTest = require('../luno.js');
var userDefinedTest = require('../userDefined.js');

describe('luno.js', function () {
  describe('getCurrentPrice()', function () {
    it('should get current price api call - expected behaviour', function (done) {
      this.timeout(5000);
      lunoTest.getCurrentBTCZAR(function (err, data) {
        should.not.exist(err);
        should.exist(data.body);
        data.body.indexOf('btc_price').should.not.eql(-1);
        data.body.indexOf('BTC/ZAR').should.not.eql(-1);
        done();
      });
    });
  });

  describe('getTicker()', function () {
    it('should test the ticker api call - expected behaviour', function (done) {
      this.timeout(5000);
      lunoTest.getTicker(function (err, data) {
        data = JSON.parse(data);
        should.not.exist(err);
        should.exist(data);
        should.exist(data.ask);
        should.exist(data.timestamp);
        should.exist(data.bid);
        should.exist(data.rolling_24_hour_volume);
        should.exist(data.last_trade);
        should.exist(data.pair);
        data.pair.should.eql('XBTZAR');
        done();
      });
    });
  });

  describe('getOrderBook()', function () {
    it('should test the order book api call - expected behaviour', function (done) {
      this.timeout(5000);
      lunoTest.getOrderBook(function (err, data) {
        data = JSON.parse(data);
        should.not.exist(err);
        should.exist(data);
        should.exist(data.timestamp);
        should.exist(data.asks);
        should.exist(data.bids);
        var arrayAsks = data.asks;
        var arrayBids = data.bids;
        for (var i = 0; i < arrayAsks.length; i++) {
          should.exist(arrayAsks[i].price);
          should.exist(arrayAsks[i].volume);
        }
        for (var j = 0; j < arrayBids.length; j++) {
          should.exist(arrayBids[j].price);
          should.exist(arrayBids[j].volume);
        }
        done();
      });
    });
  });

  describe('getTrades()', function () {
    it('should test the trades api call - expected behaviour', function (done) {
      this.timeout(5000);
      lunoTest.getTrades(function (err, data) {
        data = JSON.parse(data);
        should.not.exist(err);
        should.exist(data);
        should.exist(data.trades);
        var arrayTrades = data.trades;
        for (var i = 0; i < arrayTrades.length; i++) {
          should.exist(arrayTrades[i].volume);
          should.exist(arrayTrades[i].timestamp);
          should.exist(arrayTrades[i].price);
          should.exist(arrayTrades[i].is_buy);
          arrayTrades[i].is_buy.should.be.a.Boolean;
        }
        done();
      });
    });
  });

  describe('getBalances()', function () {
    it('should test the balance api call - expected behaviour', function (done) {
      this.timeout(5000);
      lunoTest.getBalances(userDefinedTest.transactionDetails, function (err, data) {
        data = JSON.parse(data);
        should.not.exist(err);
        should.exist(data);
        should.exist(data.balance);
        var arrayBalance = data.balance;
        for (var i = 0; i < arrayBalance.length; i++) {
          should.exist(arrayBalance[i].account_id);
          should.exist(arrayBalance[i].asset);
          should.exist(arrayBalance[i].balance);
          should.exist(arrayBalance[i].reserved);
          should.exist(arrayBalance[i].unconfirmed);
        }
        done();
      });
    });
  });

  describe('getListOrders()', function () {
    it('should test the balance api call - expected behaviour', function (done) {
      this.timeout(5000);
      lunoTest.getListOrders(userDefinedTest.transactionDetails, function (err, data) {
        data = JSON.parse(data);
        should.not.exist(err);
        should.exist(data);
        should.exist(data.orders);
        var arrayOrders = data.orders;
        for (var i = 0; i < arrayOrders.length; i++) {
          should.exist(arrayOrders[i].limit_price);
          should.exist(arrayOrders[i].limit_volume);
          should.exist(arrayOrders[i].order_id);
          should.exist(arrayOrders[i].state);
          should.exist(arrayOrders[i].type);
        }
        done();
      });
    });
  });
});
