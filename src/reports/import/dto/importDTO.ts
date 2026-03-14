export enum ImportFormat {
  CSV = 'csv',
  XLSX = 'xlsx',
  JSON = 'json',
}

export enum ImportType {
  DISHES = 'dishes',
  SALES_BY_DAY = 'sales_by_day',
}

export interface ImportQueryDto {
  type: ImportType;
  mode?: 'insert' | 'upsert';
}
