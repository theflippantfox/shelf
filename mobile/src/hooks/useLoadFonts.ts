/**
 * useLoadFonts — loads Plus Jakarta Sans font files at app startup.
 * Returns fontsLoaded boolean so consumers can gate rendering.
 *
 * Fonts are bundled in assets/fonts/ and linked via react-native.config.js.
 * On iOS: registered in Info.plist + pod install.
 * On Android: auto-linked from android/app/src/main/assets/fonts/.
 */
import {useEffect, useState} from 'react';

export function useLoadFonts(): boolean {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    // Fonts are linked natively — just give the runtime a moment to register them.
    const timer = setTimeout(() => setFontsLoaded(true), 150);
    return () => clearTimeout(timer);
  }, []);

  return fontsLoaded;
}
