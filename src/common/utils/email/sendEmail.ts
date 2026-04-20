import nodemailer from "nodemailer";
import {EMAIL, PASSWORD} from "../../../config/config.service";

export const sendEmail = async ({
  to,
  subject,
  html,
  attachments,
}: {
  to: string;
  subject?: string;
  html?: string;
  attachments?: string[] | [];
}) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    tls: {
      rejectUnauthorized: false,
    },
    auth: {
      user: EMAIL,
      pass: PASSWORD,
    },
  });

  const info = await transporter.sendMail({
    from: `"Ibrahim Elshabrawy" ${EMAIL}`,
    to,
    subject: subject || "Hello ✔",
    html: html || "<b>Hello world?</b>",
  });

  console.log("Message sent:", info.messageId);

  return info.accepted.length > 0 ? true : false;
};

export const generateOtp = async () => {
  return Math.floor(Math.random() * 900000 + 100000);
};
