# Guide: iOS Privacy Manifest (PrivacyInfo.xcprivacy)

**Applies to:** iOS 17.2+ App Store submissions built with Xcode 16+.

## Background

Since April 2024, Apple requires apps to declare their use of "Required Reason APIs" in a
`PrivacyInfo.xcprivacy` file at the app target level. Xcode 16 (which became mandatory for new
App Store submissions in mid-2025) validates this declaration at build and upload time. If your
app uses permission-gated system APIs — camera, microphone, location, photos, contacts, calendars
— without the right entries in `PrivacyInfo.xcprivacy`, builds will warn and submissions may
bounce with "undeclared API usage" errors.

`react-native-permissions` ships its own pod-level `PrivacyInfo` file, but Xcode 16's CocoaPods
integration does not always merge nested manifests into the app target. **The safe approach is
to declare everything at the app target level yourself**, rather than relying on automatic
merging.

## What this library handles

`react-native-permission-handler` is pure TypeScript with no native code — it has no pod and
ships no `PrivacyInfo.xcprivacy` of its own. The iOS APIs that trigger the Privacy Manifest
requirement are called by the engine adapter (usually `react-native-permissions` via the RNP
engine). You still need to declare the reasons in your app target.

## Boilerplate template

Copy this file into your Xcode project as `<YourAppTarget>/PrivacyInfo.xcprivacy`. Uncomment
only the entries for APIs your app actually touches — Apple wants a minimal, accurate manifest.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSPrivacyTracking</key>
  <false/>

  <key>NSPrivacyCollectedDataTypes</key>
  <array/>

  <key>NSPrivacyAccessedAPITypes</key>
  <array>
    <!-- File timestamp — needed when reading photo EXIF or saving cached files.
         NSPrivacyAccessedAPICategoryFileTimestamp reason codes: C617.1, 3B52.1, 0A2A.1, 3D61.1 -->
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryFileTimestamp</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <string>C617.1</string>
      </array>
    </dict>

    <!-- System boot time — common transitive usage. 35F9.1 / 8FFB.1 / 3D61.1 -->
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategorySystemBootTime</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <string>35F9.1</string>
      </array>
    </dict>

    <!-- Disk space — needed by libraries that cache to disk. E174.1 / 85F4.1 -->
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryDiskSpace</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <string>E174.1</string>
      </array>
    </dict>

    <!-- User defaults — needed by libraries using NSUserDefaults / AsyncStorage. CA92.1 / 1C8F.1 -->
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <string>CA92.1</string>
      </array>
    </dict>
  </array>
</dict>
</plist>
```

**Permission usage descriptions go in `Info.plist`, not here.** Apple's Privacy Manifest is
about *Required Reason APIs* (non-privacy system calls like file timestamps), not about the
permission prompts themselves. Your camera / microphone / location usage descriptions
(`NSCameraUsageDescription`, etc.) belong in the regular `Info.plist` as always.

## Recommended `Info.plist` entries

For the permissions this library routes through the RNP or Expo engine, add the matching usage
strings to `Info.plist`:

| Permission | `Info.plist` key |
|-----------|------------------|
| Camera | `NSCameraUsageDescription` |
| Microphone | `NSMicrophoneUsageDescription` |
| Photo library | `NSPhotoLibraryUsageDescription` |
| Photo library add-only | `NSPhotoLibraryAddUsageDescription` |
| Location (when in use) | `NSLocationWhenInUseUsageDescription` |
| Location (always / background) | `NSLocationAlwaysAndWhenInUseUsageDescription` |
| Contacts | `NSContactsUsageDescription` |
| Calendars | `NSCalendarsUsageDescription` (iOS 16 and below) |
| Calendars (full) | `NSCalendarsFullAccessUsageDescription` (iOS 17+) |
| Calendars (write-only) | `NSCalendarsWriteOnlyAccessUsageDescription` (iOS 17+) |
| Reminders | `NSRemindersUsageDescription` (iOS 16 and below) |
| Reminders (full) | `NSRemindersFullAccessUsageDescription` (iOS 17+) |
| Motion & Fitness | `NSMotionUsageDescription` |
| Bluetooth | `NSBluetoothAlwaysUsageDescription` |
| Speech recognition | `NSSpeechRecognitionUsageDescription` |
| Face ID | `NSFaceIDUsageDescription` |
| App Tracking Transparency | `NSUserTrackingUsageDescription` |

These strings are what the user sees in the system permission prompt. Keep them short, specific,
and truthful — Apple's App Review rejects vague or boilerplate descriptions.

## Debugging build failures

If Xcode uploads fail with "This app attempts to access privacy-sensitive data without a usage
description" or "The app's Info.plist file should contain a `...UsageDescription` key":

1. Check `Info.plist` has the relevant usage description key.
2. Check `PrivacyInfo.xcprivacy` exists at the app target level (not just inside a pod).
3. Run `pod install --repo-update` and check that your app's Xcode project references the
   updated manifest.
4. For new-architecture (bridgeless) apps, ensure the React Native version and
   `react-native-permissions` version are both recent enough to ship their own PrivacyInfo.

If a third-party pod ships an incompatible PrivacyInfo, Xcode 16 may emit warnings about the
merged manifest. The workaround is to declare the union of all entries at the app target level
so the app manifest is authoritative.

## Upstream references

- [Apple: Describing data use in privacy manifests](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_data_use_in_privacy_manifests)
- [Apple: Required reasons for API use](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api)
- [react-native-permissions Privacy Manifest guide](https://github.com/zoontek/react-native-permissions#privacy-manifest)
