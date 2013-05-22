var adt = require('../adt');
var data = adt.data, any = adt.any;

var Either = data({
  Right : { value: any },
  Left  : { value: any }
});

Either.of = function (value) {
  return Either.Right(value);
};

Either.prototype.map = function (fn) {
  return this.isLeft ? Either.Left(this.value) : Either.Right(fn(this.value));
};

Either.prototype.ap = function (arg) {
  return this.isLeft ? Either.Left(this.value) : arg.map(this.value);
};

Either.prototype.chain = function (fn) {
  return this.isLeft ? Either.Left(this.value) : fn(this.value);
};

module.exports = Either.seal();
