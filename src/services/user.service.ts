import { db } from '../lib/db';
import { users } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

export class UserService {
  async findById(id: number) {
    return db.query.users.findFirst({
      where: eq(users.id, id),
    });
  }
}