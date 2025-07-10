Array.prototype.notEmptyEvery = function (predicate) {
  return this.length > 0 && this.every(predicate);
};
