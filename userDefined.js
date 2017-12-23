function UserDefinedClass() {
  this.transactionDetails = {
    keyID: '-',
    secretID: '-'
  };
  this.tradingVolume = '0.011';
  this.orderRandHistory = 80;
  this.ratioBuy = 0.75;
  this.ratioSell = 0.50;
  this.hardLimit = 100;
  this.ratioRepeat = 2;
  this.inputAmount = 70000;

  this.tradingGapVolume = '0.01';
  this.gapRange = 300;
  this.feePercentMakeUp = 1.01;

  this.cycleDelay = 3000;
  this.ratioDelay = 10000;
  this.noCashDelay = 60000;
}

var userDefinedModule = new UserDefinedClass();
module.exports = userDefinedModule;
