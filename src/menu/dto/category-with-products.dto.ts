import { ApiProperty } from '@nestjs/swagger';

class ProductSummaryDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  nombre: string;

  @ApiProperty({ required: false })
  descripcion?: string;

  @ApiProperty()
  precio: number;

  @ApiProperty({ required: false })
  imagen_url?: string;

  @ApiProperty()
  disponible: boolean;
}

export class CategoryWithProductsDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  nombre: string;

  @ApiProperty({ required: false })
  descripcion?: string;

  @ApiProperty({ required: false })
  imagen_url?: string;

  @ApiProperty({ type: [ProductSummaryDto] })
  productos: ProductSummaryDto[];
}
