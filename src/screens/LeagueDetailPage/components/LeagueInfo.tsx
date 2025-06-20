import { Button } from "../../../components/ui/button";
import { MapPin, Calendar, Clock, DollarSign, Users } from "lucide-react";

// Function to get spots badge color
const getSpotsBadgeColor = (spots: number) => {
  if (spots === 0) return "bg-red-100 text-red-800";
  if (spots <= 3) return "bg-orange-100 text-orange-800";
  return "bg-green-100 text-green-800";
};

// Function to get spots text
const getSpotsText = (spots: number) => {
  if (spots === 0) return "Full";
  if (spots === 1) return "1 spot left";
  return `${spots} spots left`;
};

interface LeagueInfoProps {
  league: any;
  sport: string;
}

export function LeagueInfo({ league, sport }: LeagueInfoProps) {
  return (
    <div className="bg-gray-100 rounded-lg p-6 mb-6">
      {/* Skill Level Badge has been removed */}

      {/* League Details */}
      <div className="space-y-4 mb-6">
        {/* Day & Time */}
        <div className="flex items-start">
          <Clock className="h-4 w-4 text-[#B20000] mr-2 mt-1 flex-shrink-0" />
          <div>
            <p className="font-medium text-[#6F6F6F]">{league.day}</p>
            {league.playTimes.map((time: string, index: number) => (
              <p key={index} className="text-sm text-[#6F6F6F]">
                {time}
              </p>
            ))}
          </div>
        </div>

        {/* Location */}
        <div className="flex items-start">
          <MapPin className="h-4 w-4 text-[#B20000] mr-2 mt-1 flex-shrink-0" />
          <div>
            <p className="font-medium text-[#6F6F6F]">{league.location}</p>
            {league.specificLocation && (
              <p className="text-sm text-[#6F6F6F]">
                {league.specificLocation}
              </p>
            )}
          </div>
        </div>

        {/* Season Dates */}
        <div className="flex items-start">
          <Calendar className="h-4 w-4 text-[#B20000] mr-2 mt-1 flex-shrink-0" />
          <div>
            <p className="font-medium text-[#6F6F6F]">Season Dates</p>
            <p className="text-sm text-[#6F6F6F]">{league.dates}</p>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-start">
          <DollarSign className="h-4 w-4 text-[#B20000] mr-2 mt-1 flex-shrink-0" />
          <div>
            <p className="font-medium text-[#6F6F6F]">Price</p>
            <p className="text-sm text-[#6F6F6F]">
              ${league.price}{" "}
              {sport === "Volleyball" ? "per team" : "per player"}
            </p>
          </div>
        </div>

        {/* Spots Remaining */}
        <div className="flex items-start">
          <Users className="h-4 w-4 text-[#B20000] mr-2 mt-1 flex-shrink-0" />
          <div>
            <p className="font-medium text-[#6F6F6F]">Availability</p>
            <span
              className={`text-xs font-medium py-1 px-3 rounded-full ${getSpotsBadgeColor(league.spotsRemaining)}`}
            >
              {getSpotsText(league.spotsRemaining)}
            </span>
          </div>
        </div>
      </div>

      {/* Register Button */}
      <Button
        className="bg-[#B20000] hover:bg-[#8A0000] text-white rounded-[10px] w-full py-3"
        disabled={league.spotsRemaining === 0}
      >
        {league.spotsRemaining === 0 ? "Join Waitlist" : "Register Now"}
      </Button>
    </div>
  );
}
