import bcrypt from "bcrypt";

export const BCRYPT_COST = 12;
export const hashPassword = (password: string) => bcrypt.hash(password, BCRYPT_COST);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

let dummyHash: Promise<string> | undefined;
export function getDummyPasswordHash() {
  dummyHash ??= hashPassword("constant-work-for-unknown-accounts");
  return dummyHash;
}
