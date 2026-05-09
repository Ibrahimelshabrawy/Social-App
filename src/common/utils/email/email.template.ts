import {EventEnum} from "../../enum/event.enum";

export const emailTemplate = ({
  otp,
  subject,
  expireAt,
}: {
  otp: number;
  subject?: EventEnum;
  expireAt?: string;
}) => {
  return `<!doctype html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${subject}</title>
</head>

<body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,sans-serif;">

<table align="center" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center">

<table width="520" cellpadding="0" cellspacing="0"
style="background:#ffffff;margin-top:40px;border-radius:12px;
overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.08);">

<!-- HEADER -->
<tr>
<td align="center"
style="background:#0f172a;padding:25px;color:#ffffff;
font-size:26px;font-weight:bold;letter-spacing:1px;">
Social App
</td>
</tr>

<!-- BODY -->
<tr>
<td style="padding:40px;text-align:center;color:#333;">

<h2 style="margin-bottom:10px;">
Security Verification 🔐
</h2>

<p style="font-size:16px;color:#555;margin-bottom:25px;">
Use the verification code below to complete your request:
</p>

<!-- OTP BOX -->
<div style="
display:inline-block;
background:#0f172a;
color:#ffffff;
font-size:34px;
letter-spacing:8px;
padding:18px 40px;
border-radius:10px;
margin:20px 0;
font-weight:bold;
">
${otp}
</div>

<p style="font-size:15px;color:#666;margin-top:25px;">
This code will expire in <strong>${expireAt}</strong>.
</p>

<p style="font-size:14px;color:#999;margin-top:10px;">
If you didn’t request this, you can safely ignore this email.
</p>

</td>
</tr>

<!-- DIVIDER -->
<tr>
<td style="height:1px;background:#eeeeee;"></td>
</tr>

<!-- FOOTER -->
<tr>
<td align="center"
style="padding:20px;font-size:13px;color:#888;">

<p style="margin:5px 0;">
Need help? Contact our support team anytime.
</p>

<p style="margin:5px 0;">
© 2026 Social App. All rights reserved.
</p>

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`;
};
