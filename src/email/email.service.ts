import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';
import { User } from '@prisma/client';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    if (!apiKey) {
      throw new Error('SENDGRID_API_KEY is not defined');
    }

    sgMail.setApiKey(apiKey);

    this.baseUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      'https://shophere-frontend.onrender.com';
  }

  async sendUserVerification(user: User, code: string) {
    this.logger.log(`📨 Sending verification email to ${user.email}`);

    const verifyUrl = `${this.baseUrl}/verify-email?code=${code}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Xác thực tài khoản ShopSphere</title>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>

<body style="
  margin: 0;
  padding: 0;
  min-width: 100%;
  font-family: Arial, sans-serif;
  font-size: 16px;
  line-height: 1.5;
  background-color: #FAFAFA;
  color: #222222;
">
  <div style="max-width: 600px; margin: 0 auto;">
    <div style="background-color: #0070f3; padding: 24px; color: #ffffff;">
      <h1 style="
        font-size: 24px;
        font-weight: 700;
        line-height: 1.25;
        margin-top: 0;
        margin-bottom: 15px;
        text-align: center;
      ">
        Chào mừng đến ShopSphere!
      </h1>
    </div>

    <div style="padding: 24px; background-color: #ffffff;">
      <p style="margin-top: 0; margin-bottom: 24px;">
        Xin chào ${user.email},
      </p>

      <p style="margin-top: 0; margin-bottom: 24px;">
        Cảm ơn bạn đã đăng ký với ShopSphere. Để kích hoạt tài khoản của bạn,
        vui lòng nhấp vào nút bên dưới:
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a
          href="${verifyUrl}"
          style="
            display: inline-block;
            padding: 16px 32px;
            background-color: #0070f3;
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
          "
        >
          Xác thực Email
        </a>
      </div>

      <p style="margin-top: 0; margin-bottom: 24px; font-size: 14px; color: #666666;">
        Hoặc copy và paste link này vào trình duyệt của bạn:<br />
        <a
          href="${verifyUrl}"
          style="color: #0070f3; word-break: break-all;"
        >
          ${verifyUrl}
        </a>
      </p>

      <p style="margin-top: 0; margin-bottom: 24px;">
        Nếu bạn không đăng ký, vui lòng bỏ qua email này.
      </p>
    </div>
  </div>
</body>
</html>
`;

    await sgMail.send({
      to: user.email,
      from: this.configService.get<string>('SENDGRID_FROM_EMAIL')!,
      subject: 'Xác thực tài khoản ShopSphere',
      html,
    });
  }
  

  async sendPasswordReset(user: User, resetCode: string) {
  this.logger.log(`📨 Sending password reset email to ${user.email}`);

  const resetUrl = `${this.baseUrl}/reset-password?code=${resetCode}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Đặt lại mật khẩu ShopSphere</title>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>

<body style="
  margin: 0;
  padding: 0;
  min-width: 100%;
  font-family: Arial, sans-serif;
  font-size: 16px;
  line-height: 1.5;
  background-color: #FAFAFA;
  color: #222222;
">
  <div style="max-width: 600px; margin: 0 auto;">
    <div style="background-color: #0070f3; padding: 24px; color: #ffffff;">
      <h1 style="
        font-size: 24px;
        font-weight: 700;
        line-height: 1.25;
        margin-top: 0;
        margin-bottom: 15px;
        text-align: center;
      ">
        Đặt lại mật khẩu ShopSphere
      </h1>
    </div>

    <div style="padding: 24px; background-color: #ffffff;">
      <p style="margin-top: 0; margin-bottom: 24px;">
        Xin chào ${user.email},
      </p>

      <p style="margin-top: 0; margin-bottom: 24px;">
        Chúng tôi nhận được một yêu cầu để đặt lại mật khẩu của bạn.
        Nhấp vào nút bên dưới để tiến hành:
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a
          href="${resetUrl}"
          style="
            display: inline-block;
            padding: 16px 32px;
            background-color: #0070f3;
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
          "
        >
          Đặt lại mật khẩu
        </a>
      </div>

      <p style="margin-top: 0; margin-bottom: 24px; font-size: 14px; color: #666666;">
        Hoặc copy và paste link này vào trình duyệt của bạn:<br />
        <a
          href="${resetUrl}"
          style="color: #0070f3; word-break: break-all;"
        >
          ${resetUrl}
        </a>
      </p>

      <p style="margin-top: 0; margin-bottom: 24px; font-size: 14px; color: #999999;">
        Link này sẽ hết hạn trong 1 giờ. Nếu bạn không yêu cầu đặt lại mật khẩu,
        vui lòng bỏ qua email này.
      </p>

      <p style="margin-top: 0; margin-bottom: 24px;">
        Trân trọng,<br />Đội ngũ ShopSphere
      </p>
    </div>
  </div>
</body>
</html>
`;

  await sgMail.send({
    to: user.email,
    from: this.configService.get<string>('SENDGRID_FROM_EMAIL')!,
    subject: 'Đặt lại mật khẩu ShopSphere',
    html,
  });
}

}
