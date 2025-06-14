Array.prototype.notEmptyEvery = function (predicate) {
  return this.length > 0 && this.every(predicate);
};

export const arraysEqual = (arr1, arr2) => {
  if (arr1.length !== arr2.length) {
    return false;
  }
  return arr1.every((element, index) => element === arr2[index]);
};
