import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

export function Match(property: string, validatorOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
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
  validate(value: unknown, validationArguments?: ValidationArguments) {
    const [relatedPropertyName] = (validationArguments?.constraints ??
      []) as string[];
    const relatedValue = (
      validationArguments?.object as Record<string, unknown> | undefined
    )?.[relatedPropertyName];
    return value === relatedValue;
  }
  defaultMessage(validationArguments?: ValidationArguments): string {
    // Hoy solo se usa para confirmar la contraseña; el texto es el del formulario de registro.
    const [otra] = (validationArguments?.constraints ?? []) as string[];
    return otra === 'password'
      ? 'Las contraseñas no coinciden.'
      : `«${validationArguments?.property}» debe coincidir con «${otra}».`;
  }
}
