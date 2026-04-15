import { describe, expect, it } from "vitest";
import { iosSettingsPath, iosSettingsUrl } from "./ios-settings-links";

describe("iosSettingsPath", () => {
  it("maps RNP-style camera constants to CAMERA", () => {
    expect(iosSettingsPath("ios.permission.CAMERA")).toBe("CAMERA");
  });

  it("maps plain 'camera' to CAMERA", () => {
    expect(iosSettingsPath("camera")).toBe("CAMERA");
  });

  it("maps microphone / record audio to MICROPHONE", () => {
    expect(iosSettingsPath("microphone")).toBe("MICROPHONE");
    expect(iosSettingsPath("android.permission.RECORD_AUDIO")).toBe("MICROPHONE");
  });

  it("maps photo library variants to PHOTOS", () => {
    expect(iosSettingsPath("ios.permission.PHOTO_LIBRARY")).toBe("PHOTOS");
    expect(iosSettingsPath("photo")).toBe("PHOTOS");
    expect(iosSettingsPath("mediaLibrary")).toBe("PHOTOS");
    expect(iosSettingsPath("android.permission.READ_MEDIA_IMAGES")).toBe("PHOTOS");
  });

  it("maps location variants to LOCATION", () => {
    expect(iosSettingsPath("ios.permission.LOCATION_WHEN_IN_USE")).toBe("LOCATION");
    expect(iosSettingsPath("location")).toBe("LOCATION");
    expect(iosSettingsPath("locationForeground")).toBe("LOCATION");
  });

  it("maps contacts / calendars / reminders / motion / bluetooth", () => {
    expect(iosSettingsPath("contacts")).toBe("CONTACTS");
    expect(iosSettingsPath("calendar")).toBe("CALENDARS");
    expect(iosSettingsPath("reminders")).toBe("REMINDERS");
    expect(iosSettingsPath("motion")).toBe("MOTION");
    expect(iosSettingsPath("bluetooth")).toBe("BLUETOOTH");
  });

  it("returns null for permissions without a dedicated iOS sub-page", () => {
    expect(iosSettingsPath("notifications")).toBeNull();
    expect(iosSettingsPath("tracking")).toBeNull();
    expect(iosSettingsPath("unknown")).toBeNull();
  });
});

describe("iosSettingsUrl", () => {
  it("builds App-Prefs URL for known permissions", () => {
    expect(iosSettingsUrl("camera")).toBe("App-Prefs:root=Privacy&path=CAMERA");
    expect(iosSettingsUrl("location")).toBe("App-Prefs:root=Privacy&path=LOCATION");
  });

  it("returns null for unknown permissions", () => {
    expect(iosSettingsUrl("notifications")).toBeNull();
  });
});
