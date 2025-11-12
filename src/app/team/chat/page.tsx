'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Plus, Trash2, User, MessageSquare, Save, X, Edit2, Menu, Home, BookOpen, Bell, Users, Settings, HelpCircle, LogOut, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';

import { supabase } from '@/lib/supabase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Logo } from '@/components/Logo';

interface Message {
  id: string;
  role: 'user' | 'system' | 'assistant';
  content: string;
  created_at: string;
  user_id: string;
  user_name: string;
}

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
  team_id?: string;
}

export default function TeamChatPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [editConversationTitle, setEditConversationTitle] = useState('');
  const [teamId, setTeamId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState<string>('');
  const [teamMembers, setTeamMembers] = useState<{[key: string]: {name: string, email: string}}>({});

  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isAIEnabled, setIsAIEnabled] = useState(false);
  const [isAIFetching, setIsAIFetching] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [copiedCodeBlocks, setCopiedCodeBlocks] = useState<{[key: string]: boolean}>({});
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Cache for profile lookups (avoid refetching profile names repeatedly)
  const profileCache = useRef<{[key: string]: {name?: string, email?: string}}>({});

  // Persist AI toggle preference per-team (falls back to 'global' when teamId is not available)
  useEffect(() => {
    try {
      const key = `team_chat_ai_enabled_${teamId ?? 'global'}`;
      const saved = localStorage.getItem(key);
      if (saved !== null) setIsAIEnabled(saved === 'true');
    } catch (e) {
      // ignore
    }
  }, [teamId]);

  useEffect(() => {
    try {
      const key = `team_chat_ai_enabled_${teamId ?? 'global'}`;
      localStorage.setItem(key, isAIEnabled ? 'true' : 'false');
    } catch (e) {
      // ignore
    }
  }, [isAIEnabled, teamId]);

  const { addNotification } = useNotifications();

  // Clear all messages in the current team chat
  const clearTeamChat = async () => {
    if (!teamId || !user) return;
    
    try {
      // Show confirmation dialog
      if (!confirm('Are you sure you want to clear all messages in this team chat? This action cannot be undone.')) {
        return;
      }
      
      // Delete all messages for this team
      const { error } = await supabase
        .from('team_messages')
        .delete()
        .eq('team_id', teamId);
      
      if (error) throw error;
      
      // Clear messages from state
      setMessages([]);
      
      // Show success notification
      addNotification({
        title: 'Success',
        message: 'Team chat cleared successfully',
        type: 'chat'
      });
    } catch (error) {
      console.error('Error clearing team chat:', error);
      addNotification({
        title: 'Error',
        message: 'Failed to clear team chat',
        type: 'chat'
      });
    }
  };

  // State for mobile sidebar open/close

  // Handle initial sidebar state based on screen size and conversations
  useEffect(() => {
    const handleInitialSidebarState = () => {
      if (window.innerWidth < 768) {
        // On mobile, show sidebar if no conversation is selected
        if (!activeConversation) {
          setIsMobileSidebarOpen(true);
        }
      } else {
        // On desktop, always hide the mobile sidebar
        setIsMobileSidebarOpen(false);
      }
    };
    
    handleInitialSidebarState();
    
    // Add resize listener
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileSidebarOpen(false);
      } else if (!activeConversation && !isMobileSidebarOpen) {
        setIsMobileSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Call on initial load
    
    return () => window.removeEventListener('resize', handleResize);
  }, [activeConversation, isMobileSidebarOpen]);

  // Get team ID from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const teamIdParam = urlParams.get('team');
    
    if (teamIdParam) {
      setTeamId(teamIdParam);
      
      // Load team name and members from localStorage
      try {
        const storedTeams = localStorage.getItem('teams');
        if (storedTeams) {
          const teams = JSON.parse(storedTeams);
          const team = teams.find((t: any) => t.id === teamIdParam);
          if (team) {
            setTeamName(team.name);
            
            // Load team members with better error handling
            const memberData: {[key: string]: {name: string, email: string}} = {};
            team.members.forEach((memberId: string) => {
              try {
                if (!memberId || typeof memberId !== 'string') {
                  throw new Error('Invalid member ID');
                }
                const emailParts = memberId.split('@');
                if (emailParts.length !== 2) {
                  throw new Error('Invalid email format');
                }
                memberData[memberId] = {
                  name: emailParts[0].charAt(0).toUpperCase() + emailParts[0].slice(1) || 'Team Member',
                  email: memberId
                };
              } catch (error) {
                console.error(`Error processing team member ${memberId}:`, error);
                memberData[memberId] = {
                  name: 'Team Member',
                  email: memberId
                };
              }
            });
            setTeamMembers(memberData);
          }
        }
      } catch (error) {
        console.error('Error loading team data:', error);
        addNotification({
          title: 'Error',
          message: 'Error loading team data',
          type: 'chat'
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      // If no team ID in URL, redirect to team page
      window.location.href = '/team';
    }
  }, []);

  const loadConversations = useCallback(async () => {
    // Team chat doesn't use conversations table, load messages directly
    if (!user || !teamId) return;
    
    try {
      // Load initial messages for the team
      await loadMessages(teamId);
    } catch (error) {
      console.error('Error loading team messages:', error);
    }
  }, [user, teamId]);

  const loadMessages = useCallback(async (teamId: string) => {
    try {
      console.log('Loading messages for team:', teamId);
      // For team chat, we should be using team_messages table instead of messages
      const { data, error } = await supabase
        .from('team_messages')
        .select('id, message, created_at, user_id')
        .eq('team_id', teamId) // Use team_id instead of conversation_id
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading team messages:', error);
        throw error;
      }

      console.log('Loaded team messages:', data);

      // Helper to resolve a user's full name. Checks teamMembers -> cache -> profiles table.
      const resolveUserName = async (userId: string): Promise<string> => {
        if (!userId) return 'Team Member';
        // If teamMembers contains a friendly name, use it
        if (teamMembers[userId] && teamMembers[userId].name) return teamMembers[userId].name;
        // Check cache
        if (profileCache.current[userId] && profileCache.current[userId].name) return profileCache.current[userId].name!;
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', userId)
            .single();
        if (!profileError && profile) {
          const name = profile.full_name || (profile.email ? String(profile.email).split('@')[0] : 'Team Member');
          profileCache.current[userId] = { name, email: profile.email };
          return name;
        }
      } catch (e) {
        console.error('Error fetching profile for user:', userId, e);
      }
      // Fallbacks: if userId looks like an email, use prefix; otherwise a neutral label
      if (String(userId).includes('@')) return String(userId).split('@')[0];
      return 'Team Member';
    };

    const formattedMessages: Message[] = [];
    for (const msg of (data || [])) {
      const name = await resolveUserName(msg.user_id);
      formattedMessages.push({
        id: msg.id,
        role: 'user', // All team messages are from users
        content: msg.message, // team_messages uses 'message' field instead of 'content'
        created_at: msg.created_at,
        user_id: msg.user_id,
        user_name: name
      });
    }

    console.log('Setting messages:', formattedMessages);
    setMessages(formattedMessages);
  } catch (error) {
    console.error('Error loading messages:', error);
  }
}, [teamMembers]);

  useEffect(() => {
    if (user && teamId) {
      // Load initial messages when user and team are available
      loadMessages(teamId);
    }
  }, [user, teamId, loadMessages]);

  useEffect(() => {
    console.log('Team chat useEffect triggered:', { user, teamId, messagesLength: messages.length });
    // For team chat, we load messages directly when teamId is available
    if (teamId && messages.length === 0) {
      console.log('Loading initial messages for team:', teamId);
      loadMessages(teamId);
    } else if (teamName && messages.length === 0) {
      // Add welcome message when no messages exist
      console.log('Setting welcome message for team:', teamName);
      setMessages([{
        id: 'welcome',
        role: 'system',
        content: `Welcome to the ${teamName} team chat! 👋
      
Start a new conversation or select an existing one from the sidebar. You can:
- Share ideas and updates with your team
- Use markdown formatting for rich text
- Upload files and images (coming soon)
- Mention team members using @username`,
        created_at: new Date().toISOString(),
        user_id: 'system',
        user_name: 'System'
      }]);
    }
  }, [teamId, loadMessages, teamName, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const mobileMenu = document.querySelector('[data-mobile-menu]');
      const menuButton = document.getElementById('mobile-menu-button');
      
      if (mobileMenuOpen && mobileMenu && menuButton && 
          !mobileMenu.contains(event.target as Node) && 
          !menuButton.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen]);

  const createNewConversation = async () => {
    if (!user || !teamId) return;
    
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({ user_id: user.id, title: 'New Team Conversation', team_id: teamId })
        .select()
        .single();

      if (error) throw error;

      const newConversation = {
        id: data.id,
        title: data.title,
        updated_at: data.updated_at,
        team_id: data.team_id
      };

      setConversations([newConversation, ...conversations]);
      setActiveConversation(newConversation.id);
      setMessages([]);

      if (window.innerWidth < 768) setIsMobileSidebarOpen(false);
    } catch (error) {
      console.error('Error creating conversation:', error);
      addNotification({
        title: 'Error',
        message: 'Error creating conversation',
        type: 'chat'
      });
    }
  };

  const deleteConversation = async (id: string) => {
    try {
      const { error } = await supabase.from('conversations').delete().eq('id', id);
      if (error) throw error;
      setConversations(conversations.filter((c) => c.id !== id));
      if (activeConversation === id) {
        setActiveConversation(null);
        setMessages([]);
      }
      addNotification({
        title: 'Success',
        message: 'Conversation deleted successfully',
        type: 'chat'
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      addNotification({
        title: 'Error',
        message: 'Error deleting conversation',
        type: 'chat'
      });
    }
  };

  const updateConversationTitle = async (id: string, title: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase.from('conversations').update({ title }).eq('id', id);
      if (error) throw error;
      setConversations(conversations.map((c) => (c.id === id ? { ...c, title } : c)));
      setEditingConversationId(null);
      addNotification({
        title: 'Success',
        message: 'Conversation title updated',
        type: 'chat'
      });
    } catch (error) {
      console.error('Error updating conversation:', error);
      addNotification({
        title: 'Error',
        message: 'Error updating conversation',
        type: 'chat'
      });
    }
  };

  // Add useEffect to simulate online users and typing indicators
  useEffect(() => {
    // Simulate online users
    const simulateOnlineUsers = () => {
      // In a real app, this would come from a real-time subscription
      setOnlineUsers([user?.id || '']);
    };
    
    simulateOnlineUsers();
    
    // Simulate typing indicator
    const typingTimer = setTimeout(() => {
      setIsTyping(false);
    }, 3000);
    
    return () => clearTimeout(typingTimer);
  }, [user]);

  // Add useEffect to handle real-time messaging
  useEffect(() => {
    if (!teamId) return;

    const channel = supabase
      .channel('team-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'team_messages', filter: `team_id=eq.${teamId}` },
        (payload) => {
          console.log('New message received:', payload);
          const newMessage = payload.new as any;
          
          // Resolve user name for the new message
          const resolveUserName = async (userId: string): Promise<string> => {
            if (!userId) return 'Team Member';
            // If teamMembers contains a friendly name, use it
            if (teamMembers[userId] && teamMembers[userId].name) return teamMembers[userId].name;
            // Check cache
            if (profileCache.current[userId] && profileCache.current[userId].name) return profileCache.current[userId].name!;
            try {
              const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('full_name, email')
                .eq('id', userId)
                .single();
              if (!profileError && profile) {
                const name = profile.full_name || (profile.email ? String(profile.email).split('@')[0] : 'Team Member');
                profileCache.current[userId] = { name, email: profile.email };
                return name;
              }
            } catch (e) {
              console.error('Error fetching profile for user:', userId, e);
            }
            // Fallbacks: if userId looks like an email, use prefix; otherwise a neutral label
            if (String(userId).includes('@')) return String(userId).split('@')[0];
            return 'Team Member';
          };

          // Add the new message to the list
          resolveUserName(newMessage.user_id).then(name => {
            const formattedMessage: Message = {
              id: newMessage.id,
              role: 'user',
              content: newMessage.message,
              created_at: newMessage.created_at,
              user_id: newMessage.user_id,
              user_name: name
            };
            
            setMessages(prev => [...prev, formattedMessage]);
            setIsTyping(false); // Clear typing indicator when new message arrives
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, teamMembers]);

  // Adjust textarea height based on content
  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      // Limit to 5 lines maximum (approximately 120px)
      const maxHeight = 120;
      textarea.style.height = Math.min(scrollHeight, maxHeight) + 'px';
    }
  }, []);

  // Adjust textarea height when input changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  const sendMessage = async () => {
    if (!input.trim() || !teamId || !user) return; // Use teamId instead of activeConversation

    try {
      // Persist user message to Supabase (using team_messages table)
      const { data: msgData, error: insertError } = await supabase
        .from('team_messages')
        .insert({ 
          team_id: teamId, 
          message: input, 
          user_id: user.id 
        })
        .select()
        .single();

    if (insertError) throw insertError;
  
    console.log('Team message inserted successfully:', msgData);

    // Note: We don't add the message to the state here anymore because
    // the real-time subscription will handle it. This prevents duplicates.
    
    setInput('');
  
    // Dispatch a custom event to notify other components that a message was created
    window.dispatchEvent(new CustomEvent('messageCreated'));
  
    // If AI is enabled, send the message to the AI as well
    if (isAIEnabled) {
      setIsAIFetching(true);
      
      try {
        // Get team messages for context
        const { data: teamMessages } = await supabase
          .from('team_messages')
          .select('message, user_id, created_at')
          .eq('team_id', teamId)
          .order('created_at', { ascending: true })
          .limit(20); // Limit to last 20 messages for context
        
        // Format messages for AI
        const aiMessages = (teamMessages || []).map((msg: any) => ({
          role: msg.user_id === user.id ? 'user' : 'assistant',
          content: msg.message
        }));
        
        // Add the current user message
        aiMessages.push({ role: 'user', content: input });
        
        // Prepare system message for AI
        const systemMessage = {
          role: "system",
          content: `You are KYNEX.dev, a helpful AI assistant for team collaboration. 
          You're participating in a team chat where multiple users are discussing topics.
          Provide concise, helpful responses that are relevant to the team's discussion.
          Keep responses professional and focused on the topic at hand.`
        };
        
        // Get AI response using Groq
        const aiResponse = await getAIResponse(aiMessages, systemMessage);
        
        // Store AI response in the database with a special marker
        // We'll prefix the message with [AI] to identify it as an AI message
        const { data: aiMsgData, error: aiInsertError } = await supabase
          .from('team_messages')
          .insert({
            team_id: teamId,
            user_id: user.id, // Use the current user's ID
            message: `[AI] ${aiResponse}` // Prefix with [AI] to identify as AI message
          })
          .select()
          .single();
          
        if (aiInsertError) {
          console.error('Error inserting AI message:', aiInsertError);
        }
      } catch (error) {
        console.error('Error getting AI response:', error);
      } finally {
        setIsAIFetching(false);
      }
    }
  
    // Note: team_messages doesn't have conversations, so no need to update conversation timestamp
  
  } catch (error) {
    console.error('Error sending message:', error);
    addNotification({
      title: 'Error',
      message: 'Error sending message',
      type: 'chat'
    });
  }
};

const getAIResponse = async (messages: any[], systemMessage: any) => {
  try {
    // Prepare messages for the Groq API
    const groqMessages = [
      systemMessage,
      ...messages
    ];
    
    // Call our API route which uses Groq
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages: groqMessages }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.content || "I'm here to help with your team discussion!";
  } catch (error) {
    console.error("Error getting AI response:", error);
    // Fallback response in case of API error
    return "I'm having trouble connecting to the AI service right now. Please try again later.";
  }
};

const handleKeyPress = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
};

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading team chat...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-cyan-500/10 p-4 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-6">
            <LogIn className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Team Chat Access Required</h1>
          <p className="text-slate-400 mb-8">
            Please sign in to access team chat features and collaborate with your team.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-cyan-500 hover:bg-cyan-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-900">
      {/* Desktop sidebar navigation - visible only on large screens */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:top-0 bg-slate-800/80 backdrop-blur-sm border-r border-slate-700 z-20">
        <div className="flex flex-col flex-1">
          <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
            {/* Make the logo clickable */}
            <a href="/" className="flex items-center gap-3">
              <Logo size="lg" showImage={true} />
            </a>
          </div>

          <div className="p-4 space-y-3 border-b border-slate-700">
            <div className="mb-4">
              <h1 className="text-3xl font-bold text-white truncate">{teamName || 'Team Chat'}</h1>
              <p className="text-slate-400 text-sm">Team collaboration space</p>
            </div>
            <button
              onClick={createNewConversation}
              className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Chat</span>
            </button>
            <button
              onClick={clearTeamChat}
              className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium py-3 px-4 rounded-lg transition-colors border border-red-500/30"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Chat</span>
            </button>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-2">
            <button
              onClick={() => {
                window.location.href = '/';
                setTimeout(() => {
                  const event = new CustomEvent('navigateToView', { detail: 'dashboard' });
                  window.dispatchEvent(event);
                }, 100);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-700/50 hover:text-white transition-all"
            >
              <Home className="w-5 h-5" />
              <span className="font-medium">Dashboard</span>
            </button>
            <button
              onClick={() => {
                window.location.href = '/';
                setTimeout(() => {
                  const event = new CustomEvent('navigateToView', { detail: 'chat' });
                  window.dispatchEvent(event);
                }, 100);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-700/50 hover:text-white transition-all"
            >
              <MessageSquare className="w-5 h-5" />
              <span className="font-medium">Chat</span>
            </button>
            <button
              onClick={() => {
                window.location.href = '/';
                setTimeout(() => {
                  const event = new CustomEvent('navigateToView', { detail: 'notes' });
                  window.dispatchEvent(event);
                }, 100);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-700/50 hover:text-white transition-all"
            >
              <BookOpen className="w-5 h-5" />
              <span className="font-medium">Notes</span>
            </button>
            <button
              onClick={() => {
                window.location.href = '/';
                setTimeout(() => {
                  const event = new CustomEvent('navigateToView', { detail: 'reminders' });
                  window.dispatchEvent(event);
                }, 100);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-700/50 hover:text-white transition-all"
            >
              <Bell className="w-5 h-5" />
              <span className="font-medium">Reminders</span>
            </button>
            <button
              onClick={() => {
                window.location.href = '/';
                setTimeout(() => {
                  const event = new CustomEvent('navigateToView', { detail: 'team' });
                  window.dispatchEvent(event);
                }, 100);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-cyan-500/10 text-cyan-400 transition-all"
            >
              <Users className="w-5 h-5" />
              <span className="font-medium">Team</span>
            </button>
            <button
              onClick={() => {
                window.location.href = '/';
                setTimeout(() => {
                  const event = new CustomEvent('navigateToView', { detail: 'settings' });
                  window.dispatchEvent(event);
                }, 100);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-700/50 hover:text-white transition-all"
            >
              <Settings className="w-5 h-5" />
              <span className="font-medium">Settings</span>
            </button>
            <button
              onClick={() => {
                window.location.href = '/';
                setTimeout(() => {
                  const event = new CustomEvent('navigateToView', { detail: 'help' });
                  window.dispatchEvent(event);
                }, 100);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-700/50 hover:text-white transition-all"
            >
              <HelpCircle className="w-5 h-5" />
              <span className="font-medium">Help</span>
            </button>
          </nav>

          <div className="px-4 py-4 border-t border-slate-700">
            <button 
              onClick={() => {
                // Handle sign out
                const signOutEvent = new CustomEvent('signOut');
                window.dispatchEvent(signOutEvent);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-700/50 hover:text-white transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile header with logo - visible only on small screens */}
      <header className="md:hidden fixed top-0 left-0 w-full z-20 bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Make the mobile logo clickable */}
            <a href="/" className="flex items-center gap-2">
              <Logo size="lg" showImage={true} />
            </a>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Profile icon for mobile */}
            <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center">
              <User className="w-5 h-5 text-cyan-400" />
            </div>
            
            <button
              id="mobile-menu-button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-slate-400 hover:text-white transition-colors p-2"
            >
              {mobileMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
            </button>
          </div>
        </div>

        {/* Mobile menu - visible only when mobileMenuOpen is true */}
        {mobileMenuOpen && (
          <div data-mobile-menu className="absolute top-full left-0 w-full bg-slate-800/95 backdrop-blur-lg border-b border-slate-700 z-30">
            <nav className="mt-4 pb-2 space-y-1">
              <button
                onClick={() => {
                  window.location.href = '/';
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-700/50 hover:text-white transition-all"
              >
                <Home className="w-5 h-5" />
                <span className="font-medium">Dashboard</span>
              </button>
              <button
                onClick={() => {
                  window.location.href = '/';
                  // We need to simulate clicking on the chat view in the main app
                  setTimeout(() => {
                    const event = new CustomEvent('navigateToView', { detail: 'chat' });
                    window.dispatchEvent(event);
                  }, 100);
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-700/50 hover:text-white transition-all"
              >
                <MessageSquare className="w-5 h-5" />
                <span className="font-medium">Chat</span>
              </button>
              <button
                onClick={() => {
                  window.location.href = '/';
                  // We need to simulate clicking on the notes view in the main app
                  setTimeout(() => {
                    const event = new CustomEvent('navigateToView', { detail: 'notes' });
                    window.dispatchEvent(event);
                  }, 100);
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-700/50 hover:text-white transition-all"
              >
                <BookOpen className="w-5 h-5" />
                <span className="font-medium">Notes</span>
              </button>
              <button
                onClick={() => {
                  window.location.href = '/';
                  // We need to simulate clicking on the reminders view in the main app
                  setTimeout(() => {
                    const event = new CustomEvent('navigateToView', { detail: 'reminders' });
                    window.dispatchEvent(event);
                  }, 100);
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-700/50 hover:text-white transition-all"
              >
                <Bell className="w-5 h-5" />
                <span className="font-medium">Reminders</span>
              </button>
              <button
                onClick={() => {
                  window.location.href = '/';
                  // We need to simulate clicking on the team view in the main app
                  setTimeout(() => {
                    const event = new CustomEvent('navigateToView', { detail: 'team' });
                    window.dispatchEvent(event);
                  }, 100);
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-cyan-500/10 text-cyan-400 transition-all"
              >
                <Users className="w-5 h-5" />
                <span className="font-medium">Team</span>
              </button>
              <button
                onClick={() => {
                  window.location.href = '/';
                  // We need to simulate clicking on the settings view in the main app
                  setTimeout(() => {
                    const event = new CustomEvent('navigateToView', { detail: 'settings' });
                    window.dispatchEvent(event);
                  }, 100);
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-700/50 hover:text-white transition-all"
              >
                <Settings className="w-5 h-5" />
                <span className="font-medium">Settings</span>
              </button>
              <button
                onClick={() => {
                  window.location.href = '/';
                  // We need to simulate clicking on the help view in the main app
                  setTimeout(() => {
                    const event = new CustomEvent('navigateToView', { detail: 'help' });
                    window.dispatchEvent(event);
                  }, 100);
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-700/50 hover:text-white transition-all"
              >
                <HelpCircle className="w-5 h-5" />
                <span className="font-medium">Help</span>
              </button>
              <button
                onClick={clearTeamChat}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all"
              >
                <Trash2 className="w-5 h-5" />
                <span className="font-medium">Clear Chat</span>
              </button>
              <button 
                onClick={() => {
                  // Handle sign out
                  const signOutEvent = new CustomEvent('signOut');
                  window.dispatchEvent(signOutEvent);
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-700/50 hover:text-white transition-all"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Sign Out</span>
              </button>
            </nav>
          </div>
        )}
      </header>

      <div className="flex-1 flex flex-col pt-16 overflow-hidden md:pt-0 lg:ml-64 pb-24 lg:pb-0">
        <>
          <div className="flex-1 flex flex-col mt-0 md:mt-0 mb-0 pt-0 md:pt-0 overflow-hidden">
            {/* Chat messages container */}
            <div className="flex flex-col h-[calc(100vh-110px)] overflow-y-auto pb-0 pt-6 mt-0 md:mt-0">
              <div className="max-w-3xl mx-auto md:mx-auto space-y-6 px-2 md:px-0 w-full md:mr-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-2 ${message.role === 'assistant' ? 'justify-start' : (message.user_id === user.id ? 'justify-end' : 'justify-start')}`}
                  >
                    {message.role === 'assistant' ? (
                      <div className="flex-shrink-0 w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-xs font-semibold text-white">AI</div>
                    ) : (message.user_id !== user.id && message.user_id !== 'ai-system' && (
                      <div className="flex-shrink-0 w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center relative">
                        <User className="w-5 h-5 text-white" />
                        {onlineUsers.includes(message.user_id) && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900"></div>
                        )}
                      </div>
                    ))}
                    <div
                      className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-3 py-2 ${
                        message.role === 'assistant' ? 'bg-slate-800 text-white rounded-tl-none' :
                        (message.user_id === user.id
                          ? 'bg-cyan-500 text-white rounded-tr-none'
                          : 'bg-slate-800 text-white rounded-tl-none')
                      }`}
                    >
                      {(message.role === 'assistant') ? (
                        <div className="flex items-center gap-2 text-xs font-bold mb-1">
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-cyan-500 rounded-full text-[10px] font-semibold">AI</span>
                          <span>AI Assistant</span>
                        </div>
                      ) : (message.user_id !== user.id && (
                        <div className="text-xs font-bold mb-1">{message.user_name}</div>
                      ))}
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ node, ...props }) => <h1 className="text-xl font-bold mt-3 mb-2" {...props} />,
                          h2: ({ node, ...props }) => <h2 className="text-lg font-bold mt-2 mb-2" {...props} />,
                          h3: ({ node, ...props }) => <h3 className="text-base font-bold mt-2 mb-1" {...props} />,
                          h4: ({ node, ...props }) => <h4 className="text-sm font-bold mt-2 mb-1" {...props} />,
                          h5: ({ node, ...props }) => <h5 className="text-xs font-bold mt-2 mb-1" {...props} />,
                          h6: ({ node, ...props }) => <h6 className="text-xs font-bold mt-2 mb-1" {...props} />,
                          p: ({ node, ...props }) => <p className="mb-2" {...props} />,
                          ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                          ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                          li: ({ node, ...props }) => <li {...props} />,
                          blockquote: ({ node, ...props }) => (
                            <blockquote className="border-l-4 border-cyan-500 pl-3 italic my-2" {...props} />
                          ),
                          code: ({ node, className, children, ...props }) => {
                            const match = /language-(\w+)/.exec(className || '');
                            if (match) {
                              // Create a unique key for this code block
                              const codeKey = `${node?.position?.start?.line || 0}-${node?.position?.end?.line || 0}-${String(children).substring(0, 10)}`;
                              
                              return (
                                <div className="relative">
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(String(children));
                                      // Set copied state for this code block
                                      setCopiedCodeBlocks(prev => ({ ...prev, [codeKey]: true }));
                                      // Reset after 3 seconds
                                      setTimeout(() => {
                                        setCopiedCodeBlocks(prev => ({ ...prev, [codeKey]: false }));
                                      }, 3000);
                                    }}
                                    className="absolute top-2 right-2 bg-slate-700 hover:bg-slate-600 text-white p-1 rounded text-xs"
                                  >
                                    {copiedCodeBlocks[codeKey] ? 'Copied!' : 'Copy'}
                                  </button>
                                  <code
                                    className="bg-[#1e1e2e] text-[#a6e3a1] rounded text-sm font-mono block p-3 my-2 overflow-x-auto whitespace-pre"
                                    {...props}
                                  >
                                    {children}
                                  </code>
                                </div>
                              );
                            }
                            return (
                              <code className="bg-[#313244] text-[#cdd6f4] rounded px-1 py-0.5 text-sm font-mono" {...props}>
                                {children}
                              </code>
                            );
                          },
                          pre: ({ node, children, ...props }) => (
                            <div className="relative">
                              {/* Removed duplicate copy button */}
                              <pre className="bg-[#1e1e2e] text-[#cdd6f4] rounded-lg p-3 my-2 overflow-x-auto" {...props}>
                                {children}
                              </pre>
                            </div>
                          ),
                          a: ({ node, ...props }) => (
                            <a className="text-cyan-400 hover:text-cyan-300 underline" {...props} />
                          ),
                          table: ({ node, ...props }) => (
                            <table className="min-w-full border-collapse my-2" {...props} />
                          ),
                          th: ({ node, ...props }) => (
                            <th className="border border-slate-700 px-2 py-1 bg-slate-800 text-left font-bold" {...props} />
                          ),
                          td: ({ node, ...props }) => (
                            <td className="border border-slate-700 px-2 py-1" {...props} />
                          ),
                          tr: ({ node, ...props }) => <tr className="even:bg-slate-800/50" {...props} />,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                    {message.user_id === user.id && message.role !== 'assistant' && (
                      <div className="flex-shrink-0 w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                ))}
                {/* Add typing indicator */}
                {isTyping && (
                  <div className="flex gap-2 justify-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="bg-slate-800 text-white rounded-2xl rounded-tl-none px-3 py-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Typing bar - fixed at the bottom, aligned with content area */}
            <div className="fixed bottom-0 left-0 lg:left-64 right-0 bg-slate-800/90 backdrop-blur-md border-t border-slate-700 z-20">
              <div className="max-w-3xl mx-auto px-3 py-3">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-end px-2 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium transition-colors ${isAIEnabled ? 'text-cyan-400' : 'text-slate-500'}`}>AI</span>
                        <label className="inline-flex items-center cursor-pointer" title="When enabled messages will also be sent to the AI">
                          <input
                            type="checkbox"
                            checked={isAIEnabled}
                            onChange={(e) => setIsAIEnabled(e.target.checked)}
                            className="sr-only"
                            aria-label="Enable AI assistant"
                          />
                          <span role="switch" aria-checked={isAIEnabled} className={`${isAIEnabled ? 'bg-cyan-500' : 'bg-slate-700'} relative inline-block w-12 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400`}>
                            <span className={`${isAIEnabled ? 'translate-x-6' : 'translate-x-0'} absolute left-0 top-0 w-6 h-6 bg-white rounded-full shadow transform transition-transform`} />
                            {isAIFetching && (
                              <span className="absolute inset-0 flex items-center justify-center">
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                              </span>
                            )}
                          </span>
                        </label>
                        <div className="sr-only" aria-live="polite">{isAIEnabled ? 'AI enabled' : 'AI disabled'}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-end gap-2">
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => {
                        setInput(e.target.value);
                        adjustTextareaHeight();
                      }}
                      onKeyDown={handleKeyPress}
                      placeholder="Type your message... "
                      className="flex-1 bg-slate-900/90 border border-slate-700 rounded-xl py-3 px-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none min-h-[48px] md:scrollbar-hide scrollbar-hide"
                      rows={1}
                      disabled={!teamId}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!input.trim() || !teamId}
                      className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-5 py-3 rounded-xl transition-all flex items-center gap-2"
                    >
                      <Send className="w-5 h-5" />
                      <span className="hidden sm:inline">Send</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      </div>
    </div>
  );
}
