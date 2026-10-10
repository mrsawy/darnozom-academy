import { plainToInstance } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, validateSync } from 'class-validator';
import { getMongoUri } from './mongo.config';

class EnvironmentVariables {
  // Only the URI matching the current NODE_ENV is required; getMongoUri() enforces that below.
  @IsString()
  @IsOptional()
  MONGODB_URI_DEV?: string;

  @IsString()
  @IsOptional()
  MONGODB_URI_PROD?: string;

  @IsString()
  @IsNotEmpty()
  JSON_PRIVATE_KEY!: string;

  @IsString()
  @IsNotEmpty()
  REFRESH_TOKEN_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  SESSION_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  OAUTH_SUCCESS_REDIRECT_URL!: string;

  @IsString()
  @IsOptional()
  CORS_ORIGINS?: string;

  @IsString()
  @IsOptional()
  NATS_URLS?: string;

  @IsString()
  @IsOptional()
  REDIS_URL?: string;

  @IsString()
  @IsOptional()
  PORT?: string;

  @IsString()
  @IsOptional()
  AGORA_APP_ID?: string;

  @IsString()
  @IsOptional()
  AGORA_APP_CERTIFICATE?: string;

  @IsString()
  @IsOptional()
  AGORA_REST_KEY?: string;

  @IsString()
  @IsOptional()
  AGORA_REST_SECRET?: string;

  @IsString()
  @IsOptional()
  AGORA_CHAT_APP_KEY?: string;

  @IsString()
  @IsOptional()
  AGORA_CHAT_ORG_NAME?: string;

  @IsString()
  @IsOptional()
  AGORA_CHAT_APP_NAME?: string;

  @IsString()
  @IsOptional()
  AGORA_CHAT_REST_URL?: string;

  @IsString()
  @IsOptional()
  AGORA_CHAT_WS_URL?: string;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(`Environment variable validation failed:\n${errors.toString()}`);
  }

  getMongoUri(config);

  return validatedConfig;
}
