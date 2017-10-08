function UserDefinedClass() {
  this.transactionDetails = {
    keyID: 'nj9sbq46gvbuh',
    secretID: 'rbe8jFYXI_D7_p5jUIIV9WXbHVjz78HutIdRUfpAJr8'
  };
  this.debug = false;
  this.tradingVolume = '0.0005';
  this.orderRandHistory = 80;
  this.ratioBuy = 0.80;
  this.ratioSell = 0.60;
  this.hardLimitSellPositive = 500;
  this.hardLimitSellNegative = 250;
}

var userDefinedModule = new UserDefinedClass();
module.exports = userDefinedModule;
