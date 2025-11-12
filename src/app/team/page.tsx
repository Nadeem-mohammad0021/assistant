'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Users, LogIn, Search, MessageSquare, X, Edit3, Trash2, UserPlus, Link } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Team {
  id: string;
  name: string;
  description: string;
  created_at: string;
  owner_id: string; // User ID of the team owner
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function TeamPage() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<{[key: string]: TeamMember[]}>({});
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [joinTeamCode, setJoinTeamCode] = useState('');
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [isJoiningTeam, setIsJoiningTeam] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamDescription, setEditTeamDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [confirmation, setConfirmation] = useState<{title: string, message: string, onConfirm: () => void} | null>(null);
  const [teamRequireApproval, setTeamRequireApproval] = useState(false);
  const [pendingMembers, setPendingMembers] = useState<{[key: string]: TeamMember[]}>({});
  const [isLoading, setIsLoading] = useState(true);

  const isOwnerPresent = (team: Team) => {
    return !!team.owner_id;
  };

  const TeamSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-slate-800 rounded-lg p-6 border border-slate-700 animate-pulse">
          <div className="h-6 bg-slate-700 rounded w-3/4 mb-4" />
          <div className="h-4 bg-slate-700 rounded w-full mb-3" />
          <div className="h-4 bg-slate-700 rounded w-5/6 mb-4" />
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-slate-700 rounded-full" />
            <div className="h-4 bg-slate-700 rounded w-24" />
          </div>
        </div>
      ))}
    </div>
  );

  const getPendingMembersCount = async (teamId: string) => {
    // Schema does not include member approval status by default.
    // Return 0 for now. Implement if a 'status' column is added to team_members.
    return 0;
  };

  const approveMember = async (teamId: string, userId: string) => {
    if (!user) return;
    // Only owner can approve members
    const teamToApprove = teams.find(team => team.id === teamId);
    if (!teamToApprove) {
      showNotification('Team not found', 'error');
      return;
    }
    if (teamToApprove.owner_id !== user.id) {
      showNotification('Only team owners can approve members', 'error');
      return;
    }
    // Update member status in Supabase
    const { error } = await supabase
      .from('team_members')
      .update({ status: 'approved' })
      .eq('team_id', teamId)
      .eq('user_id', userId);
    if (error) {
      showNotification('Error approving member. Please try again.', 'error');
    } else {
      showNotification('Member approved successfully', 'success');
      // Optionally reload team members
    }
  };

  const rejectMember = async (teamId: string, userId: string) => {
    if (!user) return;
    const teamToReject = teams.find(team => team.id === teamId);
    if (!teamToReject) {
      showNotification('Team not found', 'error');
      return;
    }
    if (teamToReject.owner_id !== user.id) {
      showNotification('Only team owners can reject members', 'error');
      return;
    }
    // Remove member from Supabase
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .eq('status', 'pending');
    if (error) {
      showNotification('Error rejecting member. Please try again.', 'error');
    } else {
      showNotification('Member request rejected', 'success');
    }
  };

  // Load teams from localStorage on component mount and check for URL parameters
  useEffect(() => {
    if (user) {
      loadTeams();
    }
  }, [user]);

  // Notification timeout
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({message, type});
  };

  const showConfirmation = (title: string, message: string, onConfirm: () => void) => {
    setConfirmation({title, message, onConfirm});
  };

  const confirmAction = () => {
    if (confirmation && confirmation.onConfirm) {
      confirmation.onConfirm();
    }
    setConfirmation(null);
  };

  const cancelAction = () => {
    setConfirmation(null);
  };

  // Filter teams based on search query
  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredTeams(
        teams.filter(team => 
          team.name.toLowerCase().includes(query) || 
          team.description.toLowerCase().includes(query)
        )
      );
    } else {
      setFilteredTeams(teams);
    }
  }, [searchQuery, teams]);

  const loadTeams = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Try to get cached data first
      const cachedTeams = sessionStorage.getItem(`teams_${user.id}`);
      const cacheTimestamp = sessionStorage.getItem(`teams_timestamp_${user.id}`);
      
      // Use cache if it's less than 5 minutes old
      if (cachedTeams && cacheTimestamp) {
        const age = Date.now() - Number(cacheTimestamp);
        if (age < 5 * 60 * 1000) {
          const parsed = JSON.parse(cachedTeams);
          setTeams(parsed);
          setIsLoading(false);
          // Load fresh data in the background
          loadFreshTeamData();
          return;
        }
      }

      await loadFreshTeamData();
    } catch (error) {
      console.error('Error loading teams:', error);
      setNotification({
        type: 'error',
        message: 'Failed to load teams. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadFreshTeamData = async () => {
    try {
      // Parallel fetch for better performance
      const [membershipResponse, ownerTeamsResponse] = await Promise.all([
        supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', user!.id),
        supabase
          .from('teams')
          .select('*')
          .eq('owner_id', user!.id)
      ]);

      if (membershipResponse.error) throw membershipResponse.error;
      if (ownerTeamsResponse.error) throw ownerTeamsResponse.error;

      const teamIds = (membershipResponse.data || []).map((r: any) => r.team_id);
      const ownerTeams = ownerTeamsResponse.data || [];

      // Fetch member teams if there are any
      let memberTeams: any[] = [];
      if (teamIds.length > 0) {
        const { data: memberTeamsData, error: memberTeamsError } = await supabase
          .from('teams')
          .select('*')
          .in('id', teamIds);
        if (memberTeamsError) throw memberTeamsError;
        memberTeams = memberTeamsData || [];
      }

      // Merge and dedupe teams
      const combined = [...ownerTeams, ...memberTeams];
      const unique = combined.reduce((acc: Team[], team: Team) => {
        if (!acc.find((t) => t.id === team.id)) acc.push(team);
        return acc;
      }, [] as Team[]);

      // Cache the results
      sessionStorage.setItem(`teams_${user!.id}`, JSON.stringify(unique));
      sessionStorage.setItem(`teams_timestamp_${user!.id}`, Date.now().toString());

      setTeams(unique);

      // Load members for each team and populate teamMembers map
      const membersMap: {[key: string]: any[]} = {};
      for (const t of unique) {
        try {
          const { data: membersData, error: membersError } = await supabase
            .from('team_members')
            .select('user_id,role')
            .eq('team_id', t.id);
          if (membersError) {
            console.error('Error loading members for team', t.id, membersError);
            membersMap[t.id] = [];
          } else {
            membersMap[t.id] = membersData || [];
          }
        } catch (innerErr) {
          console.error('Error fetching team members:', innerErr);
          membersMap[t.id] = [];
        }
      }
      setTeamMembers(membersMap);
    } catch (err) {
      console.error('Error loading teams:', err instanceof Error ? err.message : err);
      setTeams([]);
      showNotification('Error loading teams', 'error');
    }
  };

  const generateInviteCode = () => {
    // Invite codes are not supported by the current DB schema.
    return '';
  };

  const createTeam = async () => {
    if (!teamName.trim() || !user) return;
    try {
      const { data, error } = await supabase
        .from('teams')
        .insert({
          name: teamName,
          description: teamDescription,
          owner_id: user.id,
        })
        .select()
        .single();

      if (error || !data) {
        console.error('Error creating team:', error);
        showNotification('Error creating team. Please try again.', 'error');
        return;
      }
      // Add creator as team member (owner)
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: data.id,
          user_id: user.id,
          role: 'owner',
        });
      if (memberError) console.error('Error adding owner to team_members:', memberError);
      setTeamName('');
      setTeamDescription('');
      setTeamRequireApproval(false);
      setIsCreatingTeam(false);
      showNotification(`Team "${teamName}" created successfully!`, 'success');
      await loadTeams();
    } catch (err) {
      console.error('Error creating team:', err instanceof Error ? err.message : err);
      showNotification('Error creating team. Please try again.', 'error');
    }
  };

  const joinTeam = async () => {
    if (!joinTeamCode.trim() || !user) return;
    // Allow joining by team id or full invite URL. If the user pastes the
    // full invite link (eg. https://.../team?code=<id>) extract the code
    // parameter so we can accept either form in the input.
    let codeRaw = joinTeamCode.trim();
    try {
      if (/^https?:\/\//i.test(codeRaw)) {
        // Full URL pasted
        try {
          const parsed = new URL(codeRaw);
          const codeParam = parsed.searchParams.get('code');
          if (codeParam && codeParam.trim()) codeRaw = codeParam.trim();
        } catch (err) {
          // ignore URL parse errors and fall back to regex below
        }
      } else {
        // Maybe user pasted the query string or a link without protocol
        const m = codeRaw.match(/[?&]code=([^&]+)/i);
        if (m && m[1]) {
          codeRaw = decodeURIComponent(m[1]);
        }
      }
    } catch (err) {
      console.error('Error parsing pasted invite link:', err);
    }

    // Final code value we will attempt to use as team id
    const code = codeRaw;
    try {
      // Check if already a member
      const { data: existing, error: existingError } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', code)
        .eq('user_id', user.id)
        .limit(1);
      if (existingError) {
        console.error('Error checking existing membership:', existingError);
      }
      if (existing && existing.length > 0) {
        showNotification('You are already a member of this team. Redirecting to chat...', 'info');
        window.location.href = `/team/chat?team=${code}`;
        return;
      }

      // Try to insert membership directly. If the team id is invalid the
      // foreign key constraint will cause an error (RLS prevents selecting
      // teams for non-members), so rely on the insert error to detect invalid
      // invite links.
      const { error: insertError } = await supabase
        .from('team_members')
        .insert({ team_id: code, user_id: user.id, role: 'member' });

      if (insertError) {
        // Handle common cases: foreign key violation (invalid team id)
        // or unique constraint (already member)
        const msg = String(insertError.message || insertError.details || '');
        if (msg.toLowerCase().includes('foreign key') || msg.toLowerCase().includes('violat')) {
          showNotification('Invalid invite link or team does not exist.', 'error');
        } else if (msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('duplicate')) {
          showNotification('You are already a member of this team. Redirecting to chat...', 'info');
          window.location.href = `/team/chat?team=${code}`;
        } else {
          console.error('Error joining team via invite link:', insertError);
          showNotification('Failed to join the team. Please try again.', 'error');
        }
      } else {
        showNotification('Successfully joined the team! Redirecting to chat...', 'success');
        // Refresh teams and redirect to chat
        await loadTeams();
        window.location.href = `/team/chat?team=${code}`;
      }
    } catch (err) {
      console.error('Error in joinTeam:', err);
      showNotification('Failed to join the team. Please try again.', 'error');
    } finally {
      setJoinTeamCode('');
      setIsJoiningTeam(false);
    }
  };

  // Join team if a ?code=... parameter is present in the URL (invite link)
  useEffect(() => {
    if (!user) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const codeParam = params.get('code');
      if (codeParam && codeParam.trim()) {
        // Attempt to join using the code from URL
        (async () => {
          // re-use join flow but avoid UI state collisions
          const code = codeParam.trim();
          try {
            // Check membership first
            const { data: existing, error: existingError } = await supabase
              .from('team_members')
              .select('*')
              .eq('team_id', code)
              .eq('user_id', user.id)
              .limit(1);
            if (existingError) {
              console.error('Error checking existing membership:', existingError);
            }
            if (existing && existing.length > 0) {
              showNotification('You are already a member of this team. Redirecting to chat...', 'info');
              window.location.href = `/team/chat?team=${code}`;
              return;
            }

            // Try to insert membership directly. RLS prevents selecting teams for
            // non-members, so rely on the insert result to determine validity.
            const { error: insertError } = await supabase
              .from('team_members')
              .insert({ team_id: code, user_id: user.id, role: 'member' });
            if (insertError) {
              const msg = String(insertError.message || insertError.details || '');
              if (msg.toLowerCase().includes('foreign key') || msg.toLowerCase().includes('violat')) {
                showNotification('Invalid invite link or team does not exist.', 'error');
                return;
              }
              if (msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('duplicate')) {
                showNotification('You are already a member of this team. Redirecting to chat...', 'info');
                window.location.href = `/team/chat?team=${code}`;
                return;
              }
              console.error('Error joining team via invite link:', insertError);
              showNotification('Failed to join the team. Please try again.', 'error');
              return;
            }

            showNotification('Successfully joined the team! Redirecting to chat...', 'success');
            await loadTeams();
            // Remove code param from URL to avoid repeated attempts
            const url = new URL(window.location.href);
            url.searchParams.delete('code');
            window.history.replaceState({}, '', url.toString());
            window.location.href = `/team/chat?team=${code}`;
          } catch (err) {
            console.error('Error handling invite code from URL:', err);
            showNotification('Failed to process invite link.', 'error');
          }
        })();
      }
    } catch (err) {
      console.error('Error reading URL params for invite code:', err);
    }
  }, [user]);

  const deleteTeam = async (teamId: string) => {
    if (!user) return;
    const teamToDelete = teams.find(team => team.id === teamId);
    if (!teamToDelete) {
      showNotification('Team not found', 'error');
      return;
    }
    if (teamToDelete.owner_id !== user.id) {
      showNotification('Only team owners can delete teams', 'error');
      return;
    }
    showConfirmation(
      `Delete "${teamToDelete.name}"?`,
      `Are you sure you want to delete the team "${teamToDelete.name}"? This action cannot be undone and all team data will be permanently lost.`,
      async () => {
        // Delete team from Supabase
        const { error } = await supabase
          .from('teams')
          .delete()
          .eq('id', teamId);
        if (error) {
          showNotification('Error deleting team. Please try again.', 'error');
        } else {
          showNotification(`Team "${teamToDelete.name}" has been deleted successfully.`, 'success');
          await loadTeams();
        }
      }
    );
  };

  const updateTeam = async () => {
    if (!editingTeamId || !editTeamName.trim() || !user) return;
    const teamToUpdate = teams.find(team => team.id === editingTeamId);
    if (!teamToUpdate) {
      showNotification('Team not found', 'error');
      return;
    }
    if (teamToUpdate.owner_id !== user.id) {
      showNotification('Only team owners can update teams', 'error');
      return;
    }
    const { error } = await supabase
      .from('teams')
      .update({
        name: editTeamName,
        description: editTeamDescription,
        // require_approval not supported in current schema
      })
      .eq('id', editingTeamId);
    if (error) {
      showNotification('Error updating team. Please try again.', 'error');
    } else {
      setEditingTeamId(null);
      setEditTeamName('');
      setEditTeamDescription('');
      setTeamRequireApproval(false);
      showNotification('Team updated successfully!', 'success');
      await loadTeams();
    }
  };

  const leaveTeam = async (teamId: string) => {
    if (!user) return;
    const teamToLeave = teams.find(team => team.id === teamId);
    if (!teamToLeave) {
      showNotification('Team not found', 'error');
      return;
    }
    if (teamToLeave.owner_id === user.id) {
      showNotification('Team owners cannot leave their own team. Please delete the team instead.', 'error');
      return;
    }
    showConfirmation(
      'Leave Team?',
      `Are you sure you want to leave the team "${teamToLeave.name}"? You will lose access to all team data and conversations.`,
      async () => {
        // Remove user from team_members in Supabase
        const { error } = await supabase
          .from('team_members')
          .delete()
          .eq('team_id', teamId)
          .eq('user_id', user.id);
        if (error) {
          showNotification('Error leaving team. Please try again.', 'error');
        } else {
          showNotification(`You have successfully left the team "${teamToLeave.name}".`, 'success');
          await loadTeams();
        }
      }
    );
  };

  const copyInviteLink = (inviteCode: string) => {
    const inviteLink = `${window.location.origin}/team?code=${inviteCode}`;
    navigator.clipboard.writeText(inviteLink);
    showNotification('Invite link copied to clipboard!', 'success');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-cyan-500/10 p-4 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-6">
            <LogIn className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Team Access Required</h1>
          <p className="text-slate-400 mb-8">
            Please sign in to access team features and collaborate with others.
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
    <div className="min-h-screen bg-slate-900">
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
          notification.type === 'success' ? 'bg-green-500' : 
          notification.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
        } text-white`}>
          <div className="flex items-center">
            <span>{notification.message}</span>
            <button 
              onClick={() => setNotification(null)}
              className="ml-4 text-white hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-white mb-2">{confirmation.title}</h3>
            <p className="text-slate-300 mb-6">{confirmation.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelAction}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto w-full p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Teams</h1>
            <p className="text-slate-400">Collaborate with others in shared workspaces</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search teams..."
                className="pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 w-full md:w-auto"
              />
            </div>
            <button
              onClick={() => setIsJoiningTeam(true)}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Join Team</span>
            </button>
            <button
              onClick={() => setIsCreatingTeam(true)}
              className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Create Team</span>
            </button>
          </div>
        </div>

        {isCreatingTeam && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Create New Team</h2>
              <button 
                onClick={() => {
                  setIsCreatingTeam(false);
                  setTeamName('');
                  setTeamDescription('');
                  setTeamRequireApproval(false);
                }}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Team Name</label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="Enter team name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Description</label>
                <textarea
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="Describe your team (optional)"
                  rows={3}
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="requireApproval"
                  checked={teamRequireApproval}
                  onChange={(e) => setTeamRequireApproval(e.target.checked)}
                  className="w-4 h-4 text-cyan-500 bg-slate-700 border-slate-600 rounded focus:ring-cyan-500"
                />
                <label htmlFor="requireApproval" className="ml-2 text-sm text-slate-300">
                  Require approval for new members
                </label>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={createTeam}
                  disabled={!teamName.trim()}
                  className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  Create Team
                </button>
                <button
                  onClick={() => {
                    setIsCreatingTeam(false);
                    setTeamName('');
                    setTeamDescription('');
                    setTeamRequireApproval(false);
                  }}
                  className="bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {isJoiningTeam && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Join Existing Team</h2>
              <button 
                onClick={() => {
                  setIsJoiningTeam(false);
                  setJoinTeamCode('');
                }}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Team Code or Invite Link</label>
                <input
                  type="text"
                  value={joinTeamCode}
                  onChange={(e) => setJoinTeamCode(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="Enter team code or paste invite link"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={joinTeam}
                  disabled={!joinTeamCode.trim()}
                  className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  Join Team
                </button>
                <button
                  onClick={() => {
                    setIsJoiningTeam(false);
                    setJoinTeamCode('');
                  }}
                  className="bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            // Show skeleton loader while loading
            [...Array(3)].map((_, index) => (
              <TeamSkeleton key={index} />
            ))
          ) : filteredTeams.length > 0 ? (
            filteredTeams.map((team) => (
              <div key={team.id} className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-cyan-500/30 transition-colors">
                {editingTeamId === team.id ? (
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={editTeamName}
                      onChange={(e) => setEditTeamName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      placeholder="Team name"
                    />
                    <textarea
                      value={editTeamDescription}
                      onChange={(e) => setEditTeamDescription(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      placeholder="Team description"
                      rows={3}
                    />
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id={`requireApproval-${team.id}`}
                        checked={teamRequireApproval}
                        onChange={(e) => setTeamRequireApproval(e.target.checked)}
                        className="w-4 h-4 text-cyan-500 bg-slate-700 border-slate-600 rounded focus:ring-cyan-500"
                      />
                      <label htmlFor={`requireApproval-${team.id}`} className="ml-2 text-sm text-slate-300">
                        Require approval for new members
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={updateTeam}
                        className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingTeamId(null)}
                        className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white">{team.name}</h3>
                        <p className="text-slate-400 text-sm mt-1">{team.description || 'No description'}</p>
                      </div>
                      {team.owner_id === user.id && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditingTeamId(team.id);
                              setEditTeamName(team.name);
                              setEditTeamDescription(team.description);
                              // require_approval not available in schema; default to false
                              setTeamRequireApproval(false);
                            }}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                            title="Edit team"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteTeam(team.id)}
                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Delete team"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center text-sm text-slate-400 mb-4">
                      <Users className="w-4 h-4 mr-2" />
                      <span>{teamMembers[team.id]?.length ?? 0} member{(teamMembers[team.id]?.length ?? 0) !== 1 ? 's' : ''}</span>
                    </div>

                    <div className="flex gap-2 mb-4">
                      <button 
                        onClick={() => copyInviteLink(team.id)}
                        className="flex-1 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        <Link className="w-4 h-4" />
                        <span className="hidden sm:inline">Invite</span>
                      </button>
                      <button 
                        onClick={() => {
                          window.location.href = `/team/chat?team=${team.id}`;
                        }}
                        className="flex-1 flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span className="hidden sm:inline">Chat</span>
                      </button>
                    </div>
                    {/* Invite codes and approval flags are not available in the current DB schema */}

                  </>
                )}
              </div>
            ))
          ) : !isLoading ? (
            <div className="col-span-full bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
              <div className="bg-cyan-500/10 p-4 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                {searchQuery ? 'No teams found' : 'No Teams Yet'}
              </h3>
              <p className="text-slate-400 mb-6">
                {searchQuery 
                  ? 'Try a different search term' 
                  : 'Create your first team or join an existing one to start collaborating.'}
              </p>
              {!searchQuery && (
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => setIsJoiningTeam(true)}
                    className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    Join Team
                  </button>
                  <button
                    onClick={() => setIsCreatingTeam(true)}
                    className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create Team
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}