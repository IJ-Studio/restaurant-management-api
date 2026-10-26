import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt } from 'class-validator';

import { CREATABLE_ROLES } from '../../common/constants/roles';

/** Contrato de `PATCH /users/:id/role` (solo admin). No permite asignar el rol admin. */
export class ChangeRoleDto {
  @ApiProperty({
    example: 3,
    description: '2=Cajero, 3=Mesero, 4=Cocina, 5=Cliente',
    enum: CREATABLE_ROLES,
  })
  @IsInt()
  @IsIn(CREATABLE_ROLES)
  readonly roleId!: number;
}
