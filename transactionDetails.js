function TransactionDetailsClass() {
  this.transactionDetails = {
    keyID: 'nj9sbq46gvbuh',
    secretID: 'rbe8jFYXI_D7_p5jUIIV9WXbHVjz78HutIdRUfpAJr8'
  };

  this.tradingVolume = 0.0005;
  this.hardLimitSellPositive = 500;
  this.hardLimitSellNegative = 250;
}

var transactionDetailsModule = new TransactionDetailsClass();
module.exports = transactionDetailsModule;
