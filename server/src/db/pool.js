import { Pool } from 'pg';
import { env } from '../config/env.js';
import { getDatabaseConfig } from './config.js';

export const pool = new Pool(getDatabaseConfig(env.databaseUrl));
