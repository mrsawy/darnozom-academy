import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

/** Matches only proper 24-character hex ObjectId strings. */
const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

const isObjectIdString = (val: string): boolean => OBJECT_ID_REGEX.test(val);

const MAX_DEPTH = 10;

export const convertToObjectId = (id: string | Types.ObjectId) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestException('Invalid ID');
  }
  if (id instanceof Types.ObjectId) {
    return id;
  }
  return new Types.ObjectId(id);
};

function _convertRecursive(obj: unknown, depth: number): unknown {
  if (depth > MAX_DEPTH) {
    return obj;
  }
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (obj instanceof Types.ObjectId) {
    return obj;
  }
  if (typeof obj === 'string' && isObjectIdString(obj)) {
    return new Types.ObjectId(obj);
  }
  // Preserve BSON / built-in types — spreading these would destroy them
  if (obj instanceof Types.ObjectId || obj instanceof RegExp || obj instanceof Date) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => _convertRecursive(item, depth + 1));
  }
  if (typeof obj === 'object') {
    const result = { ...obj } as Record<string, unknown>;
    const objRecord = obj as Record<string, unknown>;
    for (const key in objRecord) {
      if (Object.prototype.hasOwnProperty.call(objRecord, key)) {
        result[key] = _convertRecursive(objRecord[key], depth + 1);
      }
    }
    return result;
  }
  return obj;
}

export function convertObjectValuesToObjectId<T extends null | undefined>(obj: T): T;
export function convertObjectValuesToObjectId(obj: string | Types.ObjectId): Types.ObjectId | string;
export function convertObjectValuesToObjectId<T extends string>(obj: readonly T[]): (Types.ObjectId | string)[];
export function convertObjectValuesToObjectId<T>(obj: readonly T[]): T[];
export function convertObjectValuesToObjectId<T extends object>(obj: T): T;
export function convertObjectValuesToObjectId<T>(obj: T): T;
export function convertObjectValuesToObjectId(obj: unknown): unknown {
  return _convertRecursive(obj, 0);
}
