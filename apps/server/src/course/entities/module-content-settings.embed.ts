import mongoose from 'mongoose';

/** Shared embedded `settings` for course modules and course contents (extend as needed). */
export const ModuleContentSettingsSchemaPlain = new mongoose.Schema({}, { _id: false });

export type ModuleContentSettings = Record<string, never>;
