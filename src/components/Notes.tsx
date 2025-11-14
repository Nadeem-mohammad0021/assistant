'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Plus, Trash2, Edit2, Save, X, Search, Tag, Paperclip, FileText, Download, BookOpen } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useVirtualizer } from '@tanstack/react-virtual';

interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[];
  folder: string;
  created_at: string;
  updated_at: string;
  attachments?: NoteAttachment[];
}

interface NoteAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string; // Base64 encoded data
  uploaded_at: string;
}

export function Notes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFolder, setActiveFolder] = useState('General');
  
  const parentRef = useRef<HTMLDivElement>(null);
  
  const rowVirtualizer = useVirtualizer({
    count: filteredNotes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72, // Estimated height of each note item
    overscan: 5
  });
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editFolder, setEditFolder] = useState('General');
  const [editAttachments, setEditAttachments] = useState<NoteAttachment[]>([]);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteTitle, setEditNoteTitle] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<{[key: string]: boolean}>({});
  const [dropdownPosition, setDropdownPosition] = useState<{top: number, right: number}>({top: 0, right: 0});
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draggedNote, setDraggedNote] = useState<Note | null>(null);

  // Close mobile menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Check if the click was inside any dropdown menu by using a more reliable method
      const target = e.target as Node;
      const dropdownButtons = document.querySelectorAll('.note-dropdown-button');
      const dropdownMenus = document.querySelectorAll('.note-dropdown');
      
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
      setNotes([...notes]);
    };
    
    window.addEventListener('resize', updateDropdownPosition);
    return () => window.removeEventListener('resize', updateDropdownPosition);
  }, [notes]);

  // Handle mobile menu toggle
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        // On desktop, always hide the mobile sidebar
        setIsMobileSidebarOpen(false);
      } else {
        // On mobile, if no note is selected, show the sidebar
        if (!selectedNote) {
          setIsMobileSidebarOpen(true);
        }
        // If a note is selected, we don't automatically change the state
        // This allows the user's toggle preference to be respected
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Call on initial load

    return () => window.removeEventListener('resize', handleResize);
  }, [selectedNote]);

  // Ensure sidebar is visible on initial load if there are notes
  useEffect(() => {
    if (window.innerWidth < 768 && notes.length > 0 && !selectedNote) {
      setIsMobileSidebarOpen(true);
    }
  }, [notes.length, selectedNote]);

  const loadNotes = useCallback(async () => {
    if (!user) return;
    try {
      console.log('Loading notes for user:', user.id); // Debug log
      const { data: notesData, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      const notesList = notesData ?? [];
      console.log('Loaded notes:', notesList); // Debug log
      console.log('Number of notes loaded:', notesList.length); // Debug log
      setNotes(notesList);
      setFilteredNotes(notesList.filter(note => note.folder === activeFolder));
      
      // Show confirmation
      console.log('Notes loaded successfully');
      
      // Close mobile sidebar when notes are loaded
      if (window.innerWidth < 768 && notesList.length > 0) {
        setIsMobileSidebarOpen(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load notes';
      console.error('Error loading notes:', message);
      setError(message);
      setNotes([]);
      setFilteredNotes([]);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadNotes();
    }
    
    // Listen for note creation events from the AI
    const handleNoteCreated = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('Note created event received in Notes component:', customEvent.detail);
      // Reload notes to show the newly created note
      loadNotes();
      
      // Also show an alert to confirm the note was created
      alert('Note created successfully!');
    };
    
    // Listen for manual Supabase realtime events
    const handleSupabaseRealtime = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('Manual Supabase realtime event received:', customEvent.detail);
      
      if (customEvent.detail && customEvent.detail.eventType) {
        const newRecord = customEvent.detail.new;
        
        // Check if it's a note and belongs to the current user
        if (newRecord && newRecord.user_id === user?.id && newRecord.title) {
          console.log('Processing manual event:', customEvent.detail.eventType, 'for note:', newRecord);
          
          if (customEvent.detail.eventType === 'INSERT') {
            // Format the new note to match our Note interface
            const formattedNote: Note = {
              id: newRecord.id || `note-${Date.now()}`,
              user_id: newRecord.user_id,
              title: newRecord.title,
              content: newRecord.content || '',
              tags: Array.isArray(newRecord.tags) ? newRecord.tags : [],
              folder: newRecord.folder || 'General',
              created_at: newRecord.created_at || new Date().toISOString(),
              updated_at: newRecord.updated_at || new Date().toISOString(),
              attachments: Array.isArray(newRecord.attachments) ? newRecord.attachments : []
            };
            
            // Add the new note to the list
            setNotes((prev) => [formattedNote, ...prev]);
            setFilteredNotes((prev) => [formattedNote, ...prev]);
            
            // Automatically select the newly created note
            setSelectedNote(formattedNote);
            
            console.log('New note added to state successfully');
            
            // Show confirmation
            console.log('Note created and added to UI successfully');
          } else if (customEvent.detail.eventType === 'UPDATE') {
            // Format the updated note to match our Note interface
            const formattedNote: Note = {
              id: newRecord.id,
              user_id: newRecord.user_id,
              title: newRecord.title,
              content: newRecord.content || '',
              tags: Array.isArray(newRecord.tags) ? newRecord.tags : [],
              folder: newRecord.folder || 'General',
              created_at: newRecord.created_at || new Date().toISOString(),
              updated_at: newRecord.updated_at || new Date().toISOString(),
              attachments: Array.isArray(newRecord.attachments) ? newRecord.attachments : []
            };
            
            // Update the note in the list
            setNotes((prev) => prev.map(note => note.id === formattedNote.id ? formattedNote : note));
            setFilteredNotes((prev) => prev.map(note => note.id === formattedNote.id ? formattedNote : note));
            
            // Update the selected note if it's the one being updated
            if (selectedNote && selectedNote.id === formattedNote.id) {
              setSelectedNote(formattedNote);
            }
            
            console.log('Note updated in state successfully');
            
            // Show confirmation
            console.log('Note updated successfully');
          }
          
          // Close mobile sidebar when a new note is added
          if (window.innerWidth < 768) {
            setIsMobileSidebarOpen(false);
          }
        } else {
          console.log('Note validation failed - user_id match:', newRecord && newRecord.user_id === user?.id, 'has title:', newRecord && newRecord.title);
        }
      } else {
        console.log('Invalid event format or missing eventType');
      }
    };
    
    window.addEventListener('noteCreated', handleNoteCreated);
    window.addEventListener('supabase:realtime', handleSupabaseRealtime);
    console.log('NoteCreated and Supabase realtime event listeners added in Notes component'); // Debug log
    
    // Set up realtime listener for Supabase changes
    let channel: any;
    if (user) {
      channel = supabase
        .channel('notes-changes')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notes' },
          (payload) => {
            console.log('Realtime note insert detected:', payload.new);
            // Add the new note to the list only if it belongs to the current user
            const newNote = payload.new as Note & { user_id: string };
            if (user && newNote.user_id === user.id) {
              console.log('Adding realtime note to state:', newNote);
              setNotes((prev) => [newNote, ...prev]);
              setFilteredNotes((prev) => [newNote, ...prev]);
              // Automatically select the newly created note
              setSelectedNote(newNote);
              console.log('Realtime note added to state successfully');
              
              // Show confirmation
              console.log('Note inserted via Supabase realtime successfully');
              
              // Close mobile sidebar when a new note is added
              if (window.innerWidth < 768) {
                setIsMobileSidebarOpen(false);
              }
            } else {
              console.log('Realtime note rejected - user_id match:', user && newNote.user_id === user.id);
              // If this is for a different user, we might want to refresh the notes list
              // to ensure we're showing the correct notes for the current user
              loadNotes();
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'notes' },
          (payload) => {
            console.log('Realtime note update detected:', payload.new);
            // Update the note in the list only if it belongs to the current user
            const updatedNote = payload.new as Note & { user_id: string };
            if (user && updatedNote.user_id === user.id) {
              console.log('Updating realtime note in state:', updatedNote);
              setNotes((prev) => prev.map(note => note.id === updatedNote.id ? updatedNote : note));
              setFilteredNotes((prev) => prev.map(note => note.id === updatedNote.id ? updatedNote : note));
              
              // Update the selected note if it's the one being updated
              if (selectedNote && selectedNote.id === updatedNote.id) {
                setSelectedNote(updatedNote);
              }
              
              console.log('Realtime note updated in state successfully');
              
              // Show confirmation
              console.log('Note updated via Supabase realtime successfully');
            } else {
              console.log('Realtime note update rejected - user_id match:', user && updatedNote.user_id === user.id);
              // If this is for a different user, we might want to refresh the notes list
              // to ensure we're showing the correct notes for the current user
              loadNotes();
            }
          }
        )
        .subscribe((status) => {
          console.log('Supabase realtime subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to notes changes');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Error subscribing to notes changes');
          } else if (status === 'CLOSED') {
            console.log('Closed subscription to notes changes');
          }
        });
    }
    
    // Also set up an interval to periodically check for new notes as a fallback
    const interval = setInterval(() => {
      if (user) {
        console.log('Periodic note refresh triggered');
        loadNotes();
      }
    }, 30000); // Check every 30 seconds
    
    return () => {
      window.removeEventListener('noteCreated', handleNoteCreated);
      window.removeEventListener('supabase:realtime', handleSupabaseRealtime);
      console.log('NoteCreated and Supabase realtime event listeners removed in Notes component'); // Debug log
      if (channel) {
        supabase.removeChannel(channel);
      }
      clearInterval(interval);
    };
  }, [user, loadNotes]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredNotes(
        notes.filter(
          (note) =>
            note.folder === activeFolder &&
            (note.title.toLowerCase().includes(query) ||
            note.content.toLowerCase().includes(query) ||
            note.tags.some((tag) => tag.toLowerCase().includes(query)))
        )
      );
    } else {
      setFilteredNotes(notes.filter(note => note.folder === activeFolder));
    }
  }, [searchQuery, notes, activeFolder]);

  const createNewNote = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title: 'Untitled Note',
          content: '',
          tags: [],
          folder: 'General',
          attachments: [],
        })
        .select();
      if (error) {
        console.error('Error creating note:', error.message || error);
        alert('Failed to create note. Please try again.');
        return;
      }
      if (!data || !data[0]) {
        console.error('No data returned from note creation');
        alert('Failed to create note. Please try again.');
        return;
      }
      const newNote = data[0];
      setNotes([newNote, ...notes]);
      setFilteredNotes([newNote, ...filteredNotes]);
      setSelectedNote(newNote);
      setIsEditing(true);
      setEditTitle(newNote.title);
      setEditContent(newNote.content);
      setEditTags('');
      setEditFolder(newNote.folder);
      setEditAttachments([]);
      // Close mobile sidebar when a new note is created
      if (window.innerWidth < 768) {
        setIsMobileSidebarOpen(false);
      }
    } catch (error) {
      console.error('Error creating note:', error instanceof Error ? error.message : error);
      alert('Failed to create note. Please try again.');
      setIsEditing(false); // Reset editing state on error
    }
  };

  const deleteNote = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setNotes(notes.filter((n) => n.id !== id));
      if (selectedNote?.id === id) {
        setSelectedNote(null);
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const startEditing = (note: Note) => {
    setSelectedNote(note);
    setIsEditing(true);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditTags(note.tags.join(', '));
    setEditFolder(note.folder);
    setEditAttachments(note.attachments || []); // Load existing attachments
    
    // Close mobile sidebar when a note is selected
    if (window.innerWidth < 768) {
      setIsMobileSidebarOpen(false);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    if (selectedNote && !selectedNote.content) {
      deleteNote(selectedNote.id);
      setSelectedNote(null);
    }
  };

  // Function to handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      // Check file type
      if (!file.type.includes('pdf') && !file.type.includes('document') && !file.type.includes('text')) {
        alert('Please upload only PDF or document files');
        return;
      }

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (!event.target?.result) return;
        
        const newAttachment: NoteAttachment = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          type: file.type,
          size: file.size,
          data: event.target.result as string,
          uploaded_at: new Date().toISOString()
        };
        
        setEditAttachments(prev => [...prev, newAttachment]);
      };
      
      reader.readAsDataURL(file);
    });
    
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Function to remove an attachment
  const removeAttachment = (id: string) => {
    setEditAttachments(prev => prev.filter(attachment => attachment.id !== id));
  };

  // Function to open an attachment in a new tab
  const openAttachment = (attachment: NoteAttachment) => {
    try {
      // Validate attachment data
      if (!attachment || !attachment.data) {
        console.error('Invalid attachment data');
        alert('Unable to open file: Invalid attachment data');
        return;
      }
      
      // For security reasons, we need to create a Blob and object URL for the data
      // Extract the base64 data part
      const base64Data = attachment.data.split(',')[1];
      if (!base64Data) {
        console.error('Invalid base64 data in attachment');
        alert('Unable to open file: Invalid file data');
        return;
      }
      
      // Convert base64 to binary
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Create blob
      const blob = new Blob([bytes], { type: attachment.type });
      
      // Create object URL
      const objectUrl = URL.createObjectURL(blob);
      
      // Open in new tab
      const newWindow = window.open(objectUrl, '_blank');
      
      // Clean up the object URL after a delay
      setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 1000);
      
      if (!newWindow) {
        alert('Unable to open file. Please check your popup blocker settings.');
      }
    } catch (error) {
      console.error('Error opening attachment:', error);
      alert('Unable to open file. Please try downloading instead.');
    }
  };

  // Function to download an attachment
  const downloadAttachment = (attachment: NoteAttachment) => {
    try {
      // Validate attachment data
      if (!attachment || !attachment.data) {
        console.error('Invalid attachment data');
        alert('Unable to download file: Invalid attachment data');
        return;
      }
      
      // For security reasons, we need to create a Blob and object URL for the data
      // Extract the base64 data part
      const base64Data = attachment.data.split(',')[1];
      if (!base64Data) {
        console.error('Invalid base64 data in attachment');
        alert('Unable to download file: Invalid file data');
        return;
      }
      
      // Convert base64 to binary
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Create blob
      const blob = new Blob([bytes], { type: attachment.type });
      
      // Create object URL
      const objectUrl = URL.createObjectURL(blob);
      
      // Create temporary link element
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = attachment.name;
      
      // Add to document, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the object URL after a delay
      setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 1000);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      alert('Unable to download file. Please try again.');
    }
  };

  const saveNote = async () => {
    if (!selectedNote || !user) return;
    try {
      const tags = editTags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      const { data, error } = await supabase
        .from('notes')
        .update({
          title: editTitle,
          content: editContent,
          tags,
          folder: editFolder,
          attachments: editAttachments
        })
        .eq('id', selectedNote.id)
        .select();
      if (error) {
        console.error('Error saving note:', error.message || error);
        alert('Failed to save note. Please try again.');
        return;
      }
      if (!data || !data[0]) {
        console.error('No data returned from note update');
        alert('Failed to save note. Please try again.');
        return;
      }
      // Dispatch a manual Supabase realtime event to ensure immediate visibility
      const noteEvent = new CustomEvent('supabase:realtime', {
        detail: {
          eventType: 'UPDATE',
          new: data[0]
        }
      });
      window.dispatchEvent(noteEvent);
      
      setIsEditing(false);
      setEditAttachments([]);
      
      // Show success message
      console.log('Note saved successfully');
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Failed to save note. Please try again.');
    }
  };

  const startEditingNoteTitle = (note: Note) => {
    setEditingNoteId(note.id);
    setEditNoteTitle(note.title);
  };

  const saveNoteTitle = async (noteId: string) => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('notes')
        .update({ title: editNoteTitle })
        .eq('id', noteId)
        .select();
      if (error) {
        console.error('Error updating note title:', error.message || error);
        alert('Failed to update note title. Please try again.');
        return;
      }
      if (!data || !data[0]) {
        console.error('No data returned from note title update');
        alert('Failed to update note title. Please try again.');
        return;
      }
      // Dispatch a manual Supabase realtime event to ensure immediate visibility
      const noteEvent = new CustomEvent('supabase:realtime', {
        detail: {
          eventType: 'UPDATE',
          new: data[0]
        }
      });
      window.dispatchEvent(noteEvent);
      
      setEditingNoteId(null);
      
      // Show success message
      console.log('Note title updated successfully');
    } catch (error) {
      console.error('Error updating note title:', error);
      alert('Failed to update note title. Please try again.');
    }
  };

  const cancelEditingNoteTitle = () => {
    setEditingNoteId(null);
  };

  return (
    <div className="flex h-screen w-screen max-w-full bg-slate-900 relative overflow-hidden">
      {/* Sidebar for notes - hidden on mobile by default */}
      <div className={`conversation-sidebar ${isMobileSidebarOpen ? 'block' : 'hidden'} md:block w-64 bg-slate-800 backdrop-blur-sm border-r border-slate-700 flex flex-col md:sticky md:top-0 md:z-30 fixed top-22 left-0 bottom-0 z-25 overflow-y-auto`}>
 
        <div className="p-3 space-y-2 border-b border-slate-700 pt-3">
          <div className="mb-3">
            <h1 className="text-3xl font-bold text-white">Notes</h1>
            <p className="text-slate-400 text-xs">Create and manage your notes</p>
          </div>
          <button
            onClick={createNewNote}
            className="w-full flex items-center justify-center gap-1.5 bg-cyan-500 hover:bg-cyan-600 text-white font-medium py-2 px-3 rounded-lg transition-colors text-sm"
          >
            <span>New Note</span>
          </button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Folder Tabs */}
          <div className="flex flex-wrap gap-1 mt-3">
            {['General', 'Personal', 'Work', 'Ideas'].map((folder) => (
              <button
                key={folder}
                onClick={() => setActiveFolder(folder)}
                className={`px-2 py-1 text-xs rounded ${
                  activeFolder === folder
                    ? 'bg-cyan-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {folder}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 max-h-[calc(100vh-200px)]"
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDraggedNote(null);
          }}
        >
          {filteredNotes.length > 0 ? (
            filteredNotes.map((note) => (
              <div
                key={note.id}
                draggable
                onDragStart={(e) => {
                  e.stopPropagation();
                  setDraggedNote(note);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                className={`group flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                  selectedNote?.id === note.id
                    ? 'bg-cyan-500/10 text-white'
                    : 'text-slate-300 hover:bg-slate-700/50'
                } ${draggedNote?.id === note.id ? 'opacity-50' : ''}`}
                onClick={(e) => {
                  // Don't trigger this if we're clicking on the dropdown button or menu
                  const target = e.target as Element;
                  if (!target.closest('.note-dropdown-button') && 
                      !target.closest('.note-dropdown')) {
                    if (editingNoteId !== note.id) {
                      setSelectedNote(note);
                      setIsEditing(false);
                      
                      // Close mobile sidebar when a note is selected
                      if (window.innerWidth < 768) {
                        setIsMobileSidebarOpen(false);
                      }
                    }
                  }
                }}
              >
                <div className="flex-1 min-w-0">
                  {editingNoteId === note.id ? (
                    <input
                      type="text"
                      value={editNoteTitle}
                      onChange={(e) => setEditNoteTitle(e.target.value)}
                      className="w-full bg-transparent text-white border-b border-cyan-500 focus:outline-none text-sm"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      <h3 className="font-medium text-white truncate text-sm">{note.title}</h3>
                      <p className="text-slate-400 text-xs mt-1 line-clamp-2">
                        {note.content.substring(0, 80)}
                        {note.content.length > 80 ? '...' : ''}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-slate-500 text-xs">
                          {new Date(note.updated_at).toLocaleDateString()}
                        </span>
                        {note.tags && note.tags.length > 0 && (
                          <div className="flex gap-1">
                            {note.tags.slice(0, 2).map((tag) => (
                              <span key={tag} className="text-slate-500 text-xs bg-slate-700/50 px-1.5 py-0.5 rounded">
                                {tag}
                              </span>
                            ))}
                            {note.tags.length > 2 && (
                              <span className="text-slate-500 text-xs bg-slate-700/50 px-1.5 py-0.5 rounded">
                                +{note.tags.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
                {/* Mobile-friendly dropdown menu for smaller screens */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('3 dots clicked for note:', note.id);
                      
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
                      
                      // Toggle dropdown menu for this note
                      setMobileMenuOpen(prev => {
                        const newState = {
                          ...prev,
                          [note.id]: !prev[note.id]
                        };
                        console.log('New mobileMenuOpen state:', newState);
                        return newState;
                      });
                    }}
                    className="note-dropdown-button p-1 text-slate-400 hover:text-white hover:bg-slate-600 rounded"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 12h.01M12 12h.01M19 12h.01" />
                    </svg>
                  </button>
                  {/* Dropdown menu */}
                  {mobileMenuOpen[note.id] && (
                    <div 
                      className="note-dropdown fixed bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50 w-32"
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
                          console.log('Rename clicked for note:', note.id);
                          startEditingNoteTitle(note);
                          // Add a small delay to ensure the DOM is updated before closing the menu
                          setTimeout(() => {
                            setMobileMenuOpen(prev => ({ ...prev, [note.id]: false }));
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
                          console.log('Delete clicked for note:', note.id);
                          if (window.confirm('Are you sure you want to delete this note?')) {
                            deleteNote(note.id);
                          }
                          // Add a small delay to ensure the DOM is updated before closing the menu
                          setTimeout(() => {
                            setMobileMenuOpen(prev => ({ ...prev, [note.id]: false }));
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
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-slate-400">
              <p>No notes in {activeFolder} folder</p>
              <p className="mt-2 text-slate-400 text-sm">
                Create your first note!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile backdrop - closes sidebar when clicking outside (only on small screens) */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed top-32 left-0 right-0 bottom-0 bg-black/50 z-15 md:hidden"
        />
      )}

      <div className="flex-1 flex flex-col pt-0 overflow-hidden md:pt-0 relative z-20 max-w-full">
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
            <span className="text-white text-sm font-medium">Notes</span>
          </button>
          <button
            onClick={isMobileSidebarOpen ? () => setIsMobileSidebarOpen(false) : createNewNote}
            className="p-1.5 text-cyan-400 hover:text-white flex items-center gap-1.5"
          >
            <span className="hidden md:inline text-sm">New Note</span>
          </button>
        </div>

        {selectedNote ? (
          <div className="flex-1 flex flex-col mt-16 md:mt-0 mb-0 pt-0 md:pt-0 overflow-hidden">
            {isEditing ? (
              <>
                <div className="border-b border-slate-700 p-4 flex items-center justify-between">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="text-xl font-bold bg-transparent text-white border-none focus:outline-none focus:ring-0"
                    placeholder="Note title"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={cancelEditing}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <button
                      onClick={saveNote}
                      className="p-2 text-cyan-400 hover:text-white hover:bg-cyan-500/20 rounded-lg transition-colors"
                    >
                      <Save className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="p-4 border-b border-slate-700 flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-400 mb-1">Folder</label>
                    <select
                      value={editFolder}
                      onChange={(e) => setEditFolder(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="General">General</option>
                      <option value="Personal">Personal</option>
                      <option value="Work">Work</option>
                      <option value="Ideas">Ideas</option>
                    </select>
                  </div>

                  <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-400 mb-1">Tags</label>
                    <input
                      type="text"
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      placeholder="tag1, tag2, tag3"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                <div className="flex-1 p-4 overflow-y-auto overflow-hidden">
                  <div className="flex-1 mb-4 overflow-hidden">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full h-full bg-transparent text-white border-none focus:outline-none resize-none overflow-y-auto"
                      placeholder="Start writing your note here..."
                    />
                  </div>
                  
                  {/* File Upload Section - Attachment List inside content area */}
                  <div 
                    className="border-t border-slate-700 pt-4"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        handleFileSelect({ target: { files: e.dataTransfer.files } } as any);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-slate-400">Attachments</label>
                      <div className="md:hidden"></div>
                    </div>
                    
                    {/* Attachment List */}
                    {editAttachments.length > 0 && (
                      <div className="grid grid-cols-1 gap-3">
                        {editAttachments.map((attachment) => (
                          <div 
                            key={attachment.id} 
                            className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-slate-600 hover:border-cyan-500/50 transition-colors cursor-pointer"
                            onClick={() => openAttachment(attachment)}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                                <FileText className="w-5 h-5 text-cyan-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium text-white truncate">{attachment.name}</div>
                                <div className="text-xs text-slate-400">
                                  {(attachment.size / 1024).toFixed(1)} KB
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-1 ml-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadAttachment(attachment);
                                }}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-600 rounded-lg transition-colors"
                                title="Download"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeAttachment(attachment.id);
                                }}
                                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Remove"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {editAttachments.length === 0 && (
                      <div 
                        className="text-center py-6 border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-cyan-500 transition-colors"
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                            handleFileSelect({ target: { files: e.dataTransfer.files } } as any);
                          }
                        }}
                      >
                        <Paperclip className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                        <p className="text-slate-500 text-sm">No files attached</p>
                        <p className="text-slate-600 text-xs mt-1">Upload PDFs, documents, or text files</p>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300 bg-slate-700/50 hover:bg-slate-700 rounded-lg px-4 py-2 mt-3 transition-colors mx-auto"
                        >
                          <Paperclip className="w-4 h-4" />
                          Add Files
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.txt,.rtf"
                    multiple
                    className="hidden"
                  />
                </div>
              </>
            ) : (
              <>

                <div className="border-b border-slate-700 p-4 flex items-center justify-between">
                  <h1 className="text-xl font-bold text-white">{selectedNote.title}</h1>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEditing(selectedNote)}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => deleteNote(selectedNote.id)}
                      className="p-2 text-slate-400 hover:text-white hover:bg-red-500/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="p-4 border-b border-slate-700 flex flex-col sm:flex-row gap-4">
                  <div>
                    <span className="text-sm font-medium text-slate-400">Folder</span>
                    <div className="mt-1 px-3 py-1 bg-slate-700/50 text-slate-300 rounded-lg">
                      {selectedNote.folder}
                    </div>
                  </div>

                  {selectedNote.tags.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-slate-400">Tags</span>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {selectedNote.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-lg"
                          >
                            <Tag className="w-4 h-4 inline mr-1" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex-1 p-4 overflow-y-auto">
                  <div className="prose prose-invert max-w-none mb-6">
                    {selectedNote.content ? (
                      <div className="whitespace-pre-wrap text-white">{selectedNote.content}</div>
                    ) : (
                      <p className="text-slate-500 italic">This note is empty.</p>
                    )}
                  </div>
                  
                  {/* Display Attachments in View Mode - Improved UI */}
                  {selectedNote.attachments && selectedNote.attachments.length > 0 && (
                    <div className="border-t border-slate-700 pt-6">
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Paperclip className="w-5 h-5 text-cyan-400" />
                        Attachments
                      </h3>
                      <div className="grid grid-cols-1 gap-3">
                        {selectedNote.attachments.map((attachment) => (
                          <div 
                            key={attachment.id} 
                            className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-slate-600 hover:border-cyan-500/50 transition-colors cursor-pointer"
                            onClick={() => openAttachment(attachment)}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                                <FileText className="w-5 h-5 text-cyan-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium text-white truncate">{attachment.name}</div>
                                <div className="text-xs text-slate-400">
                                  {(attachment.size / 1024).toFixed(1)} KB
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadAttachment(attachment);
                                }}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-600 rounded-lg transition-colors"
                                title="Download"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-4 mt-16 md:mt-0 mb-0 md:mb-0 bg-slate-900">
            <div className="bg-cyan-500/10 p-3 rounded-2xl mb-3">
              <BookOpen className="w-10 h-10 text-cyan-400" />
            </div>
            <p className="text-slate-400 text-center max-w-xs mb-5">
              Create your first note to get started.
            </p>
            <button
              onClick={createNewNote}
              className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white font-medium py-2 px-5 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Note
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Notes;
