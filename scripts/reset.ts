import { openDb, resetDb } from '../src/server/db';

const db = openDb();
resetDb(db);
db.close();
console.log(`Database reset: ${process.env.DB_PATH ?? 'data/elder-help.db'}`);
