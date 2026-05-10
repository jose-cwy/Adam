function normalizeDatabaseUrl(connectionString = '') {
  if (!connectionString) {
    return connectionString;
  }

  try {
    const url = new URL(connectionString);
    const sslMode = url.searchParams.get('sslmode');
    const hasCompatFlag = url.searchParams.has('uselibpqcompat');

    if (['prefer', 'require', 'verify-ca'].includes(sslMode) && !hasCompatFlag) {
      url.searchParams.set('uselibpqcompat', 'true');
    }

    return url.toString();
  } catch {
    return connectionString;
  }
}

function getSslConfig(connectionString = '') {
  return connectionString.includes('sslmode=require')
    ? { rejectUnauthorized: false }
    : undefined;
}

export function getDatabaseConfig(connectionString = '') {
  const normalizedConnectionString = normalizeDatabaseUrl(connectionString);

  return {
    connectionString: normalizedConnectionString,
    ssl: getSslConfig(normalizedConnectionString)
  };
}
