const nodemailer = require("nodemailer");

export class MailService {
  static async sendMail({
    to,
    subject,
    html,
    replyTo
  }: any) {
    try {
      let transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: 465,
        secure: true,
        auth: {
          user: process.env.MAIL_USERNAME,
          pass: process.env.MAIL_PASSWORD,
        },
        tls: { rejectUnauthorized: true },
      });

      console.log(replyTo)

      await transporter.sendMail({
        from: `"${process.env.MAIL_NAME}" <${process.env.MAIL_FROM}>`,
        to,
        subject,
        html,
        replyTo: replyTo
      });

      return true;
    } catch (e) {
      console.log(e.message);
      return false;
    }
  }
}
