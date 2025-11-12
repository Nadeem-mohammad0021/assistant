import * as React from 'react';

interface EmailTemplateProps {
  firstName: string;
  reminderTitle: string;
  reminderDescription: string;
  dueDate: string;
}

export function EmailTemplate({
  firstName,
  reminderTitle,
  reminderDescription,
  dueDate
}: EmailTemplateProps) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', lineHeight: 1.6, color: '#333' }}>
      <h1 style={{ color: '#1F7D53' }}>Hello, {firstName}!</h1>
      <p>You have a new reminder from KYNEX.dev:</p>
      
      <div style={{ 
        backgroundColor: '#f5f5f5', 
        padding: '16px', 
        borderRadius: '8px', 
        margin: '16px 0',
        borderLeft: '4px solid #1F7D53'
      }}>
        <h2 style={{ marginTop: 0, color: '#0F4C75' }}>{reminderTitle}</h2>
        <p>{reminderDescription}</p>
        <p><strong>Due Date:</strong> {new Date(dueDate).toLocaleString()}</p>
      </div>
      
      <p>Please check your KYNEX.dev dashboard for more details.</p>
      <p>Best regards,<br/>The KYNEX.dev Team</p>
    </div>
  );
}