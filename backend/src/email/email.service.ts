import { Injectable, InternalServerErrorException } from '@nestjs/common';

type SendEmailPayload = {
  toEmail: string;
  toName?: string | null;
  subject: string;
  html: string;
};

@Injectable()
export class EmailService {
  private readonly apiKey = process.env.BREVO_API_KEY || '';
  private readonly senderEmail =
    process.env.BREVO_SENDER_EMAIL || 'no-reply@joinhangouthub.com';
  private readonly senderName =
    process.env.BREVO_SENDER_NAME || 'HangOutHub';

  async sendEmail(payload: SendEmailPayload) {
    if (!this.apiKey) {
      throw new InternalServerErrorException(
        'Brevo API key manquante (BREVO_API_KEY).',
      );
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'api-key': this.apiKey,
      },
      body: JSON.stringify({
        sender: {
          name: this.senderName,
          email: this.senderEmail,
        },
        to: [
          {
            email: payload.toEmail,
            name: payload.toName || undefined,
          },
        ],
        subject: payload.subject,
        htmlContent: payload.html,
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new InternalServerErrorException(
        `Brevo error: ${response.status} ${details}`,
      );
    }
  }
}
