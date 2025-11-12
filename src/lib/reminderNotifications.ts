/**
 * Reminder notification service
 * This service checks for upcoming reminders and sends email notifications
 */

import { supabase } from '../lib/supabase';
import { sendReminderNotification } from './email';

let isServiceRunning = false;

// Global function to trigger notifications through the notification context
let triggerNotification: ((title: string, body: string) => void) | null = null;

export const setNotificationTrigger = (trigger: (title: string, body: string) => void) => {
  triggerNotification = trigger;
};

/**
 * Show browser notification for reminder
 * @param title - Notification title
 * @param body - Notification body
 */
export const showBrowserNotification = async (title: string, body: string) => {
  // Only run in browser environment
  if (typeof window === 'undefined') {
    return;
  }
  
  // Check if browser notifications are supported
  if (!('Notification' in window)) {
    console.log('This browser does not support desktop notification');
    return;
  }

  // Only show notifications if permission is already granted and user is not actively using the app
  if (Notification.permission === 'granted') {
    // Don't show notifications if the user is currently viewing the app
    if (document.hasFocus()) {
      return;
    }
    
    new Notification(title, {
      body: body,
      icon: '/favicon.ico'
    });
    
    // Also trigger notification through the context if available
    if (triggerNotification) {
      triggerNotification(title, body);
    }
    return;
  }
};

/**
 * Check for upcoming reminders and send notifications
 * This function should be called periodically
 */
export const checkAndSendReminderNotifications = async () => {
  // Only run in browser environment
  if (typeof window === 'undefined') {
    console.log('Reminder notification service only runs in browser environment');
    return;
  }
  
  try {
    // Check if we have Supabase connection
    if (!supabase) {
      console.error('Supabase client not initialized');
      return;
    }
    
    // Get all users with non-null emails (we'll filter preferences client-side for reliability)
    const { data: usersWithProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, preferences')
      .not('email', 'is', null);
      
    if (profileError) {
      // More detailed error logging
      const errorDetails = {
        message: profileError.message || profileError,
        code: (profileError as any).code,
        details: (profileError as any).details,
        hint: (profileError as any).hint,
        // Add context about the environment
        environment: typeof window === 'undefined' ? 'server' : 'browser',
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'not set',
        supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'not set'
      };
      
      console.error('Error fetching profiles:', errorDetails);
      return;
    }

    if (!usersWithProfiles || usersWithProfiles.length === 0) {
      console.log('No profiles with emails found');
      return;
    }
    
    const now = new Date();
    
    // For each user; only proceed if their preferences enable email notifications
    for (const profile of usersWithProfiles) {
      const emailNotificationsEnabled = !!(profile.preferences && profile.preferences.email_notifications);
      // Check if browser notifications are enabled
      const browserNotificationsEnabled = !!(profile.preferences && profile.preferences.browser_notifications);
      
      if (!emailNotificationsEnabled && !browserNotificationsEnabled) {
        // Skip users who disabled all notifications
        continue;
      }
      
      // Get user's reminders
      const { data: userReminders, error: reminderError } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', profile.id);

      if (reminderError) {
        console.error(`Error fetching reminders for user ${profile.id}:`, reminderError);
        continue;
      }

      if (!userReminders || userReminders.length === 0) {
        // Log for debugging
        // console.log(`No reminders for user ${profile.id}`);
        continue;
      }
      
      // Check each reminder to see if it's due now (send notification at due time)
      // We intentionally send notifications at the exact due time (within a small window)
      const dueReminders = userReminders.filter((reminder) => {
        // Only check active (not completed) reminders that haven't had notifications sent
        if (reminder.is_completed || reminder.notification_sent) {
          return false;
        }

        const dueDate = new Date(reminder.due_date);
        // Check if current time is within a small window around the due time (±2 minutes)
        const windowStart = new Date(dueDate.getTime() - 2 * 60 * 1000); // 2 minutes before
        const windowEnd = new Date(dueDate.getTime() + 2 * 60 * 1000);   // 2 minutes after

        const isDueNow = now >= windowStart && now <= windowEnd;
        return isDueNow;
      });
      
      if (dueReminders.length === 0) {
        // console.log(`No due reminders for user ${profile.id} at ${now.toISOString()}`);
        continue;
      }
      
      // Extract first name from full name (or use "User" as fallback)
      const firstName = profile.full_name ? profile.full_name.split(' ')[0] : 'User';
      
      // Send notifications for each due reminder
      for (const reminder of dueReminders) {
        try {
          // Show browser notification if enabled
          if (browserNotificationsEnabled) {
            showBrowserNotification(
              `Reminder: ${reminder.title}`,
              reminder.description || 'You have a reminder due now'
            );
          }
          
          // Send email notification if enabled
          if (emailNotificationsEnabled) {
            // Send the actual email notification at due time
            const result = await sendReminderNotification(
              profile.email,
              firstName,
              reminder.title,
              reminder.description || '', // Ensure description is a string
              reminder.due_date
            );

            if (result && result.success) {
              // Mark notification as sent to prevent duplicates
              const { error: updateError } = await supabase
                .from('reminders')
                .update({ notification_sent: true })
                .eq('id', reminder.id);

              if (updateError) {
                console.error(`Error updating reminder ${reminder.id}:`, updateError);
              } else {
                console.log(`Notification sent and marked for reminder ${reminder.id}`);
              }
            } else {
              console.error(`Failed to send notification for reminder ${reminder.id}:`, result?.error || result);
            }
          } else {
            // If only browser notifications are enabled, still mark as sent to prevent duplicates
            const { error: updateError } = await supabase
              .from('reminders')
              .update({ notification_sent: true })
              .eq('id', reminder.id);
              
            if (updateError) {
              console.error(`Error updating reminder ${reminder.id}:`, updateError);
            } else {
              console.log(`Browser notification marked for reminder ${reminder.id}`);
            }
          }
        } catch (error) {
          console.error(`Error sending notification for reminder ${reminder.id}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error in checkAndSendReminderNotifications:', error);
  }
};

/**
 * Start the reminder notification service
 * This sets up a periodic check for upcoming reminders
 */
export const startReminderNotificationService = () => {
  // Only run in browser environment
  if (typeof window === 'undefined') {
    console.log('Reminder notification service only runs in browser environment');
    return;
  }
  
  // Prevent multiple instances
  if (isServiceRunning) {
    return;
  }
  
  isServiceRunning = true;
  
  // Check for reminders immediately
  checkAndSendReminderNotifications();
  
  // Check for reminders every 30 seconds for better responsiveness
  setInterval(checkAndSendReminderNotifications, 30 * 1000); // Every 30 seconds
};

export default {
  checkAndSendReminderNotifications,
  startReminderNotificationService
};