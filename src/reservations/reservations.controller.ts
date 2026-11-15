import { instanteLocal } from '../reglas/horario';
import { MENSAJES } from '../reglas/reglas.service';
import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import {
  AvailabilityQueryDto,
  HorasQueryDto,
} from './dto/availability-query.dto';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guards';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES } from '../common/constants/roles';
import { ActiveUser } from '../auth/decorators/active-user.decorator';
import { createWhitelistPipe } from '../common/config/validation.config';
import type { ActiveUserData } from '../common/interfaces/active-user-data.interface';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Public()
  @Get('availability')
  async getAvailability(@Query() query: AvailabilityQueryDto) {
    // La fecha y la hora son del restaurante: no se interpretan con la zona del servidor (UTC en Render).
    const config = await this.reservationsService.getRestaurantConfig();
    const fecha = instanteLocal(
      query.fecha,
      query.hora,
      config.zonaHoraria || 'America/Mexico_City',
    );
    const duracion = query.duracionMin || config.duracionReservaDefault;
    const result = await this.reservationsService.getAvailableTables(
      fecha,
      duracion,
      query.numComensales,
    );
    return {
      fecha: query.fecha,
      hora: query.hora,
      numComensales: query.numComensales,
      mesasDisponibles: result.available,
      mesasOcupadas: result.occupied,
      hayDisponibilidad: result.available.length > 0,
    };
  }

  /** Horas del día con su estado y motivo (DV-06): lo que se ofrece es lo que se acepta. */
  @Public()
  @Get('horas')
  async getHoras(@Query() query: HorasQueryDto) {
    return this.reservationsService.horasDelDia(
      query.fecha,
      query.numComensales,
    );
  }

  @Public()
  @Get('map')
  async getTableMap(
    @Query('fechaHora') fechaHora?: string,
    @Query('numComensales') numComensales?: string,
  ) {
    // Sin comensales, el plano de siempre (cualquier mesa vale para 1).
    const personas = numComensales === undefined ? 1 : Number(numComensales);
    if (!Number.isInteger(personas) || personas < 1 || personas > 50) {
      throw new BadRequestException(MENSAJES.comensales(50));
    }
    return await this.reservationsService.getTableMap(fechaHora, personas);
  }

  @Public()
  @Post()
  async create(@Body() createReservationDto: CreateReservationDto) {
    return await this.reservationsService.createReservation(
      createReservationDto,
    );
  }

  // El personal de piso necesita ver las reservaciones del día (app móvil, HU-04);
  // el detalle y la edición siguen siendo solo del Admin.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN, ROLES.CAJERO, ROLES.MESERO)
  @Get()
  async findAll(
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('estatus') estatus?: string,
    @Query('clienteNombre') clienteNombre?: string,
  ) {
    return await this.reservationsService.findAll({
      fechaDesde,
      fechaHasta,
      estatus,
      clienteNombre,
    });
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
  async update(
    @Param('id') id: string,
    // Lista blanca: antes todo el cuerpo llegaba a .set() y se podía escribir cualquier columna.
    @Body(createWhitelistPipe()) updateReservationDto: UpdateReservationDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return await this.reservationsService.update(
      id,
      updateReservationDto,
      Number(user.id),
    );
  }
}
