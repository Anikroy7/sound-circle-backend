import {
  isArray,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";
import { ArrayCompareType, isArrayEqualToAnotherArray } from "@soundcircle/shared/utils/util/array.utils";

@ValidatorConstraint({ name: "isValueIn", async: false })
class IsValueInValidatorRule implements ValidatorConstraintInterface {
  allowedValues: string[];

  validate(searchValue: any | any[], args: ValidationArguments): boolean {
    this.allowedValues = args?.constraints?.[0] ?? [];
    return isValueIn(this.allowedValues, searchValue);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args?.property} must be one of the following values: ${this.allowedValues.join(", ")}`;
  }
}

/** Use with `enumValuesToArray(SomeEnum)` — never with a hand-written literal list. */
export function IsValueIn(allowedValues: any[], validationOptions?: ValidationOptions): any {
  const cns: any[] = [allowedValues];
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: "IsValueIn",
      target: object.constructor,
      propertyName: propertyName,
      constraints: cns,
      options: validationOptions,
      validator: IsValueInValidatorRule,
    });
  };
}

// allowedValues is always an array; searchValues may be single or an array
export function isValueIn(allowedValues: any[], searchValues: any | any[]): boolean {
  searchValues = isArray(searchValues) ? searchValues : [searchValues];
  const matchResult: ArrayCompareType = isArrayEqualToAnotherArray(allowedValues, searchValues);
  return matchResult?.isMatched;
}
