import z from "zod";
import {
  confirmEmailSchema,
  signInSchema,
  signUpSchema,
  updatePasswordSchema,
} from "./auth.validation";

export type SignUpDto = z.infer<typeof signUpSchema.body>;
export type SignInDto = z.infer<typeof signInSchema.body>;
export type confirmEmailDto = z.infer<typeof confirmEmailSchema.body>;
export type updatePasswordDto = z.infer<typeof updatePasswordSchema.body>;
