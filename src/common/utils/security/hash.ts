import {hashSync, compareSync} from "bcrypt";
import {SALT_ROUND} from "../../../config/config.service";

export function Hash({
  plainText,
  salt_rounds = SALT_ROUND,
}: {
  plainText: string;
  salt_rounds?: number;
}): string {
  return hashSync(plainText, salt_rounds);
}

export function compare_match({
  plainText,
  cipherText,
}: {
  plainText: string;
  cipherText: string;
}): boolean {
  return compareSync(plainText, cipherText);
}
