import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from "react-native";

/**
 * Scrollable container for any screen with text inputs.
 *
 * Android needs `softwareKeyboardLayoutMode: "resize"` in app.json to shrink
 * the window at all — with edge-to-edge enabled it does not by default, which
 * left fields sitting behind the keyboard. Once it resizes, the ScrollView
 * handles the rest, so no KeyboardAvoidingView behavior is wanted there;
 * setting one fights the native resize and causes jumping.
 *
 * iOS does not resize, so it gets `padding` plus
 * `automaticallyAdjustKeyboardInsets` to keep the focused field visible.
 */
export default function FormScreen({
  children,
  contentContainerStyle,
  style,
}: {
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <KeyboardAvoidingView
      style={[styles.flex, style]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={contentContainerStyle}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
