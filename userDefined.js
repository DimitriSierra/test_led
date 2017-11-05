function UserDefinedClass() {
  this.transactionDetails = {
    keyID: 'dpft9j8wfm9kv',
    secretID: 'trDsDL6ynQ8-4Wvmxox-cWphASyUo3vZzzQDekdS1D4'
  };
  this.tradingVolume = '0.04';
  this.orderRandHistory = 80;
  this.ratioBuy = 0.75;
  this.ratioSell = 0.50;
  this.hardLimit = 100;
  this.ratioRepeat = 1;
}

var userDefinedModule = new UserDefinedClass();
module.exports = userDefinedModule;
