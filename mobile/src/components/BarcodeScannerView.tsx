/**
 * BarcodeScannerView — inline camera barcode scanner (NOT a modal).
 * Renders as a compact camera preview that sits inside a parent layout.
 * Used by POSScreen in scanner mode: camera on top, cart below.
 */
import React, {useState, useRef, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Platform,
  PermissionsAndroid,
  Animated,
} from 'react-native';
import {Camera, CameraType} from 'react-native-camera-kit';
import {useTheme} from './ThemeProvider';
import {spacing, typeScale} from '../theme';
import {X, ScanLine, Flashlight, FlashlightOff, Check} from 'lucide-react-native';

interface Props {
  onClose: () => void;
  onResult: (code: string) => void;
  scanCount: number;
  lastScannedCode: string;
}

const BARCODE_FORMATS = [
  'ean-13',
  'ean-8',
  'upc-a',
  'upc-e',
  'code-128',
  'code-39',
  'qr',
];

export function BarcodeScannerView({
  onClose,
  onResult,
  scanCount,
  lastScannedCode,
}: Props) {
  const {tokens} = useTheme();
  const [torchOn, setTorchOn] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const lastCodeRef = useRef('');
  const throttleRef = useRef(0);
  const flashAnim = useRef(new Animated.Value(0)).current;

  const requestCameraPermission = useCallback(async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'Camera access is needed to scan barcodes',
            buttonPositive: 'Allow',
          },
        );
        setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
        return;
      } catch {
        setHasPermission(false);
        return;
      }
    }
    setHasPermission(true);
  }, []);

  React.useEffect(() => {
    requestCameraPermission();
  }, [requestCameraPermission]);

  const flashFeedback = useCallback(() => {
    flashAnim.setValue(0.5);
    Animated.sequence([
      Animated.timing(flashAnim, {
        toValue: 0.8,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(flashAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [flashAnim]);

  const handleCode = useCallback(
    (code: string) => {
      const now = Date.now();
      if (now - throttleRef.current < 1200) {
        return;
      }
      throttleRef.current = now;
      lastCodeRef.current = code;
      onResult(code);
      flashFeedback();
      // Allow re-scan of same barcode after cooldown
      setTimeout(() => {
        lastCodeRef.current = '';
      }, 1200);
    },
    [onResult, flashFeedback],
  );

  const handleManualSubmit = () => {
    const code = manualCode.trim();
    if (!code) {
      return;
    }
    onResult(code);
    setManualCode('');
  };

  return (
    <View style={[styles.container, {backgroundColor: '#000'}]}>
      {/* Camera */}
      {hasPermission !== false && (
        <Camera
          style={StyleSheet.absoluteFill}
          cameraType={CameraType.Back}
          scanBarcode
          onReadCode={e => {
            const code = e.nativeEvent.codeStringValue;
            if (code) {
              handleCode(code);
            }
          }}
          allowedBarcodeTypes={BARCODE_FORMATS as any}
          scanThrottleDelay={200}
          torchMode={torchOn ? 'on' : 'off'}
        />
      )}

      {/* Flash overlay */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: '#10b981',
            opacity: flashAnim,
            pointerEvents: 'none',
          },
        ]}
      />

      {/* Scan frame overlay */}
      <View style={styles.overlay}>
        <View style={styles.scanArea}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
        </View>
      </View>

      {/* Top controls */}
      <View style={styles.topControls}>
        <TouchableOpacity
          onPress={onClose}
          style={styles.controlBtn}
          activeOpacity={0.7}>
          <X size={20} color="#fff" strokeWidth={2} />
        </TouchableOpacity>

        <View style={styles.topCenter}>
          {scanCount > 0 && (
            <View style={styles.scanBadge}>
              <Check size={12} color="#10b981" strokeWidth={3} />
              <Text style={styles.scanBadgeText}>{scanCount} scanned</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={() => setTorchOn(!torchOn)}
          style={styles.controlBtn}
          activeOpacity={0.7}>
          {torchOn ? (
            <FlashlightOff size={20} color="#fff" strokeWidth={2} />
          ) : (
            <Flashlight size={20} color="#fff" strokeWidth={2} />
          )}
        </TouchableOpacity>
      </View>

      {/* Bottom: manual entry + last scanned */}
      <View style={styles.bottomControls}>
        {lastScannedCode ? (
          <Text style={styles.lastCode}>Last: {lastScannedCode}</Text>
        ) : null}

        {/* Permission denied */}
        {hasPermission === false && (
          <View style={styles.permDenied}>
            <ScanLine size={24} color="#888" strokeWidth={1.5} />
            <Text style={styles.permDeniedText}>
              Camera unavailable — type barcode below
            </Text>
          </View>
        )}

        <View style={styles.manualRow}>
          <TextInput
            style={[
              styles.manualInput,
              {
                backgroundColor: 'rgba(255,255,255,0.12)',
                color: '#fff',
                borderColor: 'rgba(255,255,255,0.2)',
              },
            ]}
            value={manualCode}
            onChangeText={setManualCode}
            placeholder="Type barcode..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            keyboardType="default"
            returnKeyType="done"
            onSubmitEditing={handleManualSubmit}
          />
          <TouchableOpacity
            style={[
              styles.submitBtn,
              {
                backgroundColor: manualCode.trim()
                  ? tokens.navAccent
                  : 'rgba(255,255,255,0.15)',
              },
            ]}
            onPress={handleManualSubmit}
            disabled={!manualCode.trim()}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.submitText,
                {
                  color: manualCode.trim()
                    ? '#fff'
                    : 'rgba(255,255,255,0.4)',
                },
              ]}>
              Add
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 220,
    height: 120,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#10b981',
    borderWidth: 3,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 6,
  },
  topControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  topCenter: {
    alignItems: 'center',
  },
  controlBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16,185,129,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  scanBadgeText: {
    ...typeScale.caption,
    color: '#10b981',
    fontWeight: '700',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
  },
  lastCode: {
    ...typeScale.caption,
    color: 'rgba(255,255,255,0.4)',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 6,
  },
  permDenied: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  permDeniedText: {
    ...typeScale.caption,
    color: '#888',
  },
  manualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  manualInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    ...typeScale.caption,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  submitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  submitText: {
    ...typeScale.caption,
    fontWeight: '700',
  },
});
