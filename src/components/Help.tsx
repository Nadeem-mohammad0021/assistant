'use client';

import { useState } from 'react';
import { BookOpen, MessageCircle, Mail, Github, Youtube, HelpCircle, Bell, Settings } from 'lucide-react';

export function Help() {
  const [activeSection, setActiveSection] = useState('getting-started');

  const helpSections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: BookOpen,
      content: (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white">Welcome to KYNEX.dev</h3>
          <p className="text-slate-300">
            KYNEX.dev is your personal AI workspace with long-term memory. Here's how to get started:
          </p>
          
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <h4 className="font-semibold text-cyan-400 mb-2">1. Create an Account</h4>
            <p className="text-slate-300">
              Sign up with your email and password to create your KYNEX.devaccount. Your data will be securely stored.
            </p>
          </div>
          
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <h4 className="font-semibold text-cyan-400 mb-2">2. Explore the Dashboard</h4>
            <p className="text-slate-300">
              Your dashboard shows an overview of your recent activity, conversations, notes, and reminders.
            </p>
          </div>
          
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <h4 className="font-semibold text-cyan-400 mb-2">3. Start Chatting</h4>
            <p className="text-slate-300">
              Use the Chat feature to have intelligent conversations with our AI assistant. Your conversation history is saved.
            </p>
          </div>
          
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <h4 className="font-semibold text-cyan-400 mb-2">4. Create Notes</h4>
            <p className="text-slate-300">
              Organize your thoughts with notes. Add tags, organize in folders, and attach files.
            </p>
          </div>
          
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <h4 className="font-semibold text-cyan-400 mb-2">5. Set Reminders</h4>
            <p className="text-slate-300">
              Never miss important tasks. Set reminders with due dates and receive email notifications.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'chat',
      title: 'Chat Features',
      icon: MessageCircle,
      content: (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white">Chat with KYNEX.devAI</h3>
          <p className="text-slate-300">
            Our AI assistant remembers your conversations and can help with various tasks:
          </p>
          
          <ul className="list-disc list-inside space-y-2 text-slate-300">
            <li>Answer questions based on your previous conversations</li>
            <li>Help organize your notes and reminders</li>
            <li>Provide information and insights</li>
            <li>Assist with creative writing and problem solving</li>
            <li>Remember context from your previous interactions</li>
          </ul>
          
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <h4 className="font-semibold text-cyan-400 mb-2">Tips for Better Chat Experience</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>Be specific with your questions</li>
              <li>Refer to previous conversations for context</li>
              <li>Ask follow-up questions to get more detailed information</li>
              <li>Use the AI's memory feature to recall past information</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'notes',
      title: 'Notes Management',
      icon: BookOpen,
      content: (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white">Managing Your Notes</h3>
          <p className="text-slate-300">
            KYNEX.dev notes help you organize your thoughts and information:
          </p>
          
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <h4 className="font-semibold text-cyan-400 mb-2">Creating Notes</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>Click the "Create Note" button in the Notes section</li>
              <li>Add a title and content for your note</li>
              <li>Organize with tags and folders</li>
              <li>Attach files for additional context</li>
            </ul>
          </div>
          
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <h4 className="font-semibold text-cyan-400 mb-2">Organizing Notes</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>Use tags to categorize your notes</li>
              <li>Create folders for different topics</li>
              <li>Search by title, content, or tags</li>
              <li>Sort by date or title</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'reminders',
      title: 'Reminders System',
      icon: Bell,
      content: (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white">Setting and Managing Reminders</h3>
          <p className="text-slate-300">
            Never miss important tasks with KYNEX.dev reminders:
          </p>
          
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <h4 className="font-semibold text-cyan-400 mb-2">Creating Reminders</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>Navigate to the Reminders section</li>
              <li>Click "Create Reminder"</li>
              <li>Set a title, description, and due date</li>
              <li>Choose between personal and professional types</li>
              <li>Enable email notifications in Settings to receive alerts</li>
            </ul>
          </div>
          
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <h4 className="font-semibold text-cyan-400 mb-2">Email Notifications</h4>
            <p className="text-slate-300">
              KYNEX.dev sends email notifications 5 minutes before a reminder is due. To enable:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>Go to Settings</li>
              <li>Enable "Email Notifications"</li>
              <li>Ensure your email address is set in your profile</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'settings',
      title: 'Settings & Preferences',
      icon: Settings,
      content: (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white">Customize Your Experience</h3>
          <p className="text-slate-300">
            Personalize KYNEX.dev to suit your needs:
          </p>
          
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <h4 className="font-semibold text-cyan-400 mb-2">Profile Settings</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>Update your name and email address</li>
              <li>Manage notification preferences</li>
              <li>Change your theme (light/dark)</li>
            </ul>
          </div>
          
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <h4 className="font-semibold text-cyan-400 mb-2">Notification Settings</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>Enable/disable email notifications</li>
              <li>Control in-app notification preferences</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'support',
      title: 'Support & Contact',
      icon: HelpCircle,
      content: (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white">Need Help?</h3>
          <p className="text-slate-300">
            If you're experiencing issues or have questions, here are ways to get support:
          </p>
          
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <h4 className="font-semibold text-cyan-400 mb-2 flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email Support
            </h4>
            <p className="text-slate-300">
              Contact us at support@kynex.dev for assistance with your account or technical issues.
            </p>
          </div>
          
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <h4 className="font-semibold text-cyan-400 mb-2 flex items-center gap-2">
              <Github className="w-5 h-5" />
              GitHub Issues
            </h4>
            <p className="text-slate-300">
              Report bugs or request features on our GitHub repository.
            </p>
          </div>
          
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <h4 className="font-semibold text-cyan-400 mb-2 flex items-center gap-2">
              <Youtube className="w-5 h-5" />
              Video Tutorials
            </h4>
            <p className="text-slate-300">
              Check out our YouTube channel for video tutorials and tips.
            </p>
          </div>
        </div>
      )
    }
  ];

  const activeSectionData = helpSections.find(section => section.id === activeSection);

  return (
    <div className="min-h-screen bg-slate-900 py-3 md:py-4 max-w-full pt-20 md:pt-0">
      <div className="max-w-7xl mx-auto px-3 md:px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Help Center</h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-sm">
            Find answers to common questions and learn how to make the most of your KYNEX.dev experience.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-1/4">
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 sticky top-8">
              <h2 className="text-lg font-semibold text-white mb-4">Help Topics</h2>
              <nav className="space-y-2">
                {helpSections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                        isActive
                          ? 'bg-cyan-500/10 text-cyan-400'
                          : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{section.title}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:w-3/4">
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 md:p-8">
              {activeSectionData?.content}
            </div>

            {/* Additional Help Resources */}
            <div className="mt-8 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">Still Need Help?</h3>
              <p className="text-slate-300 mb-4">
                If you can't find what you're looking for, our support team is here to help.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="mailto:support@kynex.dev"
                  className="flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                >
                  <Mail className="w-5 h-5" />
                  Contact Support
                </a>
                <a
                  href="#"
                  className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                >
                  <Github className="w-5 h-5" />
                  Report Issue
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}