function UserDefinedClass() {
  this.transactionDetails = {
    keyID: 'dpft9j8wfm9kv',
    secretID: 'trDsDL6ynQ8-4Wvmxox-cWphASyUo3vZzzQDekdS1D4'
  };
  this.debug = false;
  this.tradingVolume = '0.001';
  this.orderRandHistory = 80;
  this.ratioBuy = 0.80;
  this.ratioSell = 0.55;
  this.hardLimit = 100;
}

var userDefinedModule = new UserDefinedClass();
module.exports = userDefinedModule;
