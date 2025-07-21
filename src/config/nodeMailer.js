import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER, // your email
    pass: process.env.GMAIL_APP_PASS, // 16-digit app password
  },
});
