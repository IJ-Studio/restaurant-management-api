import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

export function Match(property: string, validatorOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validatorOptions,
      constraints: [property],
      validator: MatchConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'Match' })
export class MatchConstraint implements ValidatorConstraintInterface {
  validate(value: any, validationArguments?: ValidationArguments) {
    const [relatedPropertyName] = validationArguments?.constraints || [];
    const relatedValue = (validationArguments?.object as any)[
      relatedPropertyName
    ];
    return value === relatedValue;
  }
  defaultMessage(validationArguments?: ValidationArguments): string {
    return (
      validationArguments?.property +
      ' must match ' +
      validationArguments?.constraints[0]
    );
  }
}
