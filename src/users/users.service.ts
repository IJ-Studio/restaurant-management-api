import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { DRIZZLE } from '../database/constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema/public.schema';
import {users} from '../database/schema/public.schema'
import { eq } from 'drizzle-orm';
import { InferSelectModel } from 'drizzle-orm';
import { BcryptService } from '../auth/bcrypt.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';

type User = InferSelectModel<typeof users>;

const ROLE_ADMIN = 1;
const ROLE_USER = 3;

@Injectable()
export class UsersService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly bcryptService: BcryptService,
  ) {}

  async createUser(
    createUserDto: CreateUserDto,
    adminId: number,
  ): Promise<User> {
    // Verificación de rol admin
    const admin = await this.db
      .select()
      .from(users)
      .where(eq(users.id, adminId));

    if (!admin || admin.length === 0 || admin[0].roleId !== ROLE_ADMIN) {
      throw new ForbiddenException(
        'Solo administradores pueden crear usuarios',
      );
    }

    const { name, lastname, phone, email, password, roleId, verified } =
      createUserDto;

    try {
      const newUser = await this.db
        .insert(users)
        .values({
          name,
          lastname,
          phone,
          email,
          password: await this.bcryptService.hash(password),
          verified: verified || false,
          loginAttempts: 0,
          roleId: roleId || ROLE_USER,
        })
        .returning();

      return newUser[0];
    } catch (error) {
      throw new BadRequestException(
        'Error al crear usuario. El email ya existe.',
      );
    }
  }

  async getAllUsers(adminId: number): Promise<User[]> {
    const admin = await this.db
      .select()
      .from(users)
      .where(eq(users.id, adminId));

    if (!admin || admin.length === 0 || admin[0].roleId !== ROLE_ADMIN) {
      throw new ForbiddenException('Solo administradores pueden ver usuarios');
    }

    return await this.db.select().from(users);
  }

  async getUserById(id: number): Promise<User> {
    const user = await this.db.select().from(users).where(eq(users.id, id));

    if (!user || user.length === 0) {
      throw new BadRequestException('Usuario no encontrado');
    }

    return user[0];
  }

  async updateUser(
    id: number,
    updateData: Partial<User>,
    requesterId: number,
  ): Promise<User> {
    const requester = await this.getUserById(requesterId);

    // Solo puede actualizar su propio perfil u otro si es admin
    if (requesterId !== id && requester.roleId !== ROLE_ADMIN) {
      throw new ForbiddenException(
        'No tienes permisos para actualizar este usuario',
      );
    }

    const updatedUser = await this.db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    return updatedUser[0];
  }

  //!ADMIN
  async deleteUser(id: number, adminId: number): Promise<void> {
    const admin = await this.getUserById(adminId);

    if (admin.roleId !== ROLE_ADMIN) {
      throw new ForbiddenException(
        'Solo administradores pueden eliminar usuarios',
      );
    }

    await this.db.delete(users).where(eq(users.id, id));
  }
}
