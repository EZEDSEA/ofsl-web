import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../../contexts/AuthContext";
import { useToast } from "../../../../components/ui/toast";
import { supabase } from "../../../../lib/supabase";
import {
  getUserSubscription,
  createPaymentIntent,
} from "../../../../lib/stripe";
import {
  getUserPaymentSummary,
  getUserLeaguePayments,
  type LeaguePayment,
} from "../../../../lib/payments";
import { Users, Calendar, CheckCircle, AlertCircle } from "lucide-react";
import { TeamDetailsModal } from "../TeamDetailsModal";
import { StatsCard } from "./components/StatsCard";
import { TeamCard } from "./components/TeamCard";
import { BalanceNotice } from "./components/BalanceNotice";
import { ConfirmationModal } from "./components/ConfirmationModal";
import { SubscriptionBanner } from "./components/SubscriptionBanner";
import { PaymentModal } from "../../../../components/PaymentModal";

interface Team {
  id: number;
  name: string;
  captain_name: string | null;
  league_id: number;
  captain_id: string;
  roster: string[];
  roster_details: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  league: {
    id: number;
    name: string;
    day_of_week: number | null;
    cost: number | null;
    gym_ids: number[] | null;
    sports: {
      name: string;
    } | null;
  } | null;
  skill: {
    name: string;
  } | null;
  skill_names: string[] | null;
  gyms: Array<{
    id: number;
    gym: string | null;
    address: string | null;
  }>;
}

interface TeamWithPayment extends Team {
  payment?: LeaguePayment;
}

// Helper function to get day name
const getDayName = (dayNumber: number | null | undefined): string => {
  if (dayNumber === null || dayNumber === undefined) return "Day TBD";
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[dayNumber] || "Day TBD";
};

export function TeamsTab() {
  const { userProfile } = useAuth();
  const { showToast } = useToast();

  const [teams, setTeams] = useState<TeamWithPayment[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [showTeamDetailsModal, setShowTeamDetailsModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamWithPayment | null>(
    null,
  );
  const [subscription, setSubscription] = useState<any>(null);

  // Payment-related state
  const [outstandingBalance, setOutstandingBalance] = useState<number>(0);
  const [paymentSummary, setPaymentSummary] = useState<any>(null);
  const [leaguePayments, setLeaguePayments] = useState<LeaguePayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<LeaguePayment | null>(
    null,
  );

  // Add state for unregistering
  const [unregisteringPayment, setUnregisteringPayment] = useState<
    number | null
  >(null);

  // Add state for deleting team
  const [deletingTeam, setDeletingTeam] = useState<number | null>(null);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    onConfirm: () => {},
    action: "" as "unregister" | "delete" | "",
    itemId: null as number | null,
    itemName: "",
  });

  // Stats calculations from actual data
  const activeTeams = teams.filter((team) => team.active).length;
  const captainTeams = teams.filter(
    (team) => team.captain_id === userProfile?.id,
  );

  // For now, using placeholder data for stats that require additional tables
  // In a real implementation, these would come from schedule/games tables
  const nextGameDate = "TBD"; // Would come from schedule table
  const totalWins = "TBD"; // Would come from games/results table

  useEffect(() => {
    loadUserTeams();
    loadSubscription();
    loadPaymentData();
  }, [userProfile]);

  const loadSubscription = async () => {
    try {
      const subscriptionData = await getUserSubscription();
      setSubscription(subscriptionData);
    } catch (error) {
      console.error("Error loading subscription:", error);
    }
  };

  const loadPaymentData = async () => {
    if (!userProfile) return;

    try {
      setPaymentsLoading(true);

      const [summary, payments] = await Promise.all([
        getUserPaymentSummary(),
        getUserLeaguePayments(),
      ]);

      setPaymentSummary(summary);
      setLeaguePayments(payments);
      setOutstandingBalance(summary.total_outstanding);
    } catch (error) {
      console.error("Error loading payment data:", error);
    } finally {
      setPaymentsLoading(false);
    }
  };

  const showUnregisterConfirmation = (
    paymentId: number,
    leagueName: string,
  ) => {
    setConfirmModal({
      isOpen: true,
      title: "Confirm Unregistration",
      message: `Are you sure you want to delete your registration for ${leagueName}? This action cannot be undone and you will lose your spot in the league.`,
      confirmText: "Yes, Unregister",
      cancelText: "Cancel",
      onConfirm: () => handleUnregister(paymentId, leagueName),
      action: "unregister",
      itemId: paymentId,
      itemName: leagueName,
    });
  };

  const handleUnregister = async (paymentId: number, leagueName: string) => {
    try {
      setUnregisteringPayment(paymentId);
      console.log(
        "Unregistering payment:",
        paymentId,
        "for league:",
        leagueName,
      );
      // Get the league payment details first to find associated team
      const { data: paymentData, error: paymentError } = await supabase
        .from("league_payments")
        .select("team_id, league_id, user_id")
        .eq("id", paymentId);

      if (paymentError) throw paymentError;

      if (!paymentData || paymentData.length === 0) {
        throw new Error("Payment record not found");
      }

      const payment = paymentData[0];

      // If there's a team associated, remove user from team and update team roster
      if (payment.team_id) {
        // Get current team data
        const { data: teamData, error: teamError } = await supabase
          .from("teams")
          .select("roster, captain_id")
          .eq("id", payment.team_id)
          .single();

        if (teamError) throw teamError;

        // Remove user from roster
        const updatedRoster = (teamData.roster || []).filter(
          (userId: string) => userId !== payment.user_id,
        );

        // If user was the captain and there are other players, we need to handle captain transfer
        // For now, we'll just remove them and let admin handle captain reassignment
        const updates: any = { roster: updatedRoster };

        // If the user was the captain and no one else is left, deactivate the team
        if (teamData.captain_id === payment.user_id) {
          if (updatedRoster.length === 0) {
            updates.active = false;
            updates.captain_id = null;
          } else {
            // Set the first remaining player as captain
            updates.captain_id = updatedRoster[0];
          }
        }

        // Update team
        const { error: updateTeamError } = await supabase
          .from("teams")
          .update(updates)
          .eq("id", payment.team_id);

        if (updateTeamError) throw updateTeamError;

        // Update user's team_ids array
        if (userProfile) {
          const currentTeamIds = userProfile.team_ids || [];
          const updatedTeamIds = currentTeamIds.filter(
            (teamId: number) => teamId !== payment.team_id,
          );

          const { error: userUpdateError } = await supabase
            .from("users")
            .update({ team_ids: updatedTeamIds })
            .eq("id", userProfile.id);

          if (userUpdateError) throw userUpdateError;
        }
      }

      // Delete the league payment record
      const { error: deleteError } = await supabase
        .from("league_payments")
        .delete()
        .eq("id", paymentId);

      if (deleteError) throw deleteError;

      showToast("Successfully deleted league registration", "success");

      // Reload all data to update the UI and amounts
      await loadPaymentData();
      await loadUserTeams();

      // Show success message
      showToast("Successfully unregistered from league", "success");
    } catch (error: any) {
      console.error("Error deleting league registration:", error);
      showToast(
        error.message || "Failed to delete league registration",
        "error",
      );
    } finally {
      setUnregisteringPayment(null);
    }
  };

  const showDeleteTeamConfirmation = (team: TeamWithPayment) => {
    setConfirmModal({
      isOpen: true,
      title: "Confirm Team Deletion",
      message: `Are you sure you want to deregister the team "${team.name}"? This action cannot be undone and will remove all team data including registrations and payment records.`,
      confirmText: "Yes, Deregister Team",
      cancelText: "Cancel",
      onConfirm: () => handleDeleteTeam(team),
      action: "delete",
      itemId: team.id,
      itemName: team.name,
    });
  };

  const handleDeleteTeam = async (team: TeamWithPayment) => {
    try {
      setDeletingTeam(team.id);

      // 1. Update team_ids for all users in the roster
      if (team.roster && team.roster.length > 0) {
        for (const userId of team.roster) {
          const { data: userData, error: fetchError } = await supabase
            .from("users")
            .select("team_ids")
            .eq("id", userId)
            .single();

          if (fetchError) {
            console.error(`Error fetching user ${userId}:`, fetchError);
            continue;
          }

          if (userData) {
            const updatedTeamIds = (userData.team_ids || []).filter(
              (id: number) => id !== team.id,
            );

            const { error: updateError } = await supabase
              .from("users")
              .update({ team_ids: updatedTeamIds })
              .eq("id", userId);

            if (updateError) {
              console.error(`Error updating user ${userId}:`, updateError);
            }
          }
        }
      }

      // 2. Delete the team (league_payments will be deleted via ON DELETE CASCADE)
      const { error: deleteError } = await supabase
        .from("teams")
        .delete()
        .eq("id", team.id);

      if (deleteError) throw deleteError;

      showToast("Team deleted successfully", "success");

      // Reload all data to update the UI
      await loadPaymentData();
      await loadUserTeams();
    } catch (error: any) {
      console.error("Error deleting team:", error);
      showToast(error.message || "Failed to delete team", "error");
    } finally {
      setDeletingTeam(null);
    }
  };

  const showLeaveTeamConfirmation = (team: TeamWithPayment) => {
    setConfirmModal({
      isOpen: true,
      title: "Confirm Leave Team",
      message: `Are you sure you want to leave the team "${team.name}"? Once you leave, only the team captain can add you back.`,
      confirmText: "Yes, Leave Team",
      cancelText: "Cancel",
      onConfirm: () => handleLeaveTeam(team),
      action: "leave",
      itemId: team.id,
      itemName: team.name,
    });
  };

  const handleLeaveTeam = async (team: TeamWithPayment) => {
    try {
      setUnregisteringPayment(team.payment?.id || null);

      // Get the current team roster
      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select("roster")
        .eq("id", team.id)
        .single();

      if (teamError) throw teamError;

      // Remove the current user from the roster
      const updatedRoster = (teamData.roster || []).filter(
        (userId: string) => userId !== userProfile?.id,
      );

      // Update the team roster
      const { error: updateError } = await supabase
        .from("teams")
        .update({ roster: updatedRoster })
        .eq("id", team.id);

      if (updateError) throw updateError;

      // Update user's team_ids array
      if (userProfile) {
        const currentTeamIds = userProfile.team_ids || [];
        const updatedTeamIds = currentTeamIds.filter(
          (teamId: number) => teamId !== team.id,
        );

        const { error: userUpdateError } = await supabase
          .from("users")
          .update({ team_ids: updatedTeamIds })
          .eq("id", userProfile.id);

        if (userUpdateError) throw userUpdateError;
      }

      showToast("You have left the team successfully", "success");

      // Reload all data to update the UI
      await loadPaymentData();
      await loadUserTeams();
    } catch (error: any) {
      console.error("Error leaving team:", error);
      showToast(error.message || "Failed to leave team", "error");
    } finally {
      setUnregisteringPayment(null);
    }
  };

  const closeConfirmModal = () => {
    setConfirmModal((prev) => ({
      ...prev,
      isOpen: false,
    }));
  };

  const loadUserTeams = async () => {
    if (!userProfile) return;

    try {
      setTeamsLoading(true);

      // Fetch teams with league and sport information
      const { data: teamsData, error } = await supabase
        .from("teams")
        .select(
          `
          *,
          leagues:league_id(
            id, name, day_of_week, cost, gym_ids, location, sports:sport_id(name)
          ),
          skills:skill_level_id(name)
        `,
        )
        .or(`captain_id.eq.${userProfile.id},roster.cs.{${userProfile.id}}`)
        .order("created_at", { ascending: false })
        .eq("active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get all unique skill IDs from all teams
      const allSkillIds = new Set<number>();
      teamsData?.forEach((team) => {
        if (team.leagues?.skill_ids) {
          team.leagues.skill_ids.forEach((id: number) => allSkillIds.add(id));
        }
      });

      // Fetch all skills for mapping skill_ids to names
      const { data: allSkills, error: skillsError } = await supabase
        .from("skills")
        .select("id, name");

      if (skillsError) {
        console.error("Error fetching skills:", skillsError);
      }

      const skillsMap = new Map(
        allSkills?.map((skill) => [skill.id, skill]) || [],
      );

      // Process teams and fetch additional data
      const teamsWithFullDetails = await Promise.all(
        (teamsData || []).map(async (team) => {
          // Get captain name
          // Get captain name
          let captainName = null;
          if (team.captain_id) {
            const { data: captainData, error: captainError } = await supabase
              .from("users")
              .select("name")
              .eq("id", team.captain_id)
              .single();

            if (!captainError && captainData) {
              captainName = captainData.name;
            }
          }

          let rosterDetails: Array<{
            id: string;
            name: string;
            email: string;
          }> = [];
          let gyms: Array<{
            id: number;
            gym: string | null;
            address: string | null;
          }> = [];
          let skillNames: string[] | null = null;

          // Get skill names from skill_ids array if available in the league
          if (team.leagues?.skill_ids && team.leagues.skill_ids.length > 0) {
            const names = team.leagues.skill_ids
              .map((id: number) => skillsMap.get(id)?.name)
              .filter(
                (name: string | undefined) => name !== undefined,
              ) as string[];

            if (names.length > 0) {
              skillNames = names;
            }
          }

          // Fetch roster details if roster exists
          if (team.roster && team.roster.length > 0) {
            const { data: rosterData, error: rosterError } = await supabase
              .from("users")
              .select("id, name, email")
              .in("id", team.roster);

            if (rosterError) {
              console.error(
                "Error loading roster for team:",
                team.id,
                rosterError,
              );
            } else {
              rosterDetails = rosterData || [];
            }
          }

          // Fetch gym details if gym_ids exist in league
          if (team.leagues?.gym_ids && team.leagues.gym_ids.length > 0) {
            const { data: gymsData, error: gymsError } = await supabase
              .from("gyms")
              .select("id, gym, address")
              .in("id", team.leagues.gym_ids);

            if (gymsError) {
              console.error(
                "Error loading gyms for league:",
                team.league_id,
                gymsError,
              );
            } else {
              gyms = gymsData || [];
            }
          }

          return {
            ...team,
            league: team.leagues,
            captain_name: captainName,
            skill: team.skills,
            skill_names: skillNames,
            roster_details: rosterDetails,
            gyms: gyms,
          };
        }),
      );

      // Get all league payments
      const payments = await getUserLeaguePayments();

      // Merge payments with teams
      const teamsWithPayments = teamsWithFullDetails.map((team) => {
        const payment = payments.find((p) => p.team_id === team.id);
        return {
          ...team,
          payment,
        };
      });

      setTeams(teamsWithPayments);
    } catch (error) {
      console.error("Error loading user teams:", error);
      showToast("Failed to load teams", "error");
    } finally {
      setTeamsLoading(false);
    }
  };

  const handleManageTeam = (team: Team) => {
    setSelectedTeam(team as TeamWithPayment);
    setShowTeamDetailsModal(true);
  };

  const handlePlayersUpdated = () => {
    loadUserTeams();
  };

  const handlePayNow = (paymentId: number) => {
    const payment = leaguePayments.find((p) => p.id === paymentId);
    if (payment) {
      // Use custom payment modal
      setSelectedPayment(payment);
      setShowPaymentModal(true);
    }
  };

  // Function to handle payment for virtual payments (not yet in database)
  const handleVirtualPayment = (team: TeamWithPayment) => {
    // Find the matching league payment or create a virtual one
    const leagueId = team.league_id;
    const leagueName = team.league?.name || "Unknown League";
    const leagueCost = team.league?.cost || 0;

    // Create a virtual payment object
    const virtualPayment: LeaguePayment = {
      id: -team.id, // Use negative team ID to indicate virtual payment
      user_id: userProfile?.id || "",
      team_id: team.id,
      league_id: leagueId,
      amount_due: leagueCost,
      amount_paid: 0,
      amount_outstanding: leagueCost,
      status: "pending",
      due_date: new Date().toISOString(),
      payment_method: null,
      stripe_order_id: null,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      league_name: leagueName,
      team_name: team.name,
    };

    setSelectedPayment(virtualPayment);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    // Reload payment data and teams
    loadPaymentData();
    loadUserTeams();
  };

  if (teamsLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B20000]"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Subscription Status Banner */}
      <SubscriptionBanner subscription={subscription} />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Active Teams */}
        <StatsCard
          value={activeTeams}
          label="Active Teams"
          icon={<Users className="h-8 w-8 text-[#B20000]" />}
          bgColor="bg-red-50"
          textColor="text-[#B20000]"
        />

        {/* Next Game */}
        <StatsCard
          value={nextGameDate}
          label="Next Game"
          icon={<Calendar className="h-8 w-8 text-blue-600" />}
          bgColor="bg-blue-50"
          textColor="text-blue-600"
        />

        {/* Total Wins */}
        <StatsCard
          value={totalWins}
          label="Total Wins"
          icon={<CheckCircle className="h-8 w-8 text-green-600" />}
          bgColor="bg-green-50"
          textColor="text-green-600"
        />

        {/* Amount Owing */}
        <StatsCard
          value={`$${outstandingBalance.toFixed(2)}`}
          label="Amount Owing"
          icon={
            outstandingBalance > 0 ? (
              <AlertCircle className="h-8 w-8 text-orange-600" />
            ) : (
              <CheckCircle className="h-8 w-8 text-gray-600" />
            )
          }
          bgColor={outstandingBalance > 0 ? "bg-orange-50" : "bg-gray-50"}
          textColor={
            outstandingBalance > 0 ? "text-orange-600" : "text-gray-600"
          }
        />
      </div>

      {/* Outstanding Balance Notice */}
      <BalanceNotice
        outstandingBalance={outstandingBalance}
        paymentSummary={paymentSummary}
      />

      {/* Teams Section */}
      {teams.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[#6F6F6F] text-lg mb-4">
            You haven't joined any teams yet.
          </p>
          <p className="text-[#6F6F6F]">
            Browse our leagues and register a team to get started!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              currentUserId={userProfile?.id || ""}
              onManageTeam={handleManageTeam}
              onPayNow={team.payment ? handlePayNow : handleVirtualPayment}
              showDeleteTeamConfirmation={showDeleteTeamConfirmation}
              showLeaveTeamConfirmation={showLeaveTeamConfirmation}
              deletingTeam={deletingTeam}
              unregisteringPayment={unregisteringPayment}
            />
          ))}
        </div>
      )}

      {/* Team Details Modal */}
      {selectedTeam && (
        <TeamDetailsModal
          showModal={showTeamDetailsModal}
          closeModal={() => setShowTeamDetailsModal(false)}
          team={selectedTeam}
          currentUserId={userProfile?.id || ""}
          onPlayersUpdated={handlePlayersUpdated}
        />
      )}

      {/* Payment Modal */}
      {selectedPayment && (
        <PaymentModal
          showModal={showPaymentModal}
          closeModal={() => setShowPaymentModal(false)}
          paymentId={selectedPayment.id}
          leagueName={selectedPayment.league_name}
          teamName={selectedPayment.team_name}
          amountDue={selectedPayment.amount_due}
          amountPaid={selectedPayment.amount_paid}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        onConfirm={() => {
          confirmModal.onConfirm();
          closeConfirmModal();
        }}
        onCancel={closeConfirmModal}
      />
    </div>
  );
}

