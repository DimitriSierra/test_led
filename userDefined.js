function UserDefinedClass() {
  this.transactionDetails = {
    keyID: '-',
    secretID: '-'
  };
  this.tradingVolume = '0.01';
  this.orderRandHistory = 80;
  this.ratioBuy = 0.75;
  this.ratioSell = 0.50;
  this.hardLimit = 100;
  this.ratioRepeat = 1;
  this.inputAmount = 10000;

  this.tradingGapVolume = '0.01';
  this.gapRange = 300;
  this.feePercentMakeUp = 1.01;
}

var userDefinedModule = new UserDefinedClass();
module.exports = userDefinedModule;
