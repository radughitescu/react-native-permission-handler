import { Text, View } from "react-native";
import { LimitedUpgradePrompt, PermissionGate } from "react-native-permission-handler";
import { CONTACTS, styles } from "./shared";

export default function ContactsDemo() {
  return (
    <View style={styles.demoCard}>
      <Text style={styles.demoTitle}>Limited contacts + requestFullAccess</Text>
      <Text style={styles.demoSubtitle}>iOS 18+ limited contacts upgrade flow</Text>

      <PermissionGate
        permission={CONTACTS}
        prePrompt={{
          title: "Contacts Access",
          message: "We need your contacts so you can invite friends.",
        }}
        blockedPrompt={{
          title: "Contacts Blocked",
          message: "Please enable contacts access in Settings.",
          dismissLabel: "Maybe Later",
        }}
        fallback={<Text style={styles.fallback}>Checking permission...</Text>}
        renderLimited={(handler) => (
          <View>
            <View style={styles.limitedBox}>
              <Text style={styles.limitedText}>
                Limited access granted. You selected specific contacts only.
              </Text>
            </View>
            <LimitedUpgradePrompt
              visible
              title="Share more contacts?"
              message="You shared a few contacts. Choose more to find additional friends."
              upgradeLabel="Choose Contacts"
              dismissLabel="Keep current selection"
              onUpgrade={async () => {
                await handler.requestFullAccess();
              }}
              onDismiss={handler.dismissBlocked}
            />
          </View>
        )}
      >
        <View style={styles.grantedBox}>
          <Text style={styles.grantedText}>
            Contacts is granted! This content is only visible when permission is active.
          </Text>
        </View>
      </PermissionGate>
    </View>
  );
}
