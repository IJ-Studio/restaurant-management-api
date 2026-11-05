import { Module } from '@nestjs/common';

import { ReportesProblemasController } from './reportes-problemas.controller';

@Module({ controllers: [ReportesProblemasController] })
export class ReportesProblemasModule {}
