/**
 * BarcodeScannerModal — full-screen camera barcode scanner.
 * Uses react-native-camera-kit's built-in barcode scanning.
 */
import React, {useState, useRef, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Camera, CameraType} from 'react-native-camera-kit';
import {useTheme} from './ThemeProvider';
import {spacing, typeScale} from '../theme';
import {X, ScanLine, Flashlight, FlashlightOff} from 'lucide-react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  onResult: (code: string) => void;
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

export function BarcodeScannerModal({visible, onClose, onResult}: Props) {
  const {tokens} = useTheme();
  const insets = useSafeAreaInsets();
  const [torchOn, setTorchOn] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const lastCodeRef = useRef('');
  const throttleRef = useRef(0);

  const requestPermission = useCallback(async () => {
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
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch {
        return false;
      }
    }
    // iOS: permission is requested by the Camera component itself
    return true;
  }, []);

  React.useEffect(() => {
    if (visible) {
      requestPermission().then(setHasPermission);
      setManualCode('');
      lastCodeRef.current = '';
    }
  }, [visible, requestPermission]);

  const handleCode = useCallback(
    (code: string) => {
      const now = Date.now();
      if (now - throttleRef.current < 1500) {
        return;
      }
      if (code === lastCodeRef.current) {
        return;
      }
      throttleRef.current = now;
      lastCodeRef.current = code;
      onResult(code);
      onClose();
    },
    [onResult, onClose],
  );

  const handleManualSubmit = () => {
    const code = manualCode.trim();
    if (!code) {
      return;
    }
    onResult(code);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}>
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

        {/* Overlay */}
        <View style={styles.overlay}>
          {/* Top bar */}
          <View
            style={[
              styles.topBar,
              {paddingTop: insets.top + spacing.md},
            ]}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.7}>
              <X size={24} color="#fff" strokeWidth={2} />
            </TouchableOpacity>
            <Text style={styles.title}>Scan Barcode</Text>
            <TouchableOpacity
              onPress={() => setTorchOn(!torchOn)}
              style={styles.closeBtn}
              activeOpacity={0.7}>
              {torchOn ? (
                <FlashlightOff size={22} color="#fff" strokeWidth={2} />
              ) : (
                <Flashlight size={22} color="#fff" strokeWidth={2} />
              )}
            </TouchableOpacity>
          </View>

          {/* Scan window */}
          {hasPermission !== false && (
            <View style={styles.scanArea}>
              <View style={styles.scanFrame}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
              </View>
              <Text style={styles.hint}>
                Point camera at a barcode
              </Text>
            </View>
          )}

          {/* Permission denied */}
          {hasPermission === false && (
            <View style={styles.permDenied}>
              <ScanLine size={48} color="#666" strokeWidth={1.5} />
              <Text style={styles.permDeniedText}>
                Camera permission denied
              </Text>
              <Text style={styles.permDeniedSub}>
                Type the barcode manually below
              </Text>
            </View>
          )}

          {/* Manual entry */}
          <View style={[styles.manualRow, {paddingBottom: insets.bottom + 16}]}>
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
              placeholder="Or type barcode..."
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
                  {color: manualCode.trim() ? '#fff' : 'rgba(255,255,255,0.4)'},
                ]}>
                Add
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...typeScale.title,
    color: '#fff',
    fontWeight: '700',
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 280,
    height: 160,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#fff',
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
  hint: {
    ...typeScale.caption,
    color: 'rgba(255,255,255,0.7)',
    marginTop: spacing.lg,
    fontWeight: '600',
  },
  permDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  permDeniedText: {
    ...typeScale.title,
    color: '#fff',
  },
  permDeniedSub: {
    ...typeScale.body,
    color: 'rgba(255,255,255,0.5)',
  },
  manualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.xl,
  },
  manualInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...typeScale.body,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  submitBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  submitText: {
    ...typeScale.body,
    fontWeight: '700',
  },
});
