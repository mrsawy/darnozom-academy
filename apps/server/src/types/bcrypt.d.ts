/** bcrypt@6 typings are not always picked up by the toolchain; keep in sync with the runtime API. */
declare module 'bcrypt' {
  export function hash(data: string, saltOrRounds: number | string): Promise<string>;
  export function compare(data: string, encrypted: string): Promise<boolean>;
}
