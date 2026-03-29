import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { COLORS, FONT_SIZES } from "../../constants";
import { useCreateFamilyMember } from "../../hooks/useFamilyMembers";
import { CaregiverStackParamList } from "../../types";
import i18n from "../../i18n";

type Nav = StackNavigationProp<CaregiverStackParamList, "AddFamilyMember">;

const GENDER_OPTIONS = [
  { label: () => i18n.t("addMember.male"), value: "male" },
  { label: () => i18n.t("addMember.female"), value: "female" },
  { label: () => i18n.t("addMember.other"), value: "other" },
];

export default function AddFamilyMemberScreen() {
  const navigation = useNavigation<Nav>();
  const createMember = useCreateFamilyMember();

  const [name, setName] = useState("");
  const [relation, setRelation] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [conditionInput, setConditionInput] = useState("");
  const [conditions, setConditions] = useState<string[]>([]);

  const addCondition = () => {
    const trimmed = conditionInput.trim();
    if (trimmed && !conditions.includes(trimmed)) {
      setConditions([...conditions, trimmed]);
      setConditionInput("");
    }
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!name.trim() || !relation.trim()) {
      Alert.alert(i18n.t("common.error"), "Name and relation are required.");
      return;
    }

    createMember.mutate(
      {
        name: name.trim(),
        relation: relation.trim(),
        age: age ? parseInt(age, 10) : undefined,
        gender: gender ?? undefined,
        chronic_conditions: conditions.length > 0 ? conditions : undefined,
      },
      {
        onSuccess: () => navigation.goBack(),
      }
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>{"←"}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{i18n.t("addMember.title")}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>{i18n.t("addMember.name")} *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder={i18n.t("addMember.namePlaceholder")}
          placeholderTextColor={COLORS.textSecondary}
        />

        <Text style={styles.label}>{i18n.t("addMember.relation")} *</Text>
        <TextInput
          style={styles.input}
          value={relation}
          onChangeText={setRelation}
          placeholder={i18n.t("addMember.relationPlaceholder")}
          placeholderTextColor={COLORS.textSecondary}
        />

        <Text style={styles.label}>{i18n.t("addMember.age")}</Text>
        <TextInput
          style={styles.input}
          value={age}
          onChangeText={setAge}
          placeholder={i18n.t("addMember.agePlaceholder")}
          placeholderTextColor={COLORS.textSecondary}
          keyboardType="number-pad"
        />

        <Text style={styles.label}>{i18n.t("addMember.gender")}</Text>
        <View style={styles.genderRow}>
          {GENDER_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.genderChip, gender === opt.value && styles.genderChipActive]}
              onPress={() => setGender(gender === opt.value ? null : opt.value)}
            >
              <Text
                style={[styles.genderText, gender === opt.value && styles.genderTextActive]}
              >
                {opt.label()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>{i18n.t("addMember.chronicConditions")}</Text>
        <View style={styles.conditionInputRow}>
          <TextInput
            style={[styles.input, styles.conditionInput]}
            value={conditionInput}
            onChangeText={setConditionInput}
            placeholder={i18n.t("addMember.chronicConditionsPlaceholder")}
            placeholderTextColor={COLORS.textSecondary}
            onSubmitEditing={addCondition}
          />
          <TouchableOpacity style={styles.addConditionBtn} onPress={addCondition}>
            <Text style={styles.addConditionText}>{i18n.t("addMember.addCondition")}</Text>
          </TouchableOpacity>
        </View>
        {conditions.length > 0 && (
          <View style={styles.conditionsWrap}>
            {conditions.map((c, i) => (
              <TouchableOpacity key={i} style={styles.conditionTag} onPress={() => removeCondition(i)}>
                <Text style={styles.conditionTagText}>{c} ✕</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveButton, createMember.isPending && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={createMember.isPending}
        >
          <Text style={styles.saveText}>
            {createMember.isPending ? i18n.t("addMember.saving") : i18n.t("addMember.save")}
          </Text>
        </TouchableOpacity>

        {createMember.isError && (
          <Text style={styles.errorText}>{i18n.t("common.error")}</Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  backText: {
    fontSize: 24,
    color: COLORS.white,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xlarge,
    fontWeight: "bold",
    color: COLORS.white,
  },
  form: {
    padding: 20,
    paddingBottom: 40,
  },
  label: {
    fontSize: FONT_SIZES.medium,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: FONT_SIZES.medium,
    color: COLORS.text,
  },
  genderRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  genderChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  genderChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  genderText: {
    fontSize: FONT_SIZES.small,
    color: COLORS.text,
  },
  genderTextActive: {
    color: COLORS.white,
    fontWeight: "600",
  },
  conditionInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  conditionInput: {
    flex: 1,
  },
  addConditionBtn: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  addConditionText: {
    color: COLORS.white,
    fontWeight: "600",
    fontSize: FONT_SIZES.small,
  },
  conditionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  conditionTag: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  conditionTagText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.small,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 32,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.large,
    fontWeight: "bold",
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONT_SIZES.small,
    textAlign: "center",
    marginTop: 12,
  },
});
