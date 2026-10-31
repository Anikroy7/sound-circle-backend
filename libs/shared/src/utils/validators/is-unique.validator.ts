import { registerDecorator, ValidationArguments, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from "class-validator";
import { Injectable } from "@nestjs/common";
import { EntityManager, Not } from "typeorm";

/**
 * Registered as a provider in every app's `AppModule` — `useContainer` is what lets
 * class-validator resolve it from the Nest container.
 */
@ValidatorConstraint({ name: "IsUnique", async: true })
@Injectable()
export class UniqueValidatorRule implements ValidatorConstraintInterface {
  constructor(private entityManager: EntityManager) {}

  isUpdate: boolean;
  updatedId: number | string;

  async validate(value: string, args: any): Promise<boolean> {
    const entityName: string = args.constraints[0];
    const attribute = args.constraints[1] ?? args.property;
    const primaryColumnName = args.constraints[3] ?? "id";
    this.isUpdate = args.constraints[2] ?? false;
    this.updatedId = args?.object?.updated_id;

    if (!value) return; // No value provided

    if (this.isUpdate && !this.updatedId) return; // isUpdate set but UniqueColumnDto not extended on the update DTO

    const whereQuery = this.isUpdate ? { [attribute]: value, [primaryColumnName]: Not(this.updatedId) } : { [attribute]: value };

    const result = await this.entityManager.getRepository(entityName).findOne({ where: whereQuery });

    return !result; // A hit means not unique
  }

  public defaultMessage(args: ValidationArguments): string {
    const value = args?.value;
    if (!value) return "Provide value for unique check";
    if (this.isUpdate && !this.updatedId) return `updated_id is missing in the request body`;
    return `${args.property} already exist`;
  }
}

export function IsUnique(
  entityName: any,
  options?: { attribute?: string; isUpdate?: boolean; primaryColumnName?: string },
  validationOptions?: ValidationOptions,
): any {
  const cns = [entityName, options?.attribute, options?.isUpdate, options?.primaryColumnName];

  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: "isUnique",
      target: object.constructor,
      propertyName: propertyName,
      constraints: cns,
      options: validationOptions,
      validator: UniqueValidatorRule,
    });
  };
}
