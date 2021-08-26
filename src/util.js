const util = {
  splitChunk(arr, chunk) {
    let arrOfArr = [];
    while (arr.length > 0) {
      let tempArray;
      tempArray = arr.splice(0, chunk);
      arrOfArr.push(tempArray);
    }
    return arrOfArr;
  },
};

module.exports = util;
