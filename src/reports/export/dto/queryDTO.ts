import { IsEnum, IsInt, IsOptional, IsString, IsISO8601 } from 'class-validator';
import { Type } from 'class-transformer';

export enum ExportFormat {
  CSV = 'csv',
  XLSX = 'xlsx',
  PDF = 'pdf',
}

export enum ExportType {
  DISHES = 'dishes',
  DAILY = 'daily',
}

export class ExportQueryDto {
  @IsEnum(ExportType)
  type: ExportType;

  @IsEnum(ExportFormat)
  format: ExportFormat;

  @IsISO8601()
  startDate: string;

  @IsISO8601()
  endDate: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;
}
