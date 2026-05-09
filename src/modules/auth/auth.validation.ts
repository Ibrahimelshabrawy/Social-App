import * as z from "zod";
import {GenderEnum, RoleEnum} from "../../common/enum/user.enum";

export const signInSchema = {
  body: z.object({
    password: z.string().min(6),
    email: z.string().email(),
    fcm: z.string().optional(),
  }),
};

export const signUpSchema = {
  body: z
    .strictObject({
      firstName: z.string().min(3),
      lastName: z.string().min(3),
      password: z.string().min(6),
      email: z.string().email(),
      phone: z.string().length(11).optional(),
      cPassword: z.string().min(6),
      address: z.string().min(6).optional(),
      gender: z.enum(GenderEnum).optional(),
      role: z.enum(RoleEnum).optional(),
      age: z.number(),
    })
    .refine(
      (data) => {
        return data.password === data.cPassword;
      },
      {
        error: "Passwords Do Not Match",
        path: ["cPassword"],
      },
    ),
};

export const confirmEmailSchema = {
  body: z.object({
    otp: z.string().regex(/^\d{6}$/),
    email: z.string().email(),
  }),
};

export const updatePasswordSchema = {
  body: z
    .object({
      oldPassword: z.string().min(6),
      newPassword: z.string().min(6),
      confirmNewPassword: z.string().min(6),
    })
    .refine(
      (data) => {
        return data.confirmNewPassword == data.newPassword;
      },
      {
        error: "New Password Do Not Match Confirm Password",
        path: ["confirmNewPassword"],
      },
    ),
};
