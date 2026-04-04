import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guards';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';

@Controller('dashboard')
export class DashboardController {
  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1) // admin
  getAdminDashboard() {
    return { message: 'admin_dashboard' };
  }

  @Get('cajero')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(2) // cajero
  getCajeroDashboard() {
    return { message: 'cajero_dashboard' };
  }

  @Get('mesero')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(3) // mesero
  getMesreroDashboard() {
    return { message: 'mesero_dashboard' };
  }

  @Get('cocina')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(4) // cocina
  getCocinaDashboard() {
    return { message: 'cocina_dashboard' };
  }

  @Get('cliente')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(5) // cliente
  getClienteDashboard() {
    return { message: 'cliente_dashboard' };
  }
}
