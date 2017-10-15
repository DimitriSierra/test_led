function UserDefinedClass() {
  this.transactionDetails = {
    keyID: '-',
    secretID: '-'
  };
  this.debug = false;
  this.tradingVolume = '0.001';
  this.orderRandHistory = 80;
  this.ratioBuy = 0.80;
  this.ratioSell = 0.55;
  this.hardLimit = 100;
  this.ratioRepeat = 1;
}

var userDefinedModule = new UserDefinedClass();
module.exports = userDefinedModule;
