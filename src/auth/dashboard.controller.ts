import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guards';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';

@Controller('dashboard')
export class DashboardController {
  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1)// ID del rol admin
  getAdminDashboard() {
    return { message: 'admin_dashboard' };
  }

  @Get('chef')
  @UseGuards(JwtAuthGuard,RolesGuard)
  @Roles(2) // ID del rol chef
  getChefDashboard(){
    return { message: 'chef_dashboard'};
  }
}
