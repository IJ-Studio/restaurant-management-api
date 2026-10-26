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
import { PublicUser, toPublicUser } from '../auth/auth.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { UpdateUserDto } from 'src/users/dto/update-user.dto';
import { ChangePasswordDto } from 'src/users/dto/change-password.dto';
import { ChangeRoleDto } from 'src/users/dto/change-role.dto';
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...userWithoutPassword } = newUser[0];
      return userWithoutPassword;
    } catch {
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
    return allUsers.map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ password: _, ...user }) => user,
    );
  }

  /** Perfil público: solo el propio usuario o un admin. Nunca incluye el hash de la contraseña. */
  async getPublicUserById(
    id: number,
    requesterId: number,
  ): Promise<PublicUser> {
    const requester = await this.findUserById(requesterId);

    if (requesterId !== id && requester.roleId !== ROLES.ADMIN) {
      throw new ForbiddenException('No tienes permisos para ver este usuario');
    }

    const user = requesterId === id ? requester : await this.findUserById(id);

    return toPublicUser(user);
  }

  /** Uso interno del servicio: devuelve la fila completa, incluida la contraseña. */
  private async findUserById(id: number): Promise<User> {
    const user = await this.db.select().from(users).where(eq(users.id, id));

    if (!user || user.length === 0) {
      throw new BadRequestException('Usuario no encontrado');
    }

    return user[0];
  }

  async updateUser(
    id: number,
    updateData: UpdateUserDto,
    requesterId: number,
  ): Promise<Omit<User, 'password'>> {
    const requester = await this.findUserById(requesterId);

    // Solo puede actualizar su propio perfil u otro si es admin
    if (requesterId !== id && requester.roleId !== ROLES.ADMIN) {
      throw new ForbiddenException(
        'No tienes permisos para actualizar este usuario',
      );
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No hay campos para actualizar');
    }

    const updatedUser = await this.db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    const userRecord = updatedUser[0];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = userRecord;
    return userWithoutPassword;
  }

  async changePassword(
    id: number,
    dto: ChangePasswordDto,
    requesterId: number,
  ): Promise<void> {
    if (requesterId !== id) {
      throw new ForbiddenException('Solo puedes cambiar tu propia contraseña');
    }

    const user = await this.findUserById(id);
    const currentMatches = await this.bcryptService.compare(
      dto.currentPassword,
      user.password,
    );

    if (!currentMatches) {
      throw new BadRequestException('La contraseña actual no es correcta');
    }

    await this.db
      .update(users)
      .set({
        password: await this.bcryptService.hash(dto.newPassword),
        loginAttempts: 0,
        loginLockUntil: 0,
      })
      .where(eq(users.id, id));
  }

  async changeRole(
    id: number,
    roleId: ChangeRoleDto['roleId'],
    adminId: number,
  ): Promise<PublicUser> {
    const admin = await this.findUserById(adminId);

    if (admin.roleId !== ROLES.ADMIN) {
      throw new ForbiddenException('Solo administradores pueden cambiar roles');
    }

    const [updated] = await this.db
      .update(users)
      .set({ roleId })
      .where(eq(users.id, id))
      .returning();

    if (!updated) {
      throw new BadRequestException('Usuario no encontrado');
    }

    return toPublicUser(updated);
  }

  //! ADMIN only
  async deleteUser(id: number, adminId: number): Promise<void> {
    const admin = await this.findUserById(adminId);

    if (admin.roleId !== ROLES.ADMIN) {
      throw new ForbiddenException(
        'Solo administradores pueden eliminar usuarios',
      );
    }

    await this.db.delete(users).where(eq(users.id, id));
  }
}
