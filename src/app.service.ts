import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from './database/database.module';

@Injectable()
export class AppService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async testDb() {
    return this.db.execute('select now()');
  }
}
