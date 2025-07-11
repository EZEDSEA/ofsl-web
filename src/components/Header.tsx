import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Menu, X, ChevronDown, User, LogOut } from "lucide-react";
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from "./ui/navigation-menu";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "./ui/toast";

interface HeaderProps {
  isCompact?: boolean;
}

export function Header({ isCompact = false }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { showToast } = useToast();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    }

    if (isUserDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserDropdownOpen]);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const getLinkClasses = (path: string) => {
    return `relative text-white font-medium py-2 transition-colors hover:text-white text-base md:text-lg
      before:content-[''] before:absolute before:bottom-0 before:left-0 before:w-full before:h-0.5 
      before:bg-[#ffeae5] before:transition-transform before:duration-300
      ${isActive(path) ? 'before:scale-x-100' : 'before:scale-x-0 hover:before:scale-x-100'}`;
  };

  const getMobileLinkClasses = (path: string) => {
    return `text-white text-lg py-2 px-4 transition-colors duration-200
      ${isActive(path) ? 'bg-white/20' : 'hover:bg-white/10'} rounded-[10px]`;
  };

  const handleLogout = async () => {
    await signOut();
    showToast("You have been successfully logged out", "success");
    navigate('/');
    setIsUserDropdownOpen(false);
  };

  // Determine height and logo size based on compact state
  const headerHeight = isCompact ? 'h-[45px] md:h-[72px]' : 'h-[70px] md:h-[97px]';
  const logoHeight = isCompact ? 'h-[24px] md:h-[34px]' : 'h-[32px] md:h-[46px]';
  const logoWidth = isCompact ? 'w-[120px] md:w-[170px]' : 'w-[160px] md:w-[230px]';
  const imageLogo = isCompact ? 'w-[114px] md:w-[162px] h-[24px] md:h-[34px]' : 'w-[152px] md:w-[217px] h-[32px] md:h-[46px]';

  return (
    <div className={`w-full ${headerHeight} [background:linear-gradient(180deg,rgba(178,0,0,1)_0%,rgba(120,18,18,1)_100%)] transition-all duration-300 ease-in-out`}>
      <div className="max-w-[1280px] mx-auto px-4 h-full flex items-center justify-between">
        <Link to="/" className={`relative ${logoHeight} ${logoWidth} transition-all duration-300 ease-in-out`}>
          <img
            className={`${imageLogo} transition-all duration-300 ease-in-out`}
            alt="OFSL Logo"
            src="/group-1.png"
          />
        </Link>

        {/* Mobile menu button */}
        <div className="lg:hidden">
          <button
            className="text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Desktop Navigation - Moved to the right */}
        <div className="hidden lg:flex items-center">
          <NavigationMenu>
            <NavigationMenuList className="flex gap-8 items-center">
              <NavigationMenuItem className="flex items-center">
                <Link 
                  to="/volleyball" 
                  className={getLinkClasses("/volleyball")}
                >
                  Volleyball
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem className="flex items-center">
                <Link 
                  to="/badminton"
                  className={getLinkClasses("/badminton")}
                >
                  Badminton
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem className="flex items-center">
                <Link 
                  to="https://hoops.ofsl.ca"
                  className={getLinkClasses("/basketball")}
                >
                  Basketball
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem className="relative flex items-center">
                <div className="absolute -top-2.5 w-full text-center">
                  <span className="text-[10px] text-[#ffeae5] font-medium whitespace-nowrap">Coming Soon!</span>
                </div>
                <Link 
                  to="/pickleball"
                  className={getLinkClasses("/pickleball")}
                >
                  Pickleball
                </Link>
              </NavigationMenuItem>
              
              {/* Vertical breakline */}
              <div className="h-6 w-px bg-white mx-2"></div>
              
              <NavigationMenuItem className="flex items-center">
                <Link 
                  to="/leagues" 
                  className={getLinkClasses("/leagues")}
                >
                  Leagues
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          {/* Login/Logout button */}
          {user ? (
            <div className="ml-8 relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="flex items-center gap-2 text-white font-medium py-2 px-6 transition-all duration-200 text-base md:text-lg
                  before:content-[''] before:absolute before:inset-0 before:bg-black/10 before:rounded-[10px]
                  hover:before:bg-black/20 border border-white rounded-[10px] relative z-10"
              >
                <span>MyOFSL</span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Dropdown Menu */}
              {isUserDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="py-2">
                    <Link 
                      to="/my-teams" 
                      className="block px-4 py-2 text-[#6F6F6F] hover:bg-gray-50 hover:text-[#B20000] transition-colors first:rounded-t-lg"
                      onClick={() => setIsUserDropdownOpen(false)}
                    >
                      My Teams
                    </Link>
                    <Link 
                     to="/my-account/profile" 
                      className="block px-4 py-2 text-[#6F6F6F] hover:bg-gray-50 hover:text-[#B20000] transition-colors"
                      onClick={() => setIsUserDropdownOpen(false)}
                    >
                      My Account
                    </Link>
                    <button 
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-[#6F6F6F] hover:bg-gray-50 hover:text-[#B20000] transition-colors last:rounded-b-lg"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link 
              to="/login" 
              className="ml-8 relative text-white font-medium py-2 px-6 transition-all duration-200 text-base md:text-lg
                before:content-[''] before:absolute before:inset-0 before:bg-black/10 before:rounded-[10px]
                hover:before:bg-black/20 border border-white rounded-[10px]"
            >
              Login
            </Link>
          )}
        </div>

        {/* Mobile Navigation */}
        <div 
          ref={mobileMenuRef}
          className={`lg:hidden fixed inset-x-0 bottom-0 top-0 bg-[#B20000] z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto ${
            isMenuOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <div className="container mx-auto px-4 py-6 pb-24">
            <div className="flex justify-end lg:hidden mb-4">
              <button
                className="text-white p-2"
                onClick={() => setIsMenuOpen(false)}
                aria-label="Close mobile menu"
              >
                <X size={24} />
              </button>
            </div>
            <nav className="flex flex-col space-y-4 min-h-[calc(100vh-200px)]">
              <Link 
                to="/volleyball" 
                className={getMobileLinkClasses("/volleyball")}
                onClick={() => setIsMenuOpen(false)}
              >
                Volleyball
              </Link>
              <Link 
                to="/badminton" 
                className={getMobileLinkClasses("/badminton")}
                onClick={() => setIsMenuOpen(false)}
              >
                Badminton
              </Link>
              <Link 
                to="https://hoops.ofsl.ca" 
                className={getMobileLinkClasses("/basketball")}
                onClick={() => setIsMenuOpen(false)}
              >
                Basketball
              </Link>
              <div className="flex flex-col">
                <span className="text-[10px] text-[#ffeae5] font-medium px-4 whitespace-nowrap">Coming Soon!</span>
                <Link 
                  to="/pickleball" 
                  className={getMobileLinkClasses("/pickleball")}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Pickleball
                </Link>
              </div>
              <Link 
                to="/leagues" 
                className={getMobileLinkClasses("/leagues")}
                onClick={() => setIsMenuOpen(false)}
              >
                Leagues
              </Link>
              
              {/* Divider for mobile menu */}
              <div className="h-px w-full bg-white/20 my-2"></div>
              
              {/* Account navigation for mobile */}
              {user ? (
                <>
                  <Link
                    to="/my-teams"
                    className={`${getMobileLinkClasses("/my-teams")} flex items-center`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M7,5H21V7H7V5M7,13V11H21V13H7M4,4.5A1.5,1.5 0 0,1 5.5,6A1.5,1.5 0 0,1 4,7.5A1.5,1.5 0 0,1 2.5,6A1.5,1.5 0 0,1 4,4.5M4,10.5A1.5,1.5 0 0,1 5.5,12A1.5,1.5 0 0,1 4,13.5A1.5,1.5 0 0,1 2.5,12A1.5,1.5 0 0,1 4,10.5M7,19V17H21V19H7M4,16.5A1.5,1.5 0 0,1 5.5,18A1.5,1.5 0 0,1 4,19.5A1.5,1.5 0 0,1 2.5,18A1.5,1.5 0 0,1 4,16.5Z"/>
                    </svg>
                    My Teams
                  </Link>
                  <Link
                    to="/my-account"
                    className={`${getMobileLinkClasses("/my-account")} flex items-center`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <User className="h-4 w-4 mr-2" />
                    My Account
                  </Link>
                  <button 
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className={`${getMobileLinkClasses("/logout")} flex items-center`}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </button> 
                </>
              ) : (
                <Link 
                  to="/login" 
                  className={`${getMobileLinkClasses("/login")} flex items-center`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <User className="h-4 w-4 mr-2" />
                  Login
                </Link>
              )}
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}