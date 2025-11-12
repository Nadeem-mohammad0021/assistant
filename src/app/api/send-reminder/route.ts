import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { EmailTemplate } from '../../../components/EmailTemplate';
import { render } from '@react-email/render';

// Initialize Resend client with API key from environment variables
// Using a function to ensure proper initialization in serverless environments
function getResendClient() {
  const resendApiKey = process.env.RESEND_API_KEY;
  
  if (!resendApiKey) {
    console.error('RESEND_API_KEY is not set in environment variables');
    console.log('Available env vars:', Object.keys(process.env).filter(key => key.startsWith('RESEND') || key.startsWith('ADMIN')));
    return null;
  }
  
  try {
    console.log('Initializing Resend client with API key length:', resendApiKey.length);
    const resend = new Resend(resendApiKey);
    return resend;
  } catch (error) {
    console.error('Error initializing Resend client:', error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    // Check if Resend is properly initialized
    const resend = getResendClient();
    if (!resend) {
      console.warn('Resend not initialized. Email notification not sent.');
      return NextResponse.json(
        { success: false, error: 'Email service not initialized' },
        { status: 500 }
      );
    }

  let body;
  try {
    body = await request.json();
    console.log('API /api/send-reminder called with payload:', { to: body.to, subject: body.subject });
  } catch (error) {
    console.error('Error parsing request body:', error);
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
  // Log whether RESEND_API_KEY and ADMIN_EMAIL are set (mask the key)
  console.log('RESEND_API_KEY set:', !!process.env.RESEND_API_KEY);
  console.log('ADMIN_EMAIL:', process.env.ADMIN_EMAIL || 'not-set');
    // Changed parameter names to match what's being sent from the client
    const { to, subject, html, firstName, reminderTitle, reminderDescription, dueDate } = body;

    // Validate input
    if (!to || !subject) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: to, subject' },
        { status: 400 }
      );
    }

    // Use React template if all required fields are provided, otherwise use HTML
    if (firstName && reminderTitle && reminderDescription && dueDate) {
      // Using React template
      const emailHtml = await render(
        EmailTemplate({ firstName, reminderTitle, reminderDescription, dueDate })
      );
      try {
        console.log('Attempting to send email with params:', {
          from: process.env.ADMIN_EMAIL || 'onboarding@resend.dev',
          to,
          subject,
          htmlLength: emailHtml.length
        });
        const result = await resend.emails.send({
          from: process.env.ADMIN_EMAIL || 'onboarding@resend.dev',
          to,
          subject,
          html: emailHtml,
        });
        console.log('Resend send result:', result);
        return NextResponse.json({ success: true, data: result });
      } catch (err) {
        console.error('Error sending email with React template:', err);
        return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
      }
    } else {
      // Fallback to HTML
      try {
        const result = await resend.emails.send({
          from: process.env.ADMIN_EMAIL || 'onboarding@resend.dev',
          to,
          subject,
          html,
        });
        console.log('Resend send result (html):', result);
        return NextResponse.json({ success: true, data: result });
      } catch (err) {
        console.error('Error sending email with HTML:', err);
        return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
      }
    }
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send email' },
      { status: 500 }
    );
  }
}