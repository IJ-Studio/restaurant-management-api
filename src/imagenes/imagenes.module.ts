import { Module } from '@nestjs/common';

import { ImagenesController } from './imagenes.controller';

@Module({ controllers: [ImagenesController] })
export class ImagenesModule {}
