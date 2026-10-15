export type ServerEnv = Readonly<{
  DATABASE_URL: string;
  DATABASE_URL_DIRECT: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  NEXT_PUBLIC_APP_URL: string;
}>;

type EnvironmentSource = Readonly<Record<string, string | undefined>>;

function requiredValue(environment: EnvironmentSource, key: string): string {
  const value = environment[key]?.trim();

  if (!value) {
    throw new Error(`${key} is required`);
  }

  return value;
}

function httpUrl(environment: EnvironmentSource, key: string): string {
  const value = requiredValue(environment, key);

  try {
    const url = new URL(value);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("unsupported protocol");
    }
  } catch {
    throw new Error(`${key} must be a valid HTTP(S) URL`);
  }

  return value;
}

export function loadServerEnv(environment: EnvironmentSource): ServerEnv {
  const betterAuthSecret = requiredValue(environment, "BETTER_AUTH_SECRET");

  if (betterAuthSecret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must be at least 32 characters");
  }

  return Object.freeze({
    DATABASE_URL: requiredValue(environment, "DATABASE_URL"),
    DATABASE_URL_DIRECT: requiredValue(environment, "DATABASE_URL_DIRECT"),
    BETTER_AUTH_SECRET: betterAuthSecret,
    BETTER_AUTH_URL: httpUrl(environment, "BETTER_AUTH_URL"),
    NEXT_PUBLIC_APP_URL: httpUrl(environment, "NEXT_PUBLIC_APP_URL"),
  });
}
