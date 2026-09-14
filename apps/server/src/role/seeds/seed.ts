/* eslint-disable no-console */
import { configDotenv } from 'dotenv';
configDotenv();
import mongoose from 'mongoose';
import { Role, RoleSchema } from '../entities/role.entity';
import { RoleSeeder } from './role.seeder';
import { getMongoUri, MONGO_CONNECTION_OPTIONS } from '../../config/mongo.config';

async function run() {
  const uri = getMongoUri();
  await mongoose.connect(uri, MONGO_CONNECTION_OPTIONS);

  const roleModel = mongoose.model(Role.name, RoleSchema);
  const seeder = new RoleSeeder(roleModel);
  await seeder.seed();

  console.log('Roles seeded successfully.');
  await mongoose.disconnect();
}

run().catch((error: unknown) => {
  console.error('Role seeding failed', error);
  process.exit(1);
});
