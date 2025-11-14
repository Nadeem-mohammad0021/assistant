'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Plus, Trash2, User, Bot, Save, X, Edit2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getGroqChatCompletion, ChatCompletionMessageParam } from '../lib/ai';
import { supabase } from '../lib/supabase';
import { extractDocumentContentForAI } from '../lib/documentParser';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

export function Chat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [editConversationTitle, setEditConversationTitle] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<{[key: string]: boolean}>({});
  const [dropdownPosition, setDropdownPosition] = useState<{top: number, right: number}>({top: 0, right: 0});
  const [copiedCodeBlocks, setCopiedCodeBlocks] = useState<{[key: string]: boolean}>({});

  // Set initial state based on screen size and conversations
  useEffect(() => {
    const handleInitialSidebarState = () => {
      if (window.innerWidth < 768) {
        // On mobile, show sidebar if no conversation is selected
        // But don't override if sidebar is already open (user preference)
        if (!activeConversation && !isMobileSidebarOpen) {
          setIsMobileSidebarOpen(true);
        }
      } else {
        // On desktop, always hide the mobile sidebar
        setIsMobileSidebarOpen(false);
      }
    };
    
    handleInitialSidebarState();
  }, [activeConversation]);

  // Ensure sidebar is visible on initial load if there are conversations
  useEffect(() => {
    if (window.innerWidth < 768 && conversations.length > 0 && !activeConversation) {
      setIsMobileSidebarOpen(true);
    }
  }, [conversations.length, activeConversation]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Close mobile menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Check if the click was inside any dropdown menu by using a more reliable method
      const target = e.target as Node;
      const dropdownButtons = document.querySelectorAll('.conversation-dropdown-button');
      const dropdownMenus = document.querySelectorAll('.conversation-dropdown');
      
      // Check if click is on a dropdown button or inside a dropdown menu
      let clickedOnDropdown = false;
      
      // Check if click is on a dropdown button
      dropdownButtons.forEach(button => {
        if (button.contains(target)) {
          clickedOnDropdown = true;
        }
      });
      
      // Check if click is inside a dropdown menu
      dropdownMenus.forEach(menu => {
        if (menu.contains(target)) {
          clickedOnDropdown = true;
        }
      });
      
      // Only close menus if click was outside all dropdowns
      if (!clickedOnDropdown) {
        setMobileMenuOpen({});
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Update dropdown position when window resizes
  useEffect(() => {
    const updateDropdownPosition = () => {
      // This will trigger a re-render with updated positions
      setConversations([...conversations]);
    };
    
    window.addEventListener('resize', updateDropdownPosition);
    return () => window.removeEventListener('resize', updateDropdownPosition);
  }, [conversations]);

  // Focus the textarea when component mounts and when loading state changes
  useEffect(() => {
    const focusTextarea = () => {
      if (textareaRef.current && !loading) {
        textareaRef.current.focus();
        textareaRef.current.select();
      }
    };
    
    // Focus immediately
    focusTextarea();
    
    // Also focus when the component regains focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setTimeout(focusTextarea, 100);
      }
    };
    
    // Focus when window is focused
    const handleWindowFocus = () => {
      setTimeout(focusTextarea, 100);
    };
  
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [loading]);

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

  const loadConversations = useCallback(async () => {
    if (!user) return;

    try {
      const limit = 20; // Load 20 conversations at a time
      const { data, error } = await supabase
        .from('conversations')
        .select('id, title, updated_at')
        .eq('user_id', user.id)
        .is('team_id', null) // Only load personal conversations, not team conversations
        .order('updated_at', { ascending: false })
        .range(0, limit - 1);

      if (error) throw error;

      const formattedConversations: Conversation[] = (data || []).map((conv: any) => ({
        id: conv.id,
        title: conv.title,
        updated_at: conv.updated_at
      }));

      setConversations(formattedConversations);
      setError(null); // Clear any previous errors
      if (formattedConversations.length > 0 && !activeConversation) {
        setActiveConversation(formattedConversations[0].id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load conversations';
      console.error('Error loading conversations:', message);
      setError(message);
      setConversations([]); // Reset conversations on error
    }
  }, [user, activeConversation]);

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, role, content, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedMessages: Message[] = (data || []).map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        created_at: m.created_at
      }));

      setMessages(formattedMessages);

      if (window.innerWidth < 768) {
        setIsMobileSidebarOpen(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load messages';
      console.error('Error loading messages:', message);
      setError(message);
      setMessages([]); // Reset messages on error
    }
  }, []);

  // Handle mobile menu toggle
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        // On desktop, always hide the mobile sidebar
        setIsMobileSidebarOpen(false);
      } else {
        // On mobile, if no conversation is selected, show the sidebar
        if (!activeConversation) {
          setIsMobileSidebarOpen(true);
        }
        // If a conversation is selected, we don't automatically change the state
        // This allows the user's toggle preference to be respected
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Call on initial load

    return () => window.removeEventListener('resize', handleResize);
  }, [activeConversation]);

  useEffect(() => {
    console.log('User effect triggered, user:', user);
    if (user) {
      loadConversations();
    }
  }, [user, loadConversations]);

  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation);
    }
  }, [activeConversation, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createNewConversation = async () => {
    if (!user) return;

    try {
      // Create conversation without team_id for the main chat
      const { data, error } = await supabase
        .from('conversations')
        .insert({ user_id: user.id, title: 'New Conversation', team_id: null })
        .select()
        .single();

      if (error) throw error;

      const formattedConversation = {
        id: data.id,
        title: data.title,
        updated_at: data.updated_at,
      };

      setConversations([formattedConversation, ...conversations]);
      setActiveConversation(data.id);
      setMessages([]);

      if (window.innerWidth < 768) {
        setIsMobileSidebarOpen(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create conversation';
      console.error('Error creating conversation:', message);
      setError(message);
      setLoading(false); // Reset loading state on error
    }
  };

  const deleteConversation = async (id: string) => {
    try {
      const { error } = await supabase.from('conversations').delete().eq('id', id);
      if (error) throw error;

      const updatedConversations = conversations.filter((c) => c.id !== id);
      setConversations(updatedConversations);
      if (activeConversation === id) {
        setActiveConversation(updatedConversations[0]?.id || null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete conversation';
      console.error('Error deleting conversation:', message);
      setError(message);
    }
  };

  const startEditingConversation = (conversation: Conversation) => {
    setEditingConversationId(conversation.id);
    setEditConversationTitle(conversation.title);
  };

  const saveConversationTitle = (conversationId: string) => {
    if (!user) return;
    
    try {
      (async () => {
        const { error } = await supabase.from('conversations').update({ title: editConversationTitle }).eq('id', conversationId);
        if (error) throw error;
        await loadConversations();
        setEditingConversationId(null);
      })();
    } catch (error) {
      console.error('Error updating conversation title:', error);
    }
  };

  const cancelEditingConversation = () => {
    setEditingConversationId(null);
  };

  // Function to parse AI response for note/reminder creation commands
  const parseAIResponse = async (response: string) => {
    if (!user || !response) return response || "";

    let cleanedResponse = response;

    try {
      // Improved regex pattern to match /create_note commands more reliably
      const noteRegex = /\/create_note\s*\{([^}]+)\}/g;
      let match;

      while ((match = noteRegex.exec(response)) !== null) {
        try {
          const jsonStr = match[1];
          let noteData;
          
          // Try to parse as JSON directly first
          try {
            noteData = JSON.parse(`{${jsonStr}}`);
          } catch (jsonError) {
            // If that fails, try to parse as a complete JSON object
            try {
              noteData = JSON.parse(jsonStr);
            } catch (fullJsonError) {
              console.error('Failed to parse note JSON:', jsonError, fullJsonError);
              continue;
            }
          }

          if (!noteData.title) {
            console.warn('Note data missing title:', noteData);
            continue;
          }

          // Create the note in Supabase
          console.log('Creating note with data:', {
            user_id: user.id,
            title: noteData.title,
            content: noteData.content || '',
            tags: Array.isArray(noteData.tags) ? noteData.tags : [],
            folder: noteData.folder || 'General',
            attachments: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
          console.log('Attempting to create note with data:', {
            user_id: user.id,
            title: noteData.title,
            content: noteData.content || '',
            tags: Array.isArray(noteData.tags) ? noteData.tags : [],
            folder: noteData.folder || 'General',
            attachments: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
          const { data, error } = await supabase.from('notes').insert({
            user_id: user.id,
            title: noteData.title,
            content: noteData.content || '',
            tags: Array.isArray(noteData.tags) ? noteData.tags : [],
            folder: noteData.folder || 'General',
            attachments: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }).select();

          if (error) {
            console.error('Error creating note from AI command:', error);
            // Try again without explicit timestamps in case that's causing issues
            console.log('Retrying note creation without explicit timestamps:', {
              user_id: user.id,
              title: noteData.title,
              content: noteData.content || '',
              tags: Array.isArray(noteData.tags) ? noteData.tags : [],
              folder: noteData.folder || 'General',
              attachments: []
            });
            
            const { data: retryData, error: retryError } = await supabase.from('notes').insert({
              user_id: user.id,
              title: noteData.title,
              content: noteData.content || '',
              tags: Array.isArray(noteData.tags) ? noteData.tags : [],
              folder: noteData.folder || 'General',
              attachments: []
            }).select();
            
            if (retryError) {
              console.error('Retry error creating note:', retryError);
              alert('Failed to create note. Please try again.');
            } else {
              console.log('Note created successfully on retry:', retryData);
              // Dispatch a custom event to notify other components that a note was created
              const noteCreatedEvent = new CustomEvent('noteCreated', { detail: retryData[0] });
              window.dispatchEvent(noteCreatedEvent);
              console.log('Dispatched noteCreated event:', noteCreatedEvent);
              
              // Also emit a Supabase realtime event manually to ensure immediate visibility
              if (retryData && retryData[0]) {
                const noteEvent = new CustomEvent('supabase:realtime', {
                  detail: {
                    eventType: 'INSERT',
                    new: {
                      id: retryData[0].id,
                      user_id: retryData[0].user_id,
                      title: retryData[0].title,
                      content: retryData[0].content,
                      tags: retryData[0].tags || [],
                      folder: noteData.folder || 'General',
                      attachments: retryData[0].attachments || [],
                      created_at: retryData[0].created_at || new Date().toISOString(),
                      updated_at: retryData[0].updated_at || new Date().toISOString()
                    }
                  }
                });
                window.dispatchEvent(noteEvent);
                console.log('Dispatched supabase:realtime event:', noteEvent);
              }
            }
          } else {
            console.log('Note created successfully:', data);
            // Dispatch a custom event to notify other components that a note was created
            const noteCreatedEvent = new CustomEvent('noteCreated', { detail: data[0] });
            window.dispatchEvent(noteCreatedEvent);
            console.log('Dispatched noteCreated event:', noteCreatedEvent);
            
            // Also emit a Supabase realtime event manually to ensure immediate visibility
            if (data && data[0]) {
              const noteEvent = new CustomEvent('supabase:realtime', {
                detail: {
                  eventType: 'INSERT',
                  new: {
                    id: data[0].id,
                    user_id: data[0].user_id,
                    title: data[0].title,
                    content: data[0].content,
                    tags: data[0].tags || [],
                    folder: noteData.folder || 'General',
                    attachments: data[0].attachments || [],
                    created_at: data[0].created_at || new Date().toISOString(),
                    updated_at: data[0].updated_at || new Date().toISOString()
                  }
                }
              });
              window.dispatchEvent(noteEvent);
              console.log('Dispatched supabase:realtime event:', noteEvent);
            }
          }
        } catch (err) {
          console.error('Error creating note from AI command:', err);
          console.error('Problematic JSON string:', match[1]);
        }
      }

      const reminderRegex = /\/create_reminder\s*\{([^}]+)\}/g;
      while ((match = reminderRegex.exec(response)) !== null) {
        try {
          const jsonStr = match[1];
          let reminderData;
          
          // Try to parse as JSON directly first
          try {
            reminderData = JSON.parse(`{${jsonStr}}`);
          } catch (jsonError) {
            // If that fails, try to parse as a complete JSON object
            try {
              reminderData = JSON.parse(jsonStr);
            } catch (fullJsonError) {
              console.error('Failed to parse reminder JSON:', jsonError, fullJsonError);
              continue;
            }
          }

          if (!reminderData.title) {
            console.warn('Reminder data missing title:', reminderData);
            continue;
          }

          const dueDate = reminderData.due_date && !isNaN(Date.parse(reminderData.due_date))
            ? reminderData.due_date
            : new Date(Date.now() + 866400000).toISOString();

          // Create the reminder in Supabase
          console.log('Creating reminder with data:', {
            user_id: user.id,
            title: reminderData.title,
            description: reminderData.description || '',
            reminder_type: reminderData.type && (reminderData.type === 'personal' || reminderData.type === 'professional') ? reminderData.type : 'personal',
            due_date: dueDate,
            is_completed: false,
            is_recurring: Boolean(reminderData.recurring),
            recurrence_rule: reminderData.recurrence_rule || null,
            created_at: new Date().toISOString(),
            completed_at: null
          });
          
          const { data, error } = await supabase.from('reminders').insert({
            user_id: user.id,
            title: reminderData.title,
            description: reminderData.description || '',
            reminder_type: reminderData.type && (reminderData.type === 'personal' || reminderData.type === 'professional') ? reminderData.type : 'personal',
            due_date: dueDate,
            is_completed: false,
            is_recurring: Boolean(reminderData.recurring),
            recurrence_rule: reminderData.recurrence_rule || null,
            created_at: new Date().toISOString(),
            completed_at: null
          }).select();

          if (error) {
            console.error('Error creating reminder from AI command:', error);
            // Try again without explicit timestamps in case that's causing issues
            const dueDate = reminderData.due_date && !isNaN(Date.parse(reminderData.due_date))
              ? reminderData.due_date
              : new Date(Date.now() + 86400000).toISOString();
              
            const { data: retryData, error: retryError } = await supabase.from('reminders').insert({
              user_id: user.id,
              title: reminderData.title,
              description: reminderData.description || '',
              reminder_type: reminderData.type && (reminderData.type === 'personal' || reminderData.type === 'professional') ? reminderData.type : 'personal',
              due_date: dueDate,
              is_completed: false,
              is_recurring: Boolean(reminderData.recurring),
              recurrence_rule: reminderData.recurrence_rule || null
            }).select();
            
            if (retryError) {
              console.error('Retry error creating reminder:', retryError);
              alert('Failed to create reminder. Please try again.');
            } else {
              console.log('Reminder created successfully on retry:', retryData);
              // Dispatch a custom event to notify other components that a reminder was created
              window.dispatchEvent(new CustomEvent('reminderCreated', { detail: retryData[0] }));
              // Also emit a Supabase realtime event manually to ensure immediate visibility
              if (retryData && retryData[0]) {
                const reminderEvent = new CustomEvent('supabase:realtime', {
                  detail: {
                    eventType: 'INSERT',
                    new: {
                      id: retryData[0].id || `reminder-${Date.now()}`,
                      user_id: retryData[0].user_id,
                      title: retryData[0].title,
                      content: retryData[0].description || '',
                      tags: [],
                      folder: 'Reminders',
                      attachments: [],
                      created_at: retryData[0].created_at || new Date().toISOString(),
                      updated_at: retryData[0].updated_at || new Date().toISOString()
                    }
                  }
                });
                window.dispatchEvent(reminderEvent);
              }
            }
          } else {
            console.log('Reminder created successfully:', data);
            // Dispatch a custom event to notify other components that a reminder was created
            window.dispatchEvent(new CustomEvent('reminderCreated', { detail: data[0] }));
            // Also emit a Supabase realtime event manually to ensure immediate visibility
            if (data && data[0]) {
              const reminderEvent = new CustomEvent('supabase:realtime', {
                detail: {
                  eventType: 'INSERT',
                  new: {
                    id: data[0].id,
                    user_id: data[0].user_id,
                    title: data[0].title,
                    content: data[0].description || '',
                    tags: [],
                    folder: 'Reminders',
                    attachments: [],
                    created_at: data[0].created_at || new Date().toISOString(),
                    updated_at: data[0].updated_at || new Date().toISOString()
                  }
                }
              });
              window.dispatchEvent(reminderEvent);
            }
          }
        } catch (err) {
          console.error('Error creating reminder from AI command:', err);
          console.error('Problematic JSON string:', match[1]);
        }
      }

      // Clean up the response by removing the commands
      cleanedResponse = cleanedResponse
        .replace(/\/create_note\s*\{[^}]+\}/g, '')
        .replace(/\/create_reminder\s*\{[^}]+\}/g, '')
        .trim();

      if (cleanedResponse === "") {
        const hasCommands = /\/create_(note|reminder)\s*\{[^}]+\}/.test(response);
        if (hasCommands) return "I've processed your request and created the requested items.";
        return response.trim() || "I'm not sure how to help with that.";
      }
    } catch (error) {
      console.error('Error in parseAIResponse:', error);
      return response || "I'm not sure how to help with that.";
    }

    return cleanedResponse;
  };

  const sendMessage = async () => {
    if (!input.trim() || !user || !activeConversation) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    // Focus the textarea after sending the message
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.select();
      }
    }, 100);

    try {
      // Save user message to Supabase
      const { data: userMsgData, error: insertError } = await supabase
        .from('messages')
        .insert({
          conversation_id: activeConversation,
          user_id: user.id,
          role: 'user',
          content: userMessage,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const formattedUserMessage = {
        id: userMsgData.id,
        role: userMsgData.role,
        content: userMsgData.content,
        created_at: userMsgData.created_at,
      };

      setMessages((prev) => [...prev, formattedUserMessage]);

      // Update conversation title if it's the first message
      if (messages.length === 0) {
        await supabase.from('conversations').update({ title: userMessage.slice(0, 50) }).eq('id', activeConversation);
        await loadConversations();
      }

      // Get user's notes and reminders for context from Supabase
      const { data: notesData } = await supabase.from('notes').select('*').eq('user_id', user.id);
      const userNotes = notesData || [];
      const { data: remindersData } = await supabase.from('reminders').select('*').eq('user_id', user.id);
      const userReminders = remindersData || [];

      // Extract document content for AI context
      let documentContents = '';
      for (const note of userNotes) {
        if (note.attachments && note.attachments.length > 0) {
          for (const attachment of note.attachments) {
            // Validate attachment before processing
            if (!attachment || !attachment.data || !attachment.type) {
              console.warn('Skipping invalid attachment:', attachment);
              continue;
            }
            
            try {
              const result = await extractDocumentContentForAI(attachment);
              if (result.content) {
                documentContents += `\n\nDocument Content from "${attachment.name}":\n${result.content.substring(0, 1000)}${result.content.length > 1000 ? '...' : ''}`;
              }
            } catch (error) {
              console.error(`Error extracting content from ${attachment.name}:`, error);
              // Continue with other attachments even if one fails
            }
          }
        }
      }

      // Format notes and reminders for the AI context
      const notesContext = userNotes.length > 0 
        ? `\n\nUser's Notes:\n${userNotes.map((note: any) => {
            // Include note attachments in the context
            const attachmentsInfo = note.attachments && note.attachments.length > 0
              ? `\n    Attachments: ${note.attachments.map((att: any) => `${att.name} (${(att.size/1024).toFixed(1)}KB)`).join(', ')}`
              : '';
            
            return `- ${note.title}: ${note.content.substring(0, 200)}${note.content.length > 200 ? '...' : ''}${attachmentsInfo}`;
          }).join('\n')}`
        : '';

      const remindersContext = userReminders.length > 0
        ? `\n\nUser's Reminders:\n${userReminders.map((reminder: any) => 
            `- ${reminder.title} (${reminder.reminder_type}) - Due: ${new Date(reminder.due_date).toLocaleString()}`
          ).join('\n')}`
        : '';

      // Prepare messages for the Groq API with context
      const groqMessages: ChatCompletionMessageParam[] = [
        { 
          role: "system", 
          content: `You are KYNEX.dev, a helpful AI assistant with long-term memory. You have access to the user's conversation history, notes, reminders, and document contents. Provide concise, helpful responses.\n\nYou can read and analyze the contents of documents attached to notes. When discussing documents, you can reference their content, summarize them, and answer questions about them.\n\nYou can create notes and reminders for the user, BUT ONLY when explicitly requested by the user or when it's clearly beneficial to save important information for future reference.\n\nTo create a note: /create_note{"title":"Note Title","content":"Note content","tags":["tag1","tag2"],"folder":"General"}\n\nTo create a reminder: /create_reminder{"title":"Reminder Title","description":"Reminder description","type":"personal","due_date":"2025-12-31T10:00:00.000Z","recurring":false}\n\nExamples of when to create notes:\n- User asks to "save this information" or "remember this"\n- User provides important details they might need later\n- User asks to create a note or document\n\nExamples of when NOT to create notes:\n- Answering general questions\n- Providing explanations or instructions\n- Having a conversation\n\nThese commands will be automatically processed and the items will be created. Do not mention these commands in your response to the user.\n\nDocument Contents:${documentContents}\n\nContext Information:${notesContext}${remindersContext}` 
        },
        ...messages.map(msg => ({ role: msg.role as "user" | "assistant", content: msg.content })),
        { role: "user", content: userMessage }
      ];

      try {
        const aiResponse = await getGroqChatCompletion(groqMessages);
        console.log('AI Response:', aiResponse); // Debug log to see what the AI is returning

        // Parse the AI response for note/reminder creation commands
        const cleanedResponse = await parseAIResponse(aiResponse);
        console.log('Cleaned Response:', cleanedResponse); // Debug log to see the cleaned response
        
        // Additional debug log to see if note creation commands are present
        if (aiResponse && aiResponse.includes('/create_note')) {
          console.log('Note creation command detected in AI response');
        }
        
        // Fallback: Check if the AI response contains note-like content
        // DISABLED: Automatic note creation based on AI response content
        // This feature was causing unwanted note creation
        // Completely removed this feature to prevent unwanted note creation

        // Save AI response to Supabase (without the commands)
        const { data: aiMsgData, error: aiInsertError } = await supabase
          .from('messages')
          .insert({
            conversation_id: activeConversation,
            user_id: user.id,
            role: 'assistant',
            content: cleanedResponse,
          })
          .select()
          .single();

        if (aiInsertError) throw aiInsertError;

        const formattedAiMessage = {
          id: aiMsgData.id,
          role: aiMsgData.role,
          content: aiMsgData.content,
          created_at: aiMsgData.created_at,
        };

        setMessages((prev) => [...prev, formattedAiMessage]);

        // Update conversation timestamp
        await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeConversation);
      } catch (error) {
        console.error("Error getting AI response:", error);
        
        // Fallback response in case of API error
        const fallbackResponse = "I'm having trouble connecting to the AI service right now. Please try again later.";
        
        const { data: fallbackAiMsg, error: fallbackError } = await supabase
          .from('messages')
          .insert({
            conversation_id: activeConversation,
            user_id: user.id,
            role: 'assistant',
            content: fallbackResponse,
          })
          .select()
          .single();

        if (fallbackError) console.error('Error inserting fallback message:', fallbackError);

        if (fallbackAiMsg) {
          const formattedAiMessage = {
            id: fallbackAiMsg.id,
            role: fallbackAiMsg.role,
            content: fallbackAiMsg.content,
            created_at: fallbackAiMsg.created_at,
          };
          setMessages((prev) => [...prev, formattedAiMessage]);
        }

        await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeConversation);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }

    setLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // On mobile, allow Shift+Enter for new line and Enter to send
    if (e.key === 'Enter') {
      // If Shift is pressed, allow default behavior (new line)
      if (e.shiftKey) {
        return; // Do nothing, let it create a new line
      }
      
      // On mobile devices, we want Enter to send the message
      // On desktop, we also want Enter to send the message
      e.preventDefault();
      sendMessage();
    }
  };

  const copyDisclaimer = () => {
    navigator.clipboard.writeText('AI Assistant can make mistakes');
  };

  const copyConversation = (conversationId: string) => {
    // In a real implementation, this would copy the conversation content
    // For now, we'll just show an alert
    alert(`Copied conversation ${conversationId} to clipboard`);
    // TODO: Implement actual copy functionality
  };

  return (
    <div className="flex h-screen w-screen max-w-full bg-slate-900 relative overflow-hidden">
  {/* Sidebar for conversations - hidden on mobile by default */}
  <div className={`conversation-sidebar w-56 bg-slate-800 backdrop-blur-sm border-r border-slate-700 flex flex-col md:sticky md:top-0 md:z-30 ${isMobileSidebarOpen ? 'fixed top-22 left-0 bottom-0 z-25 block' : 'hidden'} md:block overflow-y-auto`}>
        <div className="p-3 space-y-2 border-b border-slate-700 pt-3">
          <div className="mb-3">
            <h1 className="text-3xl font-bold text-white">Conversations</h1>
            <p className="text-slate-400 text-xs">Chat with KYNEX.dev AI Assistant</p>
          </div>
          <button
            onClick={createNewConversation}
            className="w-full flex items-center justify-center gap-1.5 bg-cyan-500 hover:bg-cyan-600 text-white font-medium py-2 px-3 rounded-lg transition-colors text-sm"
          >
            <span>New Chat</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                activeConversation === conversation.id
                  ? 'bg-cyan-500/10 text-white'
                  : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
              }`}
              onClick={(e) => {
                // Don't trigger this if we're clicking on the dropdown button or menu
                const target = e.target as Element;
                if (!target.closest('.conversation-dropdown-button') && 
                    !target.closest('.conversation-dropdown')) {
                  if (editingConversationId !== conversation.id) {
                    setActiveConversation(conversation.id);
                    // Close mobile sidebar when a conversation is selected
                    if (window.innerWidth < 768) {
                      setIsMobileSidebarOpen(false);
                    }
                  }
                }
              }}
            >
              {editingConversationId === conversation.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={editConversationTitle}
                    onChange={(e) => setEditConversationTitle(e.target.value)}
                    className="flex-1 bg-slate-700 text-white rounded px-2 py-1 text-sm"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      saveConversationTitle(conversation.id);
                    }}
                    className="p-1 text-green-400 hover:bg-green-500/20 rounded"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      cancelEditingConversation();
                    }}
                    className="p-1 text-slate-400 hover:bg-slate-600 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="truncate flex-1">{conversation.title}</div>
                  {/* Mobile-friendly dropdown menu for smaller screens */}
                  <div className="relative">
                    <button
                      ref={(el) => {
                        // Store reference to calculate position when needed
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('3 dots clicked for conversation:', conversation.id);
                        
                        // Calculate dropdown position to align with the right side of the dots
                        const rect = e.currentTarget.getBoundingClientRect();
                        
                        // Position dropdown differently for desktop and mobile
                        let top, right;
                        if (window.innerWidth >= 768) {
                          // Desktop mode: Position dropdown below the 3 dots button
                          top = rect.bottom + 4; // 4px spacing below the button
                          right = 20; // Full right of the screen
                        } else {
                          // Mobile mode: Position dropdown above the 3 dots button
                          top = rect.top - 4 - 128 + 70; // Moved down by 40px
                          right = 20; // Full right of the screen
                        }
                        
                        // Update position state
                        setDropdownPosition({ top, right });
                        
                        // Toggle dropdown menu for this conversation
                        setMobileMenuOpen(prev => {
                          const newState = {
                            ...prev,
                            [conversation.id]: !prev[conversation.id]
                          };
                          console.log('New mobileMenuOpen state:', newState);
                          return newState;
                        });
                      }}
                      className="conversation-dropdown-button p-1 text-slate-400 hover:text-white hover:bg-slate-600 rounded"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 12h.01M12 12h.01M19 12h.01" />
                      </svg>
                    </button>
                    {/* Dropdown menu */}
                    {mobileMenuOpen[conversation.id] && (
                      <div 
                        className="conversation-dropdown fixed bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50 w-32"
                        style={{ 
                          top: `${dropdownPosition.top}px`,
                          right: `${dropdownPosition.right}px`
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Dropdown menu clicked, not closing');
                        }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('Rename clicked for conversation:', conversation.id);
                            startEditingConversation(conversation);
                            // Add a small delay to ensure the DOM is updated before closing the menu
                            setTimeout(() => {
                              setMobileMenuOpen(prev => ({ ...prev, [conversation.id]: false }));
                            }, 10);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2"
                        >
                          <Edit2 className="w-4 h-4 text-cyan-400" />
                          Rename
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('Copy clicked for conversation:', conversation.id);
                            copyConversation(conversation.id);
                            // Add a small delay to ensure the DOM is updated before closing the menu
                            setTimeout(() => {
                              setMobileMenuOpen(prev => ({ ...prev, [conversation.id]: false }));
                            }, 10);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('Delete clicked for conversation:', conversation.id);
                            if (window.confirm('Are you sure you want to delete this conversation?')) {
                              deleteConversation(conversation.id);
                            }
                            // Add a small delay to ensure the DOM is updated before closing the menu
                            setTimeout(() => {
                              setMobileMenuOpen(prev => ({ ...prev, [conversation.id]: false }));
                            }, 10);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-slate-700 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile backdrop - closes sidebar when clicking outside (only on small screens) */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed top-22 left-0 w-56 bottom-0 bg-black/50 z-15 md:hidden"
        />
      )}

      <div className="flex-1 flex flex-col pt-0 overflow-hidden md:pt-0 relative z-20 w-full max-w-full">
        {activeConversation ? (
          <>
            {/* Toggle button below the main logo header - fixed position */}
            <div className="border-b border-slate-700 p-1 flex items-center justify-between bg-slate-800/80 backdrop-blur-sm z-25 fixed top-12 left-0 w-full md:hidden">
              <button
                onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                className="p-1.5 text-slate-400 hover:text-white flex items-center gap-1.5"
              >
                {/* Custom animated hamburger to X toggle */}
                <div className="relative w-4 h-4 flex items-center justify-center">
                  <span className={`absolute h-0.5 w-4 bg-white rounded transition-transform duration-300 ease-in-out ${isMobileSidebarOpen ? 'rotate-45 translate-y-0' : '-translate-y-1'}`}></span>
                  <span className={`absolute h-0.5 w-4 bg-white rounded transition-opacity duration-300 ease-in-out ${isMobileSidebarOpen ? 'opacity-0' : 'opacity-100'}`}></span>
                  <span className={`absolute h-0.5 w-4 bg-white rounded transition-transform duration-300 ease-in-out ${isMobileSidebarOpen ? '-rotate-45 translate-y-0' : 'translate-y-1'}`}></span>
                </div>
                <span className="text-white text-sm font-medium">Conversations</span>
              </button>
              <div></div>
            </div>

            {/* Chat messages container - scrolls independently; add top padding so messages don't go under fixed headers on mobile */}
            <div className="flex-1 overflow-y-auto pb-28 pt-16 md:pt-0 md:ml-0 w-full max-w-full">
              <div className="max-w-3xl mx-auto md:mx-auto space-y-3 w-full px-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0 w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                        message.role === 'user'
                          ? 'bg-cyan-500 text-white rounded-tr-none'
                          : 'bg-slate-800 text-white rounded-tl-none'
                      }`}
                    >
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
                                <div className="relative w-full my-2">
                                  <pre className="bg-[#1e1e2e] text-[#a6e3a1] rounded-lg p-3 overflow-x-auto max-w-full leading-relaxed">
                                    <code className="font-mono text-sm whitespace-pre block max-w-full" {...props}>
                                      {children}
                                    </code>
                                  </pre>
                                  <button
                                    className="absolute top-2 right-2 z-10 bg-slate-700 hover:bg-slate-600 text-white p-1 px-2 rounded text-xs transition-all duration-150 active:scale-95"
                                    onClick={() => {
                                      navigator.clipboard.writeText(String(children));
                                      // Set copied state for this code block
                                      setCopiedCodeBlocks(prev => ({ ...prev, [codeKey]: true }));
                                      // Reset after 3 seconds
                                      setTimeout(() => {
                                        setCopiedCodeBlocks(prev => ({ ...prev, [codeKey]: false }));
                                      }, 3000);
                                    }}
                                  >
                                    {copiedCodeBlocks[codeKey] ? 'Copied!' : 'Copy'}
                                  </button>
                                </div>
                              );
                            }
                            return (
                              <code className="bg-[#313244] text-[#cdd6f4] rounded px-2 py-1 text-sm font-mono inline" {...props}>
                                {children}
                              </code>
                            );
                          },
                          pre: ({ node, children, ...props }) => (
                            <div className="relative w-full my-2">
                              <pre className="bg-[#1e1e2e] text-[#cdd6f4] rounded-lg p-3 overflow-x-auto max-w-full leading-relaxed" {...props}>
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
                    {message.role === 'user' && (
                      <div className="flex-shrink-0 w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                ))}
                {loading && (messages.length === 0 || messages[messages.length - 1].role !== 'assistant') && (
                  <div className="flex gap-2 justify-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
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
            <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-slate-800/90 backdrop-blur-md border-t border-slate-700 z-40">
              <div className="max-w-3xl w-full mx-auto px-4 py-2">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      adjustTextareaHeight();
                    }}
                    onKeyDown={handleKeyPress}
                    placeholder="Type your message..."
                    className="flex-1 bg-slate-900/90 border border-slate-700 rounded-xl py-3 px-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none md:scrollbar-hide scrollbar-hide"
                    rows={1}
                    disabled={loading}
                    autoFocus
                    onFocus={(e) => e.target.select()}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={loading || !input.trim()}
                    className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all flex items-center justify-center h-12"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Error display */}
                {error && (
                  <div className="text-center text-sm text-red-400 py-2 px-4 mb-2 bg-red-500/10 rounded-lg">
                    {error}
                  </div>
                )}
                
                {/* Disclaimer */}
                <div className="text-center text-xs text-slate-400 py-1.5">
                  AI Assistant can make mistakes
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-4 mt-16 md:mt-0 mb-0 md:mb-0 bg-slate-900 w-full">
            <div className="bg-cyan-500/10 p-3 rounded-2xl mb-3">
              <Bot className="w-10 h-10 text-cyan-400" />
            </div>
            <p className="text-slate-400 text-center max-w-xs mb-5">
              Your personal AI workspace with long-term memory. Start a new conversation to begin.
            </p>
            <button
              onClick={createNewConversation}
              className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white font-medium py-2 px-5 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Start New Conversation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Chat;