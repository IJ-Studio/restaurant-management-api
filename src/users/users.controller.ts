import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeRoleDto } from './dto/change-role.dto';
import {
  createStrictValidationPipe,
  createWhitelistPipe,
} from '../common/config/validation.config';
import { REQUEST_USER_KEY } from 'src/common/constants';
import { ROLES } from 'src/common/constants/roles';
import { ActiveUserData } from 'src/common/interfaces/active-user-data.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guards';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

type RequestWithUser = { [REQUEST_USER_KEY]: ActiveUserData };

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN)
  async createUser(
    @Body() createUserDto: CreateUserDto,
    @Req() request: RequestWithUser,
  ) {
    const admin = request[REQUEST_USER_KEY];
    return await this.usersService.createUser(
      createUserDto,
      parseInt(admin.id),
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN)
  async getAllUsers(@Req() request: RequestWithUser) {
    const admin = request[REQUEST_USER_KEY];
    return await this.usersService.getAllUsers(parseInt(admin.id));
  }

  // ─── ENDPOINT PARA AUT COLLABORATION / ME ───
  @Get(':id')
  @UseGuards(JwtAuthGuard) // 👈 Agregado para validar el token que envía Next.js y obtener la data limpia
  async getUserById(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: RequestWithUser,
  ) {
    return await this.usersService.getPublicUserById(
      id,
      parseInt(request[REQUEST_USER_KEY].id),
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard) // 👈 Agregado porque tu lógica interna depende de `request[REQUEST_USER_KEY]`
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body(createWhitelistPipe()) updateData: UpdateUserDto,
    @Req() request: RequestWithUser,
  ) {
    const user = request[REQUEST_USER_KEY];
    return await this.usersService.updateUser(
      id,
      updateData,
      parseInt(user.id),
    );
  }

  @Patch(':id/password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body(createStrictValidationPipe()) dto: ChangePasswordDto,
    @Req() request: RequestWithUser,
  ) {
    await this.usersService.changePassword(
      id,
      dto,
      parseInt(request[REQUEST_USER_KEY].id),
    );

    return { message: 'Contraseña actualizada correctamente' };
  }

  @Patch(':id/role')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN)
  async changeRole(
    @Param('id', ParseIntPipe) id: number,
    @Body(createStrictValidationPipe()) dto: ChangeRoleDto,
    @Req() request: RequestWithUser,
  ) {
    return await this.usersService.changeRole(
      id,
      dto.roleId,
      parseInt(request[REQUEST_USER_KEY].id),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN)
  async deleteUser(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: RequestWithUser,
  ) {
    const admin = request[REQUEST_USER_KEY];
    return await this.usersService.deleteUser(id, parseInt(admin.id));
  }
}
