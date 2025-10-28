"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FileSpreadsheet,
  Database,
  Calculator,
  Menu,
  Home,
  LogOut,
  UserPlus,
  Archive,
  User,
  Utensils,
} from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  const isActive = (path: string) => pathname === path;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".user-dropdown-container")) {
        setIsUserDropdownOpen(false);
      }
    };

    if (isUserDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isUserDropdownOpen]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setIsLoggedIn(!!user);

        if (user) {
          const role = user.user_metadata?.role || "user";
          setUserRole(role);
          setUserEmail(user.email || null);
          const displayName =
            user.user_metadata?.display_name ||
            user.user_metadata?.full_name ||
            null;
          setUserDisplayName(displayName);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setIsLoggedIn(false);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setUserRole(null);
    setUserEmail(null);
    setUserDisplayName(null);
    setIsUserDropdownOpen(false);
    router.push("/");
  };

  if (isCheckingAuth) {
    return (
      <nav className="bg-card border-b border-border sticky top-0 z-[9999] backdrop-blur-sm bg-card/95">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">
                  SIPEDAS
                </h1>
                <p className="text-xs text-muted-foreground">
                  Sistem Pengolahan Data Absensi
                </p>
              </div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-[9999] backdrop-blur-sm bg-card/95">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">SIPEDAS</h1>
              <p className="text-xs text-muted-foreground">
                Sistem Pengolahan Data Absensi
              </p>
            </div>
          </Link>

          <div className="hidden md:flex items-center space-x-2">
            <Link
              href="/"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
                isActive("/")
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </Link>
            {isLoggedIn && (
              <>
                <Link
                  href="/adkUM"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
                    isActive("/adkUM")
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Utensils className="w-4 h-4" />
                  <span>Uang Makan</span>
                </Link>
                <Link
                  href="/tunjanganKinerjaData"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
                    isActive("/tunjanganKinerjaData")
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Calculator className="w-4 h-4" />
                  <span>Tunjangan Kinerja</span>
                </Link>
                <Link
                  href="/arsipADK"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
                    isActive("/arsipADK")
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Archive className="w-4 h-4" />
                  <span>Arsip File ADK</span>
                </Link>
                <div className="relative ml-4 pl-4 border-l border-border user-dropdown-container">
                  <button
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <User className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">
                      {userDisplayName || userEmail || "User"}
                    </span>
                  </button>

                  {isUserDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-lg z-[10000]">
                      <div className="p-2 space-y-1">
                        <div className="px-3 py-2 border-b border-border">
                          <p className="text-sm font-medium text-foreground">
                            {userDisplayName || "User"}
                          </p>
                          {userEmail && (
                            <p className="text-xs text-muted-foreground truncate">
                              {userEmail}
                            </p>
                          )}
                        </div>
                        <Link
                          href="/employeeData"
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm text-foreground hover:bg-secondary transition-colors"
                        >
                          <Database className="w-4 h-4" />
                          <span>Employee Data</span>
                        </Link>
                        {userRole === "superAdmin" && (
                          <Link
                            href="/add-user"
                            onClick={() => setIsUserDropdownOpen(false)}
                            className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm text-foreground hover:bg-secondary transition-colors"
                          >
                            <UserPlus className="w-4 h-4" />
                            <span>Add User</span>
                          </Link>
                        )}
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center space-x-2 px-3 py-2 rounded-md text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
            {!isLoggedIn && (
              <Link
                href="/login"
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
              >
                Login
              </Link>
            )}
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-1">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
                isActive("/")
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </Link>
            {isLoggedIn && (
              <>
                <Link
                  href="/adkUM"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
                    isActive("/adkUM")
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Utensils className="w-4 h-4" />
                  <span>ADK Uang Makan</span>
                </Link>
                <Link
                  href="/tunjanganKinerjaData"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
                    isActive("/tunjanganKinerjaData")
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Calculator className="w-4 h-4" />
                  <span>Tunjangan Kinerja</span>
                </Link>
                <Link
                  href="/arsipADK"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
                    isActive("/arsipADK")
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Archive className="w-4 h-4" />
                  <span>Arsip File ADK</span>
                </Link>
                <div className="pt-2 mt-2 border-t border-border">
                  <div className="px-4 py-2 flex items-center space-x-2 bg-secondary/50 rounded-lg mb-2">
                    <User className="w-4 h-4 text-primary" />
                    <div>
                      <p className="font-medium text-sm text-foreground">
                        {userDisplayName || userEmail || "User"}
                      </p>
                      {userEmail && userDisplayName && (
                        <p className="text-xs text-muted-foreground truncate">
                          {userEmail}
                        </p>
                      )}
                    </div>
                  </div>
                  <Link
                    href="/employeeData"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
                      isActive("/employeeData")
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    <Database className="w-4 h-4" />
                    <span>Employee Data</span>
                  </Link>
                  {userRole === "superAdmin" && (
                    <Link
                      href="/add-user"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`block w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
                        isActive("/add-user")
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Add User</span>
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="block w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </>
            )}
            {!isLoggedIn && (
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-all bg-primary text-primary-foreground"
              >
                Login
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
