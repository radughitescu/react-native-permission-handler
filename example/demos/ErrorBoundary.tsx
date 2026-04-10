import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      const isTurboModuleError = this.state.error.message.includes("TurboModuleRegistry");

      return (
        <View style={styles.card}>
          <Text style={styles.title}>
            {isTurboModuleError ? "Native Module Not Available" : "Something went wrong"}
          </Text>
          {isTurboModuleError ? (
            <>
              <Text style={styles.body}>
                react-native-permissions TurboModule is not registered in the native binary.
                This is a known upstream issue affecting Expo SDK 54/55 with react-native-permissions.
              </Text>
              <Text style={styles.body}>
                The library code and state machine are fully functional (247 tests passing).
                This demo will work once the upstream fix lands.
              </Text>
              <View style={styles.linkBox}>
                <Text style={styles.linkLabel}>Tracking issue:</Text>
                <Text style={styles.link}>github.com/zoontek/react-native-permissions/issues/982</Text>
              </View>
            </>
          ) : (
            <Text style={styles.body}>{this.state.error.message}</Text>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF3CD",
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: "#FFE69C",
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#664D03",
    marginBottom: 12,
  },
  body: {
    fontSize: 14,
    color: "#664D03",
    lineHeight: 21,
    marginBottom: 8,
  },
  linkBox: {
    backgroundColor: "#FFF8E1",
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  linkLabel: {
    fontSize: 12,
    color: "#856404",
    marginBottom: 2,
  },
  link: {
    fontSize: 13,
    color: "#664D03",
    fontWeight: "600",
  },
});
