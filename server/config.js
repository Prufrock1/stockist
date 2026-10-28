/* Environment for the API. Production refuses to boot without a database,
   a session secret, and the two account passwords. */
const production = process.env.NODE_ENV === 'production';

function required(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing ${name}. Refusing to start in production.`);
    process.exit(1);
  }
  return value;
}

const databaseUrl = process.env.DATABASE_URL || '';
if (!databaseUrl) {
  console.error('Missing DATABASE_URL. For local development run npm run dev, which starts Postgres for you.');
  process.exit(1);
}

const sessionSecret = production
  ? required('SESSION_SECRET')
  : (process.env.SESSION_SECRET || 'dev-only-session-secret-change-me');

if (production && sessionSecret.length < 32) {
  console.error('SESSION_SECRET must be at least 32 characters in production.');
  process.exit(1);
}

const retailerPassword = production ? required('RETAILER_PASSWORD') : (process.env.RETAILER_PASSWORD || 'maison');
const brandPassword = production ? required('BRAND_PASSWORD') : (process.env.BRAND_PASSWORD || 'verre');

if (production && (retailerPassword.length < 8 || brandPassword.length < 8)) {
  console.error('Account passwords must be at least 8 characters in production.');
  process.exit(1);
}

function sslFor(url) {
  const parsed = new URL(url);
  const mode = parsed.searchParams.get('sslmode');
  parsed.searchParams.delete('sslmode');
  if (!mode || mode === 'disable') return { connectionString: parsed.toString(), ssl: undefined };
  const verify = mode === 'verify-full' || mode === 'verify-ca';
  return { connectionString: parsed.toString(), ssl: { rejectUnauthorized: verify } };
}

const database = sslFor(databaseUrl);

export const config = {
  production,
  port: Number(process.env.PORT) || 8787,
  databaseUrl: database.connectionString,
  databaseSsl: database.ssl,
  sessionSecret,
  retailerPassword,
  brandPassword,
  allowDemoLogin: process.env.ALLOW_DEMO_LOGIN === 'true' && !production,
  allowReset: process.env.ALLOW_RESET === 'true' && !production,
  corsOrigins: (process.env.CORS_ORIGIN || '').split(',').map(origin => origin.trim()).filter(Boolean),
  trustProxy: process.env.TRUST_PROXY ? process.env.TRUST_PROXY === 'true' : production,
  sessionTtlMs: 1000 * 60 * 60 * 24 * 7,
};
