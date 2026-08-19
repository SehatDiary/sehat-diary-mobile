import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { COLORS, FONT_SIZES } from "../constants";

// A labelled row of action tiles, grouped under a heading.
//
// Two per row rather than four: this screen is read by a 65-year-old, and a
// bigger touch target with a label that fits on one line is worth more here than
// fitting more actions across. Tiles grow taller if a label wraps rather than
// the label shrinking to fit.
//
// The icon is whatever it is handed — emoji today, so there is no asset
// dependency. Swapping in an illustrated icon later is a change at the call
// site, not here.

export interface TileAction {
  key: string;
  icon: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

export default function ActionTiles({
  title,
  actions,
}: {
  title: string;
  actions: TileAction[];
}) {
  if (actions.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>

      <View style={styles.row}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.key}
            style={[styles.tile, action.disabled && styles.tileDisabled]}
            onPress={action.onPress}
            disabled={action.disabled}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            accessibilityState={{ disabled: !!action.disabled }}
          >
            <View style={styles.iconHolder}>
              <Text style={styles.icon}>{action.icon}</Text>
            </View>
            <Text
              style={[styles.label, action.disabled && styles.labelDisabled]}
              numberOfLines={2}
            >
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.medium,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  tile: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  tileDisabled: {
    opacity: 0.45,
  },
  iconHolder: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  icon: {
    fontSize: 26,
  },
  label: {
    fontSize: FONT_SIZES.medium,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
  },
  labelDisabled: {
    color: COLORS.textSecondary,
  },
});
