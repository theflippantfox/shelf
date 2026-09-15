/**
 * AuthProvider — manages authentication state for the app.
 *
 * Wraps the app and provides:
 * - user session (tokens, user info)
 * - current shop
 * - login/logout/register actions
 * - loading state during initial token check
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import {
  getAccessToken,
  getCurrentShopId,
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  fetchMyShops,
  selectShop as apiSelectShop,
  clearTokens,
  type LoginResult,
  type Shop,
} from '../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────

interface AuthUser {
  id: string;
  email: string;
}

interface AuthState {
  /** True while checking stored tokens on mount */
  loading: boolean;
  /** The authenticated user (null if not logged in) */
  user: AuthUser | null;
  /** The user's access token */
  accessToken: string | null;
  /** The currently selected shop */
  shop: Shop | null;
  /** All shops the user belongs to */
  shops: Shop[];
  /** True if logged in but needs to select a shop */
  needsShopSelect: boolean;
  /** Last error message */
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (
    firstName: string,
    lastName: string,
    email: string,
    password: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  selectShop: (shopId: string) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [needsShopSelect, setNeedsShopSelect] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── On mount: check for stored session ─────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) {
          setLoading(false);
          return;
        }

        setAccessToken(token);

        // Try to load shops
        const myShops = await fetchMyShops();
        setShops(myShops);

        const storedShopId = await getCurrentShopId();

        if (storedShopId) {
          const matched = myShops.find(s => s.id === storedShopId);
          if (matched) {
            setShop(matched);
            setUser({id: '', email: ''}); // Will be filled by profile fetch later
          } else {
            // Stored shop not in user's shops — need selection
            setNeedsShopSelect(true);
            setUser({id: '', email: ''});
          }
        } else if (myShops.length === 1) {
          // Only one shop — auto-select it
          const {setCurrentShopId} = await import('../lib/api');
          await setCurrentShopId(myShops[0].id);
          setShop(myShops[0]);
          setUser({id: '', email: ''});
        } else if (myShops.length > 1) {
          setNeedsShopSelect(true);
          setUser({id: '', email: ''});
        }
        // else: no shops — onboarding needed (handled by shop creation)
      } catch {
        // Token invalid or network error — clear everything
        await clearTokens();
        setAccessToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const result: LoginResult = await apiLogin(email, password);
      setAccessToken(result.access_token);
      setUser(result.user);

      // Load user's shops
      const myShops = await fetchMyShops();
      setShops(myShops);

      if (myShops.length === 0) {
        // No shops yet — will need onboarding (for now, show message)
        setError('No shops found. Please create a shop on the web app first.');
        return;
      }

      if (myShops.length === 1) {
        // Auto-select the only shop
        const {setCurrentShopId} = await import('../lib/api');
        await setCurrentShopId(myShops[0].id);
        setShop(myShops[0]);
      } else {
        setNeedsShopSelect(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
      throw err;
    }
  }, []);

  const register = useCallback(
    async (
      firstName: string,
      lastName: string,
      email: string,
      password: string,
    ) => {
      setError(null);
      try {
        await apiRegister(firstName, lastName, email, password);
        // Registration successful — now login
        await login(email, password);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Registration failed';
        setError(msg);
        throw err;
      }
    },
    [login],
  );

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setAccessToken(null);
    setShop(null);
    setShops([]);
    setNeedsShopSelect(false);
  }, []);

  const selectShop = useCallback(
    async (shopId: string) => {
      setError(null);
      try {
        await apiSelectShop(shopId);
        const matched = shops.find(s => s.id === shopId);
        if (matched) {
          setShop(matched);
          setNeedsShopSelect(false);
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Failed to select shop';
        setError(msg);
        throw err;
      }
    },
    [shops],
  );

  const clearError = useCallback(() => setError(null), []);

  const value: AuthState = {
    loading,
    user,
    accessToken,
    shop,
    shops,
    needsShopSelect,
    error,
    login,
    register,
    logout,
    selectShop,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
