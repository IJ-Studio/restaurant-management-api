import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { DatabaseModule } from '../database/database.module';
import { BcryptService } from '../auth/bcrypt.service';
import jwtConfig from 'src/common/config/jwt.config';
import { AuthModule } from '../auth/auth.module';
import { ConfigModule } from '@nestjs/config';


@Module({
  imports: [DatabaseModule, AuthModule, ConfigModule.forFeature(jwtConfig)],
  controllers: [UsersController],
  providers: [UsersService, BcryptService],
  exports: [UsersService],
})
export class UsersModule {}
