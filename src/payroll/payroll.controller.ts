import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PayrollService } from './payroll.service';
import { CreatePayrollEntryDto } from './dto/create-payroll-entry.dto';
import { UpdatePayrollEntryDto } from './dto/update-payroll-entry.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ActiveUser } from '../auth/decorators/active-user.decorator';
import type { ActiveUserData } from '../common/interfaces/active-user-data.interface';

@ApiTags('payroll')
@Controller('payroll')
@UseGuards(RolesGuard)
@Roles(1)
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get()
  async findAll() {
    return this.payrollService.findAll();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreatePayrollEntryDto) {
    return this.payrollService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePayrollEntryDto) {
    return this.payrollService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @ActiveUser() usuario: ActiveUserData,
    @Query('motivo') motivo?: string,
  ) {
    await this.payrollService.remove(id, {
      motivo,
      autorId: Number(usuario.id),
    });
  }
}
