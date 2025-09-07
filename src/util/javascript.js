// Wraps `Array.every()` to return false for empty arrays.
Array.prototype.notEmptyEvery = function (predicate) {
  return this.length > 0 && this.every(predicate);
};
