import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guards';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES } from '../common/constants/roles';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Public()
  @Get('availability')
  async getAvailability(@Query() query: AvailabilityQueryDto) {
    const fecha = new Date(`${query.fecha}T${query.hora}:00`);
    const duracionDefault = 90; // hardcodeado por ahora
    const duracion = query.duracionMin || duracionDefault;
    const result = await this.reservationsService.getAvailableTables(fecha, duracion, query.numComensales);
    return {
      fecha: query.fecha,
      hora: query.hora,
      numComensales: query.numComensales,
      mesasDisponibles: result.available,
      mesasOcupadas: result.occupied,
      hayDisponibilidad: result.available.length > 0,
    };
  }

  @Public()
  @Get('map')
  async getTableMap(@Query('fechaHora') fechaHora?: string) {
    return await this.reservationsService.getTableMap(fechaHora);
  }

  @Public()
  @Post()
  async create(@Body() createReservationDto: CreateReservationDto) {
    return await this.reservationsService.createReservation(createReservationDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN)
  @Get()
  async findAll(
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('estatus') estatus?: string,
    @Query('clienteNombre') clienteNombre?: string,
  ) {
    return await this.reservationsService.findAll({ fechaDesde, fechaHasta, estatus, clienteNombre });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.reservationsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateReservationDto: UpdateReservationDto) {
    return await this.reservationsService.update(id, updateReservationDto);
  }
}
