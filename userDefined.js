function UserDefinedClass() {
  this.transactionDetails = {
    keyID: 'jryayzr5dzckq',
    secretID: 'RazZMEieTsbBCkBfvofLydrGyqMurXRsrNc8aMQ3D0g'
  };
  this.debug = false;
  this.tradingVolume = '0.001';
  this.orderRandHistory = 80;
  this.ratioBuy = 0.80;
  this.ratioSell = 0.50;
  this.hardLimit = 100;
}

var userDefinedModule = new UserDefinedClass();
module.exports = userDefinedModule;
