import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { DRIZZLE } from '../database/drizzle/constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema/public.schema';
import { users } from '../database/schema/public.schema';
import { eq } from 'drizzle-orm';
import { InferSelectModel } from 'drizzle-orm';
import { BcryptService } from '../auth/bcrypt.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { ROLES } from '../common/constants/roles';

type User = InferSelectModel<typeof users>;

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
  ): Promise<Omit<User, 'password'>> {
    // Verificar que el admin existe y tiene roleId=1
    const admin = await this.db
      .select()
      .from(users)
      .where(eq(users.id, adminId));

    if (!admin || admin.length === 0 || admin[0].roleId !== ROLES.ADMIN) {
      throw new ForbiddenException(
        'Solo administradores pueden crear usuarios',
      );
    }

    // Validar roleId no sea admin
    if (createUserDto.roleId === ROLES.ADMIN) {
      throw new BadRequestException('No puedes crear otro administrador');
    }

    const { name, lastname, phone, email, password, roleId } = createUserDto;

    try {
      const newUser = await this.db
        .insert(users)
        .values({
          name,
          lastname,
          phone,
          email,
          password: await this.bcryptService.hash(password),
          verified: false,
          loginAttempts: 0,
          roleId: roleId || ROLES.CAJERO,
        })
        .returning();

      // No devolver password
      const { password: _, ...userWithoutPassword } = newUser[0];
      return userWithoutPassword;
    } catch (error) {
      throw new BadRequestException('El email ya existe o hay un error');
    }
  }

  async getAllUsers(adminId: number): Promise<Omit<User, 'password'>[]> {
    const admin = await this.db
      .select()
      .from(users)
      .where(eq(users.id, adminId));

    if (!admin || admin.length === 0 || admin[0].roleId !== ROLES.ADMIN) {
      throw new ForbiddenException('Solo administradores pueden ver usuarios');
    }

    const allUsers = await this.db.select().from(users);
    return allUsers.map(({ password: _, ...user }) => user as Omit<User, 'password'>);
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
  ): Promise<Omit<User, 'password'>> {
    const requester = await this.getUserById(requesterId);

    // Solo puede actualizar su propio perfil u otro si es admin
    if (requesterId !== id && requester.roleId !== ROLES.ADMIN) {
      throw new ForbiddenException(
        'No tienes permisos para actualizar este usuario',
      );
    }

    const updatedUser = await this.db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    const userRecord = updatedUser[0];
    const { password: _, ...userWithoutPassword } = userRecord;
    return userWithoutPassword as Omit<User, 'password'>;
  }

  //! ADMIN only
  async deleteUser(id: number, adminId: number): Promise<void> {
    const admin = await this.getUserById(adminId);

    if (admin.roleId !== ROLES.ADMIN) {
      throw new ForbiddenException(
        'Solo administradores pueden eliminar usuarios',
      );
    }

    await this.db.delete(users).where(eq(users.id, id));
  }
}
