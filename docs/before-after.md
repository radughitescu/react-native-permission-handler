# Before & After: react-native-permission-handler

## Scenario 1: Camera permission for a QR scanner screen

The user taps "Scan QR Code." The app needs camera permission with a production-quality flow:
pre-prompt, system dialog, denied/blocked handling, settings redirect, foreground re-check, and analytics.

---

## BEFORE (what a production app actually ships)

### File 1: `hooks/useCameraPermission.ts` — the reusable hook (~120 lines)

```tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, Platform, PermissionsAndroid } from 'react-native';
import {
  check,
  request,
  openSettings,
  PERMISSIONS,
  RESULTS,
  type PermissionStatus,
} from 'react-native-permissions';
import analytics from '../services/analytics';

const CAMERA_PERMISSION = Platform.select({
  ios: PERMISSIONS.IOS.CAMERA,
  android: PERMISSIONS.ANDROID.CAMERA,
})!;

type CameraPermissionState =
  | 'idle'
  | 'checking'
  | 'prePrompt'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'blocked'
  | 'blockedPrompt'
  | 'unavailable';

export function useCameraPermission(autoCheck = true) {
  const [state, setState] = useState<CameraPermissionState>('idle');
  const [nativeStatus, setNativeStatus] = useState<PermissionStatus | null>(null);
  const waitingForSettings = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  const isRequesting = useRef(false); // race condition guard

  // Check on mount
  useEffect(() => {
    if (autoCheck) {
      checkPermission();
    }
  }, []);

  // AppState listener for settings return
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        waitingForSettings.current
      ) {
        waitingForSettings.current = false;
        recheckAfterSettings();
      }
      appStateRef.current = nextAppState;
    });
    return () => subscription.remove();
  }, []);

  const checkPermission = useCallback(async () => {
    setState('checking');
    try {
      const result = await check(CAMERA_PERMISSION);
      setNativeStatus(result);

      switch (result) {
        case RESULTS.GRANTED:
        case RESULTS.LIMITED: // iOS 14+ partial access — treat as granted for camera
          setState('granted');
          break;
        case RESULTS.DENIED:
          setState('prePrompt');
          break;
        case RESULTS.BLOCKED:
          setState('blockedPrompt');
          break;
        case RESULTS.UNAVAILABLE:
          setState('unavailable');
          break;
      }
    } catch (error) {
      console.error('Permission check failed:', error);
      setState('idle');
    }
  }, []);

  const requestPermission = useCallback(async () => {
    // Guard against double-tap race condition
    if (isRequesting.current) return;
    isRequesting.current = true;

    setState('requesting');
    try {
      const result = await request(CAMERA_PERMISSION);
      setNativeStatus(result);

      switch (result) {
        case RESULTS.GRANTED:
        case RESULTS.LIMITED:
          setState('granted');
          analytics.track('permission_granted', { permission: 'camera' });
          break;
        case RESULTS.DENIED:
          setState('denied');
          analytics.track('permission_denied', { permission: 'camera' });
          break;
        case RESULTS.BLOCKED:
          setState('blockedPrompt');
          analytics.track('permission_blocked', { permission: 'camera' });
          break;
      }
    } catch (error) {
      console.error('Permission request failed:', error);
      setState('denied');
    } finally {
      isRequesting.current = false;
    }
  }, []);

  const dismissPrePrompt = useCallback(() => {
    setState('denied');
    analytics.track('permission_soft_deny', { permission: 'camera' });
    // Importantly: we did NOT call request(), so the system dialog is preserved
  }, []);

  const goToSettings = useCallback(async () => {
    setState('blocked');
    waitingForSettings.current = true;
    try {
      await openSettings();
    } catch (error) {
      console.error('Failed to open settings:', error);
      waitingForSettings.current = false;
      setState('blockedPrompt');
    }
  }, []);

  const recheckAfterSettings = useCallback(async () => {
    setState('checking');
    const result = await check(CAMERA_PERMISSION);
    setNativeStatus(result);

    if (result === RESULTS.GRANTED || result === RESULTS.LIMITED) {
      setState('granted');
      analytics.track('permission_granted_via_settings', { permission: 'camera' });
    } else {
      setState('blockedPrompt');
      analytics.track('permission_still_blocked_after_settings', { permission: 'camera' });
    }
  }, []);

  return {
    state,
    nativeStatus,
    isGranted: state === 'granted',
    isBlocked: state === 'blocked' || state === 'blockedPrompt',
    isDenied: state === 'denied',
    isChecking: state === 'checking',
    isUnavailable: state === 'unavailable',
    showPrePrompt: state === 'prePrompt',
    showBlockedPrompt: state === 'blockedPrompt',
    check: checkPermission,
    request: requestPermission,
    dismiss: dismissPrePrompt,
    openSettings: goToSettings,
  };
}
```

### File 2: `components/PermissionPrePrompt.tsx` — reusable pre-prompt modal (~60 lines)

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';

interface PrePromptProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PermissionPrePrompt({
  visible,
  title,
  message,
  confirmLabel = 'Continue',
  cancelLabel = 'Not Now',
  onConfirm,
  onCancel,
}: PrePromptProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity style={styles.button} onPress={onConfirm}>
            <Text style={styles.buttonText}>{confirmLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onCancel}>
            <Text style={styles.link}>{cancelLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    alignItems: 'center',
  },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
  message: { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 24 },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  link: { color: '#007AFF', fontSize: 15 },
});
```

### File 3: `components/PermissionBlockedPrompt.tsx` — reusable blocked modal (~55 lines)

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';

interface BlockedPromptProps {
  visible: boolean;
  title: string;
  message: string;
  settingsLabel?: string;
  onOpenSettings: () => void;
}

export function PermissionBlockedPrompt({
  visible,
  title,
  message,
  settingsLabel = 'Open Settings',
  onOpenSettings,
}: BlockedPromptProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity style={styles.button} onPress={onOpenSettings}>
            <Text style={styles.buttonText}>{settingsLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    alignItems: 'center',
  },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
  message: { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 24 },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
});
```

### File 4: `screens/QRScannerScreen.tsx` — the actual screen (~50 lines)

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useCameraPermission } from '../hooks/useCameraPermission';
import { PermissionPrePrompt } from '../components/PermissionPrePrompt';
import { PermissionBlockedPrompt } from '../components/PermissionBlockedPrompt';

export function QRScannerScreen() {
  const camera = useCameraPermission();

  if (camera.isChecking) {
    return (
      <View style={styles.center}>
        <Text>Checking camera permission...</Text>
      </View>
    );
  }

  if (camera.isGranted) {
    return <ActualQRScanner />;
  }

  if (camera.isUnavailable) {
    return (
      <View style={styles.center}>
        <Text>Camera is not available on this device.</Text>
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <PermissionPrePrompt
        visible={camera.showPrePrompt}
        title="Camera Access"
        message="We need your camera to scan QR codes. We don't store any images or video."
        onConfirm={camera.request}
        onCancel={camera.dismiss}
      />
      <PermissionBlockedPrompt
        visible={camera.showBlockedPrompt}
        title="Camera Blocked"
        message="Camera access was denied. Please enable it in your device settings."
        onOpenSettings={camera.openSettings}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
});
```

**Total: ~285 lines across 4 files** for a single permission (camera). And this is the *well-factored* version where a senior dev extracted reusable components. Most teams don't bother — they inline everything into each screen.

### But now you also need microphone permission for voice notes...

You can reuse the modal components, but you need **another hook**: `useMicrophonePermission.ts` — copy `useCameraPermission.ts`, change the permission constant and analytics strings. Another ~120 lines.

### And notification permission — which has a different API...

```tsx
// hooks/useNotificationPermission.ts — ~140 lines
// Can't reuse useCameraPermission because notifications use a
// completely different API: checkNotifications() / requestNotifications()
// instead of check() / request()

import { checkNotifications, requestNotifications, openSettings, RESULTS } from 'react-native-permissions';

export function useNotificationPermission(autoCheck = true) {
  // ... same state management pattern as useCameraPermission ...
  // ... but replace check() with checkNotifications() ...
  // ... and request() with requestNotifications(['alert', 'badge', 'sound']) ...
  // ... and on Android 13+, checkNotifications() never returns BLOCKED,
  //     so you need to call requestNotifications() to get accurate status ...
  // ... 140 lines later ...
}
```

### And now the video call screen needs camera + microphone together...

```tsx
// hooks/useVideoCallPermissions.ts — ~200 lines
// Sequential permission flow: ask camera first, then mic if camera granted.
// Must track state for BOTH permissions independently.
// Must handle: camera granted + mic blocked, camera blocked + mic never asked, etc.
// Must show the right modal for whichever permission is currently being handled.

export function useVideoCallPermissions() {
  const [cameraState, setCameraState] = useState<PermissionState>('idle');
  const [micState, setMicState] = useState<PermissionState>('idle');
  const [activePermission, setActivePermission] = useState<'camera' | 'mic' | null>(null);
  // ... 200 lines of orchestration logic ...
  // ... easy to introduce bugs where camera gets re-prompted after mic is denied ...
  // ... AppState listener needs to know WHICH permission to re-check ...
}
```

### Running total for a realistic app

| Screen / Feature | Files | Lines |
|-----------------|-------|-------|
| Camera (QR scanner) | hook + screen | ~170 |
| Microphone (voice notes) | hook + screen | ~170 |
| Notifications (opt-in) | hook + screen (different API) | ~190 |
| Location (maps) | hook + screen | ~170 |
| Video call (camera + mic) | orchestration hook + screen | ~250 |
| Shared modal components | 2 components | ~115 |
| **Total** | **11 files** | **~1,065 lines** |

And that's the well-organized version. The common version — where each screen has the logic inlined without reuse — easily hits **1,500+ lines** of permission code.

**What's still missing from all of this:**
- No shared state — if the camera was already granted on the QR screen, the video call screen re-checks and may briefly flash a loading state
- No handling for permission revocation while backgrounded (user goes to Settings independently)
- No handling for Android auto-revocation of unused permissions
- Tests would need to mock AppState, permission APIs, and timers for each hook individually

---

## AFTER (with react-native-permission-handler)

### Option A: Hook approach — full control over UI

```tsx
import React from 'react';
import { View, Text } from 'react-native';
import { usePermissionHandler } from 'react-native-permission-handler';
import { PERMISSIONS } from 'react-native-permissions';

export function QRScannerScreen() {
  const camera = usePermissionHandler({
    permission: PERMISSIONS.IOS.CAMERA,
    prePrompt: {
      title: 'Camera Access',
      message: "We need your camera to scan QR codes. We don't store any images or video.",
      confirmLabel: 'Continue',
      cancelLabel: 'Not Now',
    },
    blockedPrompt: {
      title: 'Camera Blocked',
      message: 'Camera access was denied. Please enable it in your device settings to scan QR codes.',
      settingsLabel: 'Open Settings',
    },
    onGrant: () => analytics.track('camera_granted'),
    onDeny: () => analytics.track('camera_denied'),
    onBlock: () => analytics.track('camera_blocked'),
  });

  if (camera.isChecking) return <LoadingSpinner />;
  if (camera.isGranted) return <ActualQRScanner />;
  if (camera.isUnavailable) return <Text>Camera not available on this device.</Text>;

  // Pre-prompt and blocked modals are handled automatically.
  // Or render your own UI using camera.state:
  return null;
}
```

**~30 lines.** The hook handles:
- Checking on mount
- Showing the pre-prompt before the system dialog
- Detecting blocked state
- Opening Settings
- Re-checking when the app returns from Settings
- Analytics callbacks
- All platform edge cases

### Option B: Declarative component — zero boilerplate

```tsx
import { PermissionGate } from 'react-native-permission-handler';
import { PERMISSIONS } from 'react-native-permissions';

export function QRScannerScreen() {
  return (
    <PermissionGate
      permission={PERMISSIONS.IOS.CAMERA}
      prePrompt={{
        title: 'Camera Access',
        message: "We need your camera to scan QR codes.",
      }}
      blockedPrompt={{
        title: 'Camera Blocked',
        message: 'Please enable camera in Settings.',
      }}
      fallback={<LoadingSpinner />}
    >
      <ActualQRScanner />
    </PermissionGate>
  );
}
```

**~18 lines.** The `<PermissionGate>` renders its children only when granted. Everything else is handled internally.

### Option C: Multiple permissions (e.g., video call = camera + mic)

#### Before: ~300 lines of sequential permission logic, two sets of modals, manual orchestration

#### After:

```tsx
import { useMultiplePermissions } from 'react-native-permission-handler';
import { PERMISSIONS } from 'react-native-permissions';

export function VideoCallScreen() {
  const permissions = useMultiplePermissions({
    permissions: [
      {
        permission: PERMISSIONS.IOS.CAMERA,
        prePrompt: { title: 'Camera', message: 'Needed for video calls.' },
        blockedPrompt: { title: 'Camera Blocked', message: 'Enable in Settings.' },
      },
      {
        permission: PERMISSIONS.IOS.MICROPHONE,
        prePrompt: { title: 'Microphone', message: 'Needed for audio in calls.' },
        blockedPrompt: { title: 'Mic Blocked', message: 'Enable in Settings.' },
      },
    ],
    strategy: 'sequential', // ask one at a time
  });

  if (permissions.allGranted) return <VideoCallUI />;

  // Prompts shown automatically in sequence.
  return null;
}
```

---

---

## Scenario 2: Realistic app with 5 permission flows

An app with camera, microphone, notifications, location, and a video call screen (camera + mic together).

### BEFORE: 11 files, ~1,065 lines (well-factored) or ~1,500 lines (inlined)

See breakdown above. Each permission needs its own hook with AppState management, race condition guards, analytics wiring, and platform edge case handling. The notification hook uses a completely different API. The video call hook orchestrates two permissions sequentially.

### AFTER: 5 screens, ~150 lines of config total

```tsx
// screens/QRScannerScreen.tsx
const camera = usePermissionHandler({
  permission: PERMISSIONS.IOS.CAMERA,
  prePrompt: { title: 'Camera Access', message: 'We need camera for QR codes.' },
  blockedPrompt: { title: 'Camera Blocked', message: 'Enable in Settings.' },
  onGrant: () => analytics.track('camera_granted'),
});

// screens/VoiceNotesScreen.tsx
const mic = usePermissionHandler({
  permission: PERMISSIONS.IOS.MICROPHONE,
  prePrompt: { title: 'Microphone', message: 'Needed to record voice notes.' },
  blockedPrompt: { title: 'Mic Blocked', message: 'Enable in Settings.' },
  onGrant: () => analytics.track('mic_granted'),
});

// screens/NotificationOptIn.tsx — same hook, different API handled transparently
const notifications = usePermissionHandler({
  permission: 'notifications', // library detects this and uses checkNotifications/requestNotifications
  prePrompt: { title: 'Stay Updated', message: "We'll only send important updates." },
  blockedPrompt: { title: 'Notifications Blocked', message: 'Enable in Settings.' },
  onGrant: () => analytics.track('notifications_granted'),
});

// screens/MapScreen.tsx
const location = usePermissionHandler({
  permission: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
  prePrompt: { title: 'Location', message: 'Needed to show nearby places.' },
  blockedPrompt: { title: 'Location Blocked', message: 'Enable in Settings.' },
  onGrant: () => analytics.track('location_granted'),
});

// screens/VideoCallScreen.tsx — multi-permission, handled in one call
const videoPerms = useMultiplePermissions({
  permissions: [
    {
      permission: PERMISSIONS.IOS.CAMERA,
      prePrompt: { title: 'Camera', message: 'Needed for video.' },
      blockedPrompt: { title: 'Camera Blocked', message: 'Enable in Settings.' },
    },
    {
      permission: PERMISSIONS.IOS.MICROPHONE,
      prePrompt: { title: 'Microphone', message: 'Needed for audio.' },
      blockedPrompt: { title: 'Mic Blocked', message: 'Enable in Settings.' },
    },
  ],
  strategy: 'sequential',
  onAllGranted: () => analytics.track('video_call_permissions_ready'),
});
```

No hooks to write. No AppState listeners. No race condition guards. No separate notification API handling. No multi-permission orchestrator. Just config.

---

## Summary of Benefits

| Aspect | Before (realistic) | After |
|--------|-------------------|-------|
| **Lines of permission code** (5-feature app) | ~1,065 (well-factored) to ~1,500 (inlined) | ~150 lines of config |
| **Files dedicated to permissions** | 11 files (5 hooks + 2 shared components + 4 screens) | 0 extra files (config lives in each screen) |
| **Per-permission hook code** | ~120-140 lines each, copy-pasted and tweaked | 0 — the library is the hook |
| **Notification permission** | Separate hook with different API (checkNotifications) | Same `usePermissionHandler` — library detects and routes |
| **Multi-permission orchestration** | ~200-line custom hook per combination | `useMultiplePermissions` with strategy option |
| **Race condition handling** | Manual ref guards in every hook | Built into the state machine |
| **AppState foreground re-check** | Manual listener + ref tracking in every hook | Automatic after `openSettings()` |
| **Analytics** | Wire into every hook's every branch | `onGrant`, `onDeny`, `onBlock` callbacks |
| **Shared state across screens** | Not handled — each hook checks independently | State machine ensures consistency |
| **Permission revocation while backgrounded** | Not handled in most implementations | Detectable via foreground re-check option |
| **Testing** | Mock AppState, permissions, timers per hook | Pure state machine tests + mock permissions once |
| **New permission added to the app** | Copy a hook, modify, wire up, test | Add ~10 lines of config to a screen |
