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
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { REQUEST_USER_KEY } from 'src/common/constants';
import { ActiveUserData } from 'src/common/interfaces/active-user-data.interface';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createUser(@Body() createUserDto: CreateUserDto, @Req() request: any) {
    const admin = request[REQUEST_USER_KEY] as ActiveUserData;
    return await this.usersService.createUser(
      createUserDto,
      parseInt(admin.id),
    );
  }

  @Get()
  async getAllUsers(@Req() request: any) {
    const admin = request[REQUEST_USER_KEY] as ActiveUserData;
    return await this.usersService.getAllUsers(parseInt(admin.id));
  }

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    return await this.usersService.getUserById(parseInt(id));
  }

  @Patch(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() updateData: Partial<any>,
    @Req() request: any,
  ) {
    const user = request[REQUEST_USER_KEY] as ActiveUserData;
    return await this.usersService.updateUser(
      parseInt(id),
      updateData,
      parseInt(user.id),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param('id') id: string, @Req() request: any) {
    const admin = request[REQUEST_USER_KEY] as ActiveUserData;
    return await this.usersService.deleteUser(parseInt(id), parseInt(admin.id));
  }
}
