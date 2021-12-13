/**
 * Contains reusable static utility methods for global usage
 */
export default class Util {
  /**
   * Splits an array into an array of arrays, with the arrays in the array
   * being the size of the chunk parameter
   *
   * @param array the array to be split
   * @param chunk the size of the chunks
   * @returns an array containing an array of chunks
   */
  static splitChunk<T>(array: T[], chunk: number): T[][] {
    let arrayOfArray = []
    while (array.length > 0) {
      arrayOfArray.push(array.splice(0, chunk))
    }
    return arrayOfArray
  }
}
