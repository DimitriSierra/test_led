function UserDefinedClass() {
  this.transactionDetails = {
    keyID: '-',
    secretID: '-'
  };
  this.tradingVolume = '0.02';
  this.orderRandHistory = 80;
  this.ratioBuy = 0.75;
  this.ratioSell = 0.50;
  this.hardLimit = 100;
  this.ratioRepeat = 1;
}

var userDefinedModule = new UserDefinedClass();
module.exports = userDefinedModule;
