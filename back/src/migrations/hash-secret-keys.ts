// One-shot data migration: rewrite every User.secret_key as a bcrypt hash.
//
// Idempotent: rows whose secret_key already starts with "$2" (bcrypt) are
// skipped, so the script can be run multiple times safely.
//
// Usage:
//   pnpm --filter @mccbng/back build
//   node ./dist/migrations/hash-secret-keys.js

import {hash} from 'bcryptjs';
import {ApiLoopbackApplication} from '../application';
import {UserRepository} from '../repositories';

async function run() {
  const app = new ApiLoopbackApplication();
  await app.boot();

  const userRepo = await app.getRepository(UserRepository);
  const users = await userRepo.find();

  let hashed = 0;
  let skipped = 0;

  for (const user of users) {
    const current = user.secret_key;
    if (!current) {
      skipped++;
      continue;
    }
    if (current.startsWith('$2')) {
      skipped++;
      continue;
    }

    const hashedValue = await hash(current, 12);
    await userRepo.updateById(user.id, {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      secret_key: hashedValue,
    });
    hashed++;
  }

  console.log(
    `Done: hashed ${hashed} user(s), skipped ${skipped} (already hashed or empty).`,
  );
  process.exit(0);
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
