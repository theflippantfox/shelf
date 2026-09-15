/**
 * ThemeProvider — provides the current palette + brightness mode to the app.
 *
 * Persists the user's palette choice and theme mode to AsyncStorage.
 * Mode: 'light' | 'dark' | 'system'
 * Palette: one of the 10 palette IDs.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {useColorScheme} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {DEFAULT_PALETTE, getPalette, initMotionPreferences} from '../theme';
import type {Palette, Tokens} from '../theme';

const STORAGE_KEY_PALETTE = '@shelf_palette_id';
const STORAGE_KEY_MODE = '@shelf_theme_mode';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  paletteId: string;
  setPaletteId: (id: string) => void;
  palette: Palette;
  tokens: Tokens;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeState>({
  mode: 'system',
  setMode: () => {},
  paletteId: DEFAULT_PALETTE.id,
  setPaletteId: () => {},
  palette: DEFAULT_PALETTE,
  tokens: DEFAULT_PALETTE.light,
  isDark: false,
});

export function useTheme(): ThemeState {
  return useContext(ThemeContext);
}

interface Props {
  children: React.ReactNode;
}

export function ThemeProvider({children}: Props) {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [paletteId, setPaletteIdState] = useState(DEFAULT_PALETTE.id);
  const [loaded, setLoaded] = useState(false);

  // Load persisted preferences on mount
  useEffect(() => {
    (async () => {
      try {
        const [savedMode, savedPalette] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_MODE),
          AsyncStorage.getItem(STORAGE_KEY_PALETTE),
        ]);
        if (
          savedMode === 'light' ||
          savedMode === 'dark' ||
          savedMode === 'system'
        ) {
          setModeState(savedMode);
        }
        if (savedPalette) {
          setPaletteIdState(savedPalette);
        }
      } catch {
        // Use defaults
      }
      setLoaded(true);
    })();
    initMotionPreferences();
  }, []);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(STORAGE_KEY_MODE, newMode).catch(() => {});
  }, []);

  const setPaletteId = useCallback((id: string) => {
    setPaletteIdState(id);
    AsyncStorage.setItem(STORAGE_KEY_PALETTE, id).catch(() => {});
  }, []);

  const palette = useMemo(() => getPalette(paletteId), [paletteId]);

  const isDark = useMemo(() => {
    if (mode === 'light') {
      return false;
    }
    if (mode === 'dark') {
      return true;
    }
    return systemColorScheme === 'dark';
  }, [mode, systemColorScheme]);

  const tokens = isDark ? palette.dark : palette.light;

  const value = useMemo<ThemeState>(
    () => ({
      mode,
      setMode,
      paletteId,
      setPaletteId,
      palette,
      tokens,
      isDark,
    }),
    [mode, setMode, paletteId, setPaletteId, palette, tokens, isDark],
  );

  // Don't flash wrong theme on load
  if (!loaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
