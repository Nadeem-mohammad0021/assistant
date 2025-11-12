/**
 * Send email notification via API route
 * @param to - Recipient email address
 * @param subject - Email subject
 * @param html - HTML content of the email
 * @param firstName - First name of the recipient (for React template)
 * @param reminderTitle - Title of the reminder (for React template)
 * @param reminderDescription - Description of the reminder (for React template)
 * @param dueDate - Due date of the reminder (for React template)
 * @returns Promise with success status and response data
 */
export const sendEmail = async (
  to: string, 
  subject: string, 
  html: string,
  firstName?: string,
  reminderTitle?: string,
  reminderDescription?: string,
  dueDate?: string
) => {
  try {
    // Use fetch to call the API route instead of importing it directly
    // This ensures proper server-side execution
    // Use a relative API path so this works both locally and in deployed environments
    const response = await fetch('/api/send-reminder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        to, 
        subject, 
        html,
        firstName,
        reminderTitle,
        reminderDescription,
        dueDate
      })
    });
    
    const result = await response.json();

    if (response.status !== 200) {
      // Provide more detailed error information and log full result for debugging
      const errorMessage = result.error || result.message || 'Failed to send email';
      console.error('sendEmail failed:', response.status, result);
      return { success: false, error: errorMessage, raw: result };
    }

    console.log('sendEmail success:', result);
    return { success: true, data: result.data };
  } catch (error) {
    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
};

/**
 * Send reminder notification email
 * @param to - Recipient email address
 * @param firstName - First name of the recipient
 * @param reminderTitle - Title of the reminder
 * @param reminderDescription - Description of the reminder
 * @param dueDate - Due date of the reminder
 * @returns Promise with success status
 */
export const sendReminderNotification = async (
  to: string,
  firstName: string,
  reminderTitle: string,
  reminderDescription: string,
  dueDate: string
) => {
  const subject = `Reminder: ${reminderTitle}`;
  
  // HTML fallback for backward compatibility
  const html = `
    <h2>New Reminder Notification</h2>
    <p>Hello ${firstName},</p>
    <p>This is a reminder notification from Kynex:</p>
    <div style="background-color: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <h3>${reminderTitle}</h3>
      <p>${reminderDescription}</p>
      <p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleString()}</p>
    </div>
    <p>Please check your KYNEX.dev dashboard for more details.</p>
    <p>Best regards,<br/>The KYNEX.dev Team</p>
  `;

  return await sendEmail(
    to, 
    subject, 
    html,
    firstName,
    reminderTitle,
    reminderDescription,
    dueDate
  );
};

/**
 * Send welcome email to new users
 * @param to - Recipient email address
 * @param userName - Name of the user
 * @returns Promise with success status
 */
export const sendWelcomeEmail = async (to: string, userName: string) => {
  const subject = 'Welcome to Kynex!';
  
  // HTML fallback for backward compatibility
  const html = `
    <h2>Welcome to Kynex!</h2>
    <p>Hello ${userName},</p>
    <p>Welcome to Kynex, your personal AI workspace with long-term memory. We're excited to have you on board!</p>
    <p>With Kynex, you can:</p>
    <ul>
      <li>Have intelligent conversations with our AI assistant</li>
      <li>Create and manage notes with document attachments</li>
      <li>Set and track reminders for important tasks</li>
      <li>Access your information anytime, anywhere</li>
    </ul>
    <p>Get started by exploring the dashboard and try creating your first note or reminder.</p>
    <p>If you have any questions, feel free to reach out to our support team.</p>
    <p>Best regards,<br/>The KYNEX.dev Team</p>
  `;

  // For welcome emails, we'll use the HTML approach for now
  return await sendEmail(to, subject, html);
};

// Remove the Resend client initialization since we're using API routes
export default null;