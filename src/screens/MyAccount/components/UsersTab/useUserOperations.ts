import { useState } from 'react';
import { useToast } from '../../../../components/ui/toast';
import { supabase } from '../../../../lib/supabase';
import { User, EditUserForm, UserRegistration } from './types';

export function useUserOperations(loadUsers: () => Promise<void>) {
  const { showToast } = useToast();
  
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditUserForm>({});
  const [userRegistrations, setUserRegistrations] = useState<UserRegistration[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [resettingPassword, setResettingPassword] = useState(false);

  const handleEditUser = async (user: User) => {
    setEditingUser(user.id);
    setEditForm({
      name: user.name,
      email: user.email,
      phone: user.phone,
      preferred_position: user.preferred_position,
      is_admin: user.is_admin,
      is_facilitator: user.is_facilitator
    });
    
    await loadUserRegistrations(user.team_ids || []);
  };

  const loadUserRegistrations = async (teamIds: number[]) => {
    if (teamIds.length === 0) {
      setUserRegistrations([]);
      return;
    }

    try {
      const { data: teamsData, error } = await supabase
        .from('teams')
        .select(`
          id,
          captain_id,
          leagues:league_id(
            id, 
            name,
            sports:sport_id(name)
          )
        `)
        .in('id', teamIds);

      if (error) throw error;

      const leagueMap = new Map();
      
      teamsData?.forEach(team => {
        if (team.leagues) {
          const league = team.leagues;
          const isCaptain = editingUser ? team.captain_id === editingUser : false;
          const sportName = (league as any).sports?.name;
          
          if (leagueMap.has((league as any).id)) {
            const existing = leagueMap.get((league as any).id);
            if (isCaptain) {
              existing.role = 'captain';
            }
          } else {
            leagueMap.set((league as any).id, {
              id: (league as any).id,
              name: (league as any).name,
              sport_name: sportName,
              role: isCaptain ? 'captain' : 'player'
            });
          }
        }
      });

      setUserRegistrations(Array.from(leagueMap.values()));
    } catch (error) {
      console.error('Error loading user registrations:', error);
      setUserRegistrations([]);
    }
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          preferred_position: editForm.preferred_position,
          is_admin: editForm.is_admin,
          is_facilitator: editForm.is_facilitator,
          date_modified: new Date().toISOString()
        })
        .eq('id', editingUser);

      if (error) throw error;

      showToast('User updated successfully!', 'success');
      handleCancelEdit();
      loadUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      showToast('Failed to update user', 'error');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    setDeleting(userId);
    try {
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('auth_id')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;
      
      if (!userData || !userData.auth_id) {
        throw new Error('Could not find auth_id for this user');
      }
      
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(
        userData.auth_id
      );
      
      if (authDeleteError) {
        console.error('Error deleting auth user:', authDeleteError);
      }

      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      showToast('User deleted successfully!', 'success');
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      showToast('Failed to delete user', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const handleResetPassword = async () => {
    if (!editingUser) return;

    const confirmReset = confirm('Are you sure you want to reset this user\'s password? They will receive an email with instructions to set a new password.');
    if (!confirmReset) return;

    try {
      setResettingPassword(true);
      
      const userEmail = editForm.email;
      if (!userEmail) {
        showToast('User email is required to reset password', 'error');
        return;
      }

      const { error } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: userEmail,
        options: {
          redirectTo: `${window.location.origin}/reset-password`
        }
      });

      if (error) throw error;

      showToast('Password reset email sent successfully!', 'success');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      showToast(error.message || 'Failed to reset password', 'error');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditForm({});
    setUserRegistrations([]);
    setResettingPassword(false);
  };

  return {
    editingUser,
    editForm,
    userRegistrations,
    deleting,
    resettingPassword,
    setEditForm,
    handleEditUser,
    handleSaveUser,
    handleDeleteUser,
    handleResetPassword,
    handleCancelEdit
  };
}