import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { CONTACT_FORM_RECEIVER_EMAIL } from '@/lib/data/constants';

if (!process.env.RESEND_API_KEY) {
  // RESEND_API_KEY is not set. Contact form emails will not be sent.
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface ContactFormBody {
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ContactFormBody;
    const { firstName, lastName, email, subject, message } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !subject || !message) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Check if Resend is configured
    if (!resend) {
      // eslint-disable-next-line no-console
      console.error('Resend is not configured. Please set RESEND_API_KEY environment variable.');
      return NextResponse.json({ error: 'Email service is not configured' }, { status: 500 });
    }

    // Escape HTML to prevent XSS
    const escapeHtml = (text: string) => {
      const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      };
      return text.replaceAll(/[&<>"']/g, (m) => map[m]);
    };

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: 'Contact Form <onboarding@resend.dev>', // Update this with your verified domain
      to: [CONTACT_FORM_RECEIVER_EMAIL],
      subject: `Contact Form: ${escapeHtml(subject)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #04a5df; border-bottom: 2px solid #04a5df; padding-bottom: 10px;">
            New Contact Form Submission
          </h2>
          <div style="margin-top: 20px;">
            <p><strong>Name:</strong> ${escapeHtml(firstName)} ${escapeHtml(lastName)}</p>
            <p><strong>Email:</strong> ${escapeHtml(email)}</p>
            <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
            <div style="margin-top: 20px;">
              <strong>Message:</strong>
              <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 10px;">
                ${escapeHtml(message).replaceAll('\n', '<br>')}
              </div>
            </div>
          </div>
        </div>
      `,
      replyTo: email,
    });

    if (error) {
      // eslint-disable-next-line no-console
      console.error('Resend error:', error);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Email sent successfully', data }, { status: 200 });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Contact form error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
