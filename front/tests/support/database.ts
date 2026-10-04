export interface DbConfig { host: string; port: number; user: string; password: string; database: string }
export type DbCredentials = Omit<DbConfig, 'database'>

// MySQL : base externe via TEST_DB_* (CI, MySQL local), sinon conteneur Testcontainers jetable.
export const startDatabase = async () => {
  if (process.env.TEST_DB_HOST) {
    return {
      db: {
        host: process.env.TEST_DB_HOST,
        port: Number(process.env.TEST_DB_PORT ?? 3306),
        user: process.env.TEST_DB_USER ?? 'root',
        password: process.env.TEST_DB_PASSWORD ?? '',
        database: process.env.TEST_DB_NAME ?? 'mccbng_test'
      },
      admin: { host: process.env.TEST_DB_HOST, port: Number(process.env.TEST_DB_PORT ?? 3306), user: process.env.TEST_DB_ADMIN_USER ?? process.env.TEST_DB_USER ?? 'root', password: process.env.TEST_DB_ADMIN_PASSWORD ?? process.env.TEST_DB_PASSWORD ?? '' } as DbCredentials,
      stop: async () => {}
    }
  }
  const { MySqlContainer } = await import('@testcontainers/mysql')
  const container = await new MySqlContainer('mysql:8.4')
    .withDatabase('mccbng_test').withUsername('mccbng').withUserPassword('mccbng').start()
  return {
    db: { host: container.getHost(), port: container.getPort(), user: 'mccbng', password: 'mccbng', database: 'mccbng_test' },
    admin: { host: container.getHost(), port: container.getPort(), user: 'root', password: container.getRootPassword() } as DbCredentials,
    stop: async () => { await container.stop() }
  }
}

