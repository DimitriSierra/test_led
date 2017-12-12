var should = require('chai').should();
var utilsTest = require('../utils.js');
var userDefinedTest = require('../userDefined.js');

describe('utils.js', function () {

  describe('getCurrentPrice()', function () {
    it('should test that we get the current price - expected behaviour', function (done) {
      this.timeout(5000);
      utilsTest.getCurrentPrice(function (err, data) {
        should.not.exist(err);
        should.exist(data);
        data.should.be.an('Number');
        done();
      });
    });
  });

  describe('getLastTicket()', function () {
    it('should test that we get the latest trade price - expected behaviour', function (done) {
      this.timeout(5000);
      utilsTest.getLastTicket(function (err, data) {
        should.not.exist(err);
        should.exist(data.bid);
        done();
      });
    });
  });

  describe('getOrderBookSummary()', function () {
    it('should test that we get the orderBook - numOrders invalid', function (done) {
      this.timeout(5000);
      utilsTest.getOrderBookSummary(null, function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.eql('numOrders passed incorrectly');
        done();
      });
    });

    it('should test that we get the orderBook - numOrders not integer', function (done) {
      this.timeout(5000);
      utilsTest.getOrderBookSummary('abc', function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.eql('numOrders not integer');
        done();
      });
    });

    it('should test that we get the orderBook - numOrders not larger than 0', function (done) {
      this.timeout(5000);
      utilsTest.getOrderBookSummary(0, function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.eql('numOrders not larger than 0');
        done();
      });
    });

    it('should test that we get the orderBook - expected behaviour', function (done) {
      this.timeout(5000);
      utilsTest.getOrderBookSummary(10, function (err, data) {
        should.not.exist(err);
        should.exist(data);
        should.exist(data.bidVolume);
        should.exist(data.askVolume);
        parseFloat(data.bidVolume).should.be.greaterThan(0);
        parseFloat(data.askVolume).should.be.greaterThan(0);
        done();
      });
    });
  });

  describe('getRecentTradeSummary()', function () {
    it('should test that we get the recent trades - numTrades invalid', function (done) {
      this.timeout(5000);
      utilsTest.getRecentTradeSummary(null, function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.eql('numTrades passed incorrectly');
        done();
      });
    });

    it('should test that we get the recent trades - numTrades not integer', function (done) {
      this.timeout(5000);
      utilsTest.getRecentTradeSummary('abc', function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.eql('numTrades not integer');
        done();
      });
    });

    it('should test that we get the recent trades - numTrades not larger than 0', function (done) {
      this.timeout(5000);
      utilsTest.getRecentTradeSummary(0, function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.eql('numTrades not larger than 0');
        done();
      });
    });

    it('should test that we get the recent trades - expected behaviour', function (done) {
      this.timeout(5000);
      var numTrades = 25;
      utilsTest.getRecentTradeSummary(numTrades, function (err, data) {
        should.not.exist(err);
        should.exist(data);
        should.exist(data.boughtCount);
        should.exist(data.soldCount);
        data.boughtCount.should.be.greaterThan(0);
        data.soldCount.should.be.greaterThan(0);
        var totalTrades = data.boughtCount + data.soldCount;
        totalTrades.should.eql(numTrades);
        done();
      });
    });
  });

  describe('getAccountBalances()', function () {
    it('should test the account balance - no transaction detail', function (done) {
      this.timeout(5000);
      utilsTest.getAccountBalances(null, function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.eql('API Object passed incorrectly');
        done();
      });
    });

    it('should test the account balance - no keyID', function (done) {
      this.timeout(5000);
      var details = {secretID: 'password'};
      utilsTest.getAccountBalances(details, function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.eql('API Object passed incorrectly');
        done();
      });
    });

    it('should test the account balance - no secretID', function (done) {
      this.timeout(5000);
      var details = {keyID: 'username'};
      utilsTest.getAccountBalances(details, function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.eql('API Object passed incorrectly');
        done();
      });
    });

    it('should test the account balance - invalid details', function (done) {
      this.timeout(5000);
      var details = {keyID: 'username', secretID: 'password'};
      utilsTest.getAccountBalances(details, function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.eql('Unauthorized\n');
        done();
      });
    });

    it('should test the account balance - expected behaviour', function (done) {
      this.timeout(5000);
      utilsTest.getAccountBalances(userDefinedTest.transactionDetails, function (err, data) {
        should.not.exist(err);
        should.exist(data);
        should.exist(data.xbtBalance);
        should.exist(data.zarBalance);
        done();
      });
    });


  });

  describe.only('getOrders()', function () {
    it('should test the pending orders - no transaction detail', function (done) {
      this.timeout(5000);
      utilsTest.getOrders(null, null, function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.eql('API Object passed incorrectly');
        done();
      });
    });

    it('should test the pending orders - no keyID', function (done) {
      this.timeout(5000);
      var details = {secretID: 'password'};
      utilsTest.getOrders(details, null, function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.eql('API Object passed incorrectly');
        done();
      });
    });

    it('should test the pending orders - no secretID', function (done) {
      this.timeout(5000);
      var details = {keyID: 'username'};
      utilsTest.getOrders(details, null, function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.eql('API Object passed incorrectly');
        done();
      });
    });

    it('should test the pending orders - invalid details', function (done) {
      this.timeout(5000);
      var details = {keyID: 'username', secretID: 'password'};
      utilsTest.getOrders(details, '0.05', function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.eql('Unauthorized\n');
        done();
      });
    });

    it('should test the pending orders - expected behaviour', function (done) {
      this.timeout(5000);
      utilsTest.getOrders(userDefinedTest.transactionDetails, '0.005', function (err, data) {
        should.not.exist(err);
        should.exist(data);
        should.exist(data.orders);
        data.orders.should.be.instanceOf(Array);
        done();
      });
    });
  });

  describe('setBuyOrder()', function () {
    it('should test the buy order - no transaction detail', function (done) {
      this.timeout(5000);
      utilsTest.setBuyOrder(null, '10000', '0.5', function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.eql('API Object passed incorrectly');
        done();
      });
    });

    it('should test the buy order - no keyID', function (done) {
      this.timeout(5000);
      var details = {secretID: 'password'};
      utilsTest.setBuyOrder(details, '10000', '0.5', function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.eql('API Object passed incorrectly');
        done();
      });
    });

    it('should test the buy order - no secretID', function (done) {
      this.timeout(5000);
      var details = {keyID: 'username'};
      utilsTest.setBuyOrder(details, '10000', '0.5', function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.eql('API Object passed incorrectly');
        done();
      });
    });

    it('should test the buy order - invalid details', function (done) {
      this.timeout(5000);
      var details = {keyID: 'username', secretID: 'password'};
      utilsTest.setBuyOrder(details, '10000.00', '0.5', function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.eql('Unauthorized\n');
        done();
      });
    });

    it('should test the buy order - no orderPrice', function (done) {
      this.timeout(5000);
      var details = {keyID: 'username', secretID: 'password'};
      utilsTest.setBuyOrder(details, null, '0.5', function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.eql('OrderPrice passed incorrectly');
        done();
      });
    });

    it('should test the buy order - invalid orderPrice', function (done) {
      this.timeout(5000);
      var details = {keyID: 'username', secretID: 'password'};
      utilsTest.setBuyOrder(details, 'invalidPrice', '0.5', function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.eql('OrderPrice invalid - not number string');
        done();
      });
    });

    it('should test the buy order - orderPrice size', function (done) {
      this.timeout(5000);
      var details = {keyID: 'username', secretID: 'password'};
      utilsTest.setBuyOrder(details, '6', '0.5', function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.eql('OrderPrice invalid - smaller than 10');
        done();
      });
    });

    it('should test the buy order - no orderVolume', function (done) {
      this.timeout(5000);
      var details = {keyID: 'username', secretID: 'password'};
      utilsTest.setBuyOrder(details, '10000.00', null, function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.eql('OrderVolume passed incorrectly');
        done();
      });
    });

    it('should test the buy order - invalid orderVolume string', function (done) {
      this.timeout(5000);
      var details = {keyID: 'username', secretID: 'password'};
      utilsTest.setBuyOrder(details, '500', 'abc', function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.eql('OrderVolume invalid');
        done();
      });
    });

    it('should test the buy order - invalid orderVolume size', function (done) {
      this.timeout(5000);
      var details = {keyID: 'username', secretID: 'password'};
      utilsTest.setBuyOrder(details, '500', '0.0004', function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.eql('OrderVolume invalid - smaller than 0.005');
        done();
      });
    });
  });

  describe('setSellOrder()', function () {
    it('should test the sell order - no transaction detail', function (done) {
      this.timeout(5000);
      utilsTest.setSellOrder(null, '10000', '0.5', function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.eql('API Object passed incorrectly');
        done();
      });
    });

    it('should test the sell order - no keyID', function (done) {
      this.timeout(5000);
      var details = {secretID: 'password'};
      utilsTest.setSellOrder(details, '10000', '0.5', function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.eql('API Object passed incorrectly');
        done();
      });
    });

    it('should test the sell order - no secretID', function (done) {
      this.timeout(5000);
      var details = {keyID: 'username'};
      utilsTest.setSellOrder(details, '10000', '0.5', function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.eql('API Object passed incorrectly');
        done();
      });
    });

    it('should test the sell order - invalid details', function (done) {
      this.timeout(5000);
      var details = {keyID: 'username', secretID: 'password'};
      utilsTest.setSellOrder(details, '10000.00', '0.5', function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.eql('Unauthorized\n');
        done();
      });
    });

    it('should test the sell order - no orderPrice', function (done) {
      this.timeout(5000);
      var details = {keyID: 'username', secretID: 'password'};
      utilsTest.setSellOrder(details, null, '0.5', function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.eql('OrderPrice passed incorrectly');
        done();
      });
    });

    it('should test the sell order - invalid orderPrice', function (done) {
      this.timeout(5000);
      var details = {keyID: 'username', secretID: 'password'};
      utilsTest.setSellOrder(details, 'invalidPrice', '0.5', function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.eql('OrderPrice invalid - not number string');
        done();
      });
    });

    it('should test the sell order - orderPrice size', function (done) {
      this.timeout(5000);
      var details = {keyID: 'username', secretID: 'password'};
      utilsTest.setSellOrder(details, '6', '0.5', function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.eql('OrderPrice invalid - smaller than 10');
        done();
      });
    });

    it('should test the sell order - no orderVolume', function (done) {
      this.timeout(5000);
      var details = {keyID: 'username', secretID: 'password'};
      utilsTest.setSellOrder(details, '10000.00', null, function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.eql('OrderVolume passed incorrectly');
        done();
      });
    });

    it('should test the sell order - invalid orderVolume string', function (done) {
      this.timeout(5000);
      var details = {keyID: 'username', secretID: 'password'};
      utilsTest.setSellOrder(details, '500', 'abc', function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.eql('OrderVolume invalid');
        done();
      });
    });

    it('should test the sell order - invalid orderVolume size', function (done) {
      this.timeout(5000);
      var details = {keyID: 'username', secretID: 'password'};
      utilsTest.setSellOrder(details, '500', '0.0004', function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.eql('OrderVolume invalid - smaller than 0.005');
        done();
      });
    });
  });

  describe('setStopOrder()', function () {
    it('should test the stop order - no transaction detail', function (done) {
      this.timeout(5000);
      utilsTest.setStopOrder(null, 'abcd', function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.eql('API Object passed incorrectly');
        done();
      });
    });

    it('should test the stop order - no keyID', function (done) {
      this.timeout(5000);
      var details = {secretID: 'password'};
      utilsTest.setStopOrder(details, 'abcd', function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.eql('API Object passed incorrectly');
        done();
      });
    });

    it('should test the stop order - no secretID', function (done) {
      this.timeout(5000);
      var details = {keyID: 'username'};
      utilsTest.setStopOrder(details, 'abcd', function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.eql('API Object passed incorrectly');
        done();
      });
    });

    it('should test the stop order - no orderID', function (done) {
      this.timeout(5000);
      var details = {keyID: 'username', secretID: 'password'};
      utilsTest.setStopOrder(details, null, function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.eql('OrderID passed incorrectly');
        done();
      });
    });

    it('should test the stop order - invalid orderID', function (done) {
      this.timeout(5000);
      utilsTest.setStopOrder(userDefinedTest.transactionDetails, 'abcdefg', function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.eql('Invalid order_id param\n');
        done();
      });
    });

    it('should test the stop order - invalid details', function (done) {
      this.timeout(5000);
      var details = {keyID: 'username', secretID: 'password'};
      utilsTest.setStopOrder(details, 'abcde', function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.eql('Unauthorized\n');
        done();
      });
    });
  });

  describe('use cases', function () {
    it('should place buy order and then stop it - expected behaviour', function (done) {
      this.timeout(10000);
      utilsTest.setBuyOrder(userDefinedTest.transactionDetails, '20', '0.0005', function (err, data) {
        should.not.exist(err);
        should.exist(data);
        var orderID = data;
        // At this point the post order is successful
        setTimeout(function () {
          utilsTest.setStopOrder(userDefinedTest.transactionDetails, orderID, function (err, data) {
            should.not.exist(err);
            should.exist(data);
            data.should.eql(true);
            done();
          });
        }, 5000);
      });
    });

    //it.skip('should place sell order and then stop it - expected behaviour', function (done) {
    //  this.timeout(10000);
    //  utilsTest.setSellOrder(transactionDetailsTest.transactionDetails, '1000000', '0.0005', function (err, data) {
    //    should.not.exist(err);
    //    should.exist(data);
    //    var orderID = data;
    //    // At this point the post order is successful
    //    setTimeout(function () {
    //      utilsTest.setStopOrder(transactionDetailsTest.transactionDetails, orderID, function (err, data) {
    //        should.not.exist(err);
    //        should.exist(data);
    //        data.should.eql(true);
    //        done();
    //      });
    //    }, 5000);
    //  });
    //});
  });

});
