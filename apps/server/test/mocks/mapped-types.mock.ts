export function PartialType<T>(classRef: new (...args: any[]) => T): new (...args: any[]) => Partial<T> {
  return class extends (classRef as any) {} as any;
}
export function PickType<T>(classRef: new (...args: any[]) => T): new (...args: any[]) => Partial<T> {
  return class extends (classRef as any) {} as any;
}
export function OmitType<T>(classRef: new (...args: any[]) => T): new (...args: any[]) => Partial<T> {
  return class extends (classRef as any) {} as any;
}
export function IntersectionType(..._args: any[]): new (...args: any[]) => any {
  return class {} as any;
}
export const applyIsOptionalDecorator = () => {};
export const applyValidateIfDefinedDecorator = () => {};
export const inheritPropertyInitializers = () => {};
export const inheritTransformationMetadata = () => {};
export const inheritValidationMetadata = () => {};
