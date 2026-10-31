export interface ArrayCompareType {
  isMatched: boolean;
  nonMatchedValues?: any[];
  matchedValues?: any[];
}

/**
 * Every value of `searchArray` must exist in `array`. `array` may hold more.
 * Returns which values did and did not match.
 */
export const isArrayEqualToAnotherArray = (array: any[], searchArray: any[]): ArrayCompareType => {
  const nonMatchedValues: any[] = [];
  const matchedValues: any[] = [];
  searchArray?.map((item) => {
    if (!array?.some((x) => x?.toString() == item?.toString())) {
      nonMatchedValues.push(item);
    } else {
      matchedValues.push(item);
    }
  });

  const isMatched: boolean = nonMatchedValues?.length == 0;

  return { isMatched, nonMatchedValues, matchedValues };
};
