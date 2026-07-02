import { IsOptional, IsString, IsIn, IsInt, Min, Max, IsDateString, IsBoolean } from 'class-validator';

export class UpdateReservationDto {
  @IsOptional()
  @IsString()
  @IsIn(['pendiente', 'confirmada', 'cancelada', 'completada', 'no_show'], {
    message: 'Estado inválido',
  })
  estatus?: string;

  @IsOptional()
  @IsString()
  notas?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  numComensales?: number;

  @IsOptional()
  @IsDateString()
  fechaHora?: string;

  @IsOptional()
  @IsInt()
  mesaId?: number;

  @IsOptional()
  @IsBoolean()
  recordatorioEnviado?: boolean;
}
