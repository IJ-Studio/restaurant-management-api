import { PartialType } from '@nestjs/swagger';
import { CreatePayrollEntryDto } from './create-payroll-entry.dto';

export class UpdatePayrollEntryDto extends PartialType(CreatePayrollEntryDto) {}
