---
name: ticket
description: Start working on a GitHub issue — pulls main, creates branch, reads the ticket, plans and implements with TypeScript, lints, commits and creates PR.
argument-hint: <github-issue-url-or-number>
allowed-tools: Bash(git *) Bash(gh *) Bash(npx *) Bash(npm *) Read Write Edit Glob Grep Agent TaskCreate TaskUpdate AskUserQuestion
---

# Work on a GitHub Ticket

You are working on the Sehat Diary React Native mobile app (Expo). Follow this workflow exactly.

## Input

`$ARGUMENTS` — a GitHub issue URL (e.g. https://github.com/SehatDiary/sehat_diary/issues/42) or issue number (e.g. 42).

If only a number is given, default to the **backend repo**: `SehatDiary/sehat_diary`.
If a full URL is given, use whichever repo the URL points to.

## Step 1 — Setup branch (MUST do first, before anything else)

1. **Always start from a clean, up-to-date main branch.** Stash any uncommitted changes, switch to main, and pull:
   ```
   git stash --include-untracked 2>/dev/null; git checkout main && git pull
   ```
   This is mandatory — never skip this step. Never create a feature branch from another feature branch.
   If there were stashed changes, inform the user so they can `git stash pop` later if needed.
2. Fetch the issue details:
   ```
   gh issue view <number> --repo <owner/repo> --json title,body,labels,state,comments
   ```
3. Create and checkout a new branch from main:
   - Format: `feat/<short-kebab-description>`
   - Example: `feat/pending-actions-dashboard`
   - Keep it under 50 chars, lowercase, hyphens only
   - Do NOT include the issue number in the branch name

## Step 2 — Understand the ticket

- Read the issue description carefully.
- Identify dependencies — check if backend endpoints exist and are merged. If a dependency is not merged, ask the user whether to proceed or wait.
- Explore the codebase to understand existing screens, hooks, and API modules that will be modified or extended.
- Read existing screens with similar patterns to match conventions.

## Step 3 — Plan and implement

- Create tasks to track progress (TaskCreate/TaskUpdate).
- Implement the ticket requirements following these conventions:

### Project Structure

```
src/
  api/          — Axios API modules (one file per resource)
  components/   — Reusable UI components (caregiver/, common/, patient/ subdirs)
  constants/    — Colors, font sizes, API base URL
  hooks/        — Custom React Query hooks (one file per resource)
  i18n/         — Translations (en.ts, hi.ts)
  navigation/   — RootNavigator, CaregiverNavigator, PatientNavigator
  screens/      — Screen components (auth/, caregiver/, patient/ subdirs)
  store/        — Zustand stores (authStore.ts)
  types/        — TypeScript interfaces (index.ts)
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.81 + Expo 54 |
| Language | TypeScript (strict mode) |
| Navigation | @react-navigation/stack + bottom-tabs |
| State (auth) | Zustand + expo-secure-store |
| Server state | @tanstack/react-query 5 |
| HTTP | Axios with Bearer token interceptor |
| i18n | i18n-js (Hindi + English, Hindi default) |
| Camera/Gallery | expo-image-picker |
| Documents | expo-document-picker |
| Notifications | expo-notifications + FCM |

### Coding Conventions

- **TypeScript strict** — all props, state, and API responses must be typed.
- **Functional components only** — use `export default function ScreenName()` syntax, never arrow-function exports or class components.
- **StyleSheet.create()** — all styles inline via React Native StyleSheet. No CSS-in-JS libraries.
- **Colors from constants** — always use `COLORS.primary`, `COLORS.error`, etc. from `src/constants/index.ts`. Never hardcode hex values.
- **Font sizes from constants** — use `FONT_SIZES.small`, `FONT_SIZES.medium`, etc.
- **i18n for all user-facing text** — use `i18n.t('key')`. Add keys to both `src/i18n/en.ts` and `src/i18n/hi.ts`.
- **Bilingual UI** — Hindi is primary for patients. Every user-visible string must have Hindi translation.
- **Emoji icons** — the app uses emoji extensively for visual cues. Use Unicode escapes in JSX (e.g. `{"\u{1F48A}"}` for 💊). Follow existing patterns.
- **React Query for data fetching** — create custom hooks in `src/hooks/`. Use `useQuery` for reads, `useMutation` for writes.
- **Axios API modules** — one file per resource in `src/api/`. Import the shared client from `src/api/client.ts`.
- **IDs are numbers** — all entity IDs (`memberId`, `sessionId`, etc.) are `number`, not `string`.
- **Alert.alert()** for user-facing errors and confirmations.
- **ActivityIndicator** for loading states.
- **Navigation types** — add new screen params to `CaregiverStackParamList` or `PatientStackParamList` in `src/types/index.ts`.
- **Platform shadows** — use `shadowColor/shadowOffset/shadowOpacity/shadowRadius` for iOS + `elevation` for Android.

### Screen Pattern

Every screen should follow this structure:
```tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, ... } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { COLORS, FONT_SIZES } from "../../constants";
import { CaregiverStackParamList } from "../../types";
import i18n from "../../i18n";

type Nav = StackNavigationProp<CaregiverStackParamList, "MyScreen">;
type Route = RouteProp<CaregiverStackParamList, "MyScreen">;

export default function MyScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  // state, hooks, handlers

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>{"←"}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{i18n.t("myScreen.title")}</Text>
      </View>
      {/* content */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  // ...
});
```

### API Module Pattern

```tsx
import client from "./client";
import { MyResource } from "../types";

export const getResource = async (id: number): Promise<MyResource> => {
  const { data } = await client.get(`/resources/${id}`);
  return data.resource;
};

export const createResource = async (
  params: CreateResourceParams
): Promise<MyResource> => {
  const { data } = await client.post("/resources", params);
  return data.resource;
};
```

### Hook Pattern

```tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getResource, createResource } from "../api/resource";

export const useGetResource = (id: number) => {
  return useQuery({
    queryKey: ["resource", id],
    queryFn: () => getResource(id),
  });
};

export const useCreateResource = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createResource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource"] });
    },
  });
};
```

### Navigation Registration

When adding a new screen:
1. Add screen params to `CaregiverStackParamList` (or `PatientStackParamList`) in `src/types/index.ts`
2. Import and add `<Stack.Screen>` in the appropriate navigator (`src/navigation/CaregiverNavigator.tsx` or `PatientNavigator.tsx`)
3. Use typed navigation: `useNavigation<StackNavigationProp<CaregiverStackParamList, "ScreenName">>()`
4. Use typed route: `useRoute<RouteProp<CaregiverStackParamList, "ScreenName">>()`

### Multi-State Screens

For screens with distinct states (idle/loading/error/success), use sub-component pattern:
```tsx
export default function MyScreen() {
  const [state, setState] = useState<"idle" | "processing" | "done" | "error">("idle");

  if (state === "processing") return <ProcessingState />;
  if (state === "error") return <ErrorState onRetry={() => setState("idle")} />;
  if (state === "done") return <DoneState />;
  return <IdleState onSubmit={() => setState("processing")} />;
}
```

## Step 4 — Type check

Run TypeScript compiler to check for type errors:
```
npx tsc --noEmit
```
Fix all type errors before committing. Do not proceed until this passes cleanly.

## Step 5 — Commit

- Stage only relevant source files (never `.idea/`, `node_modules/`, `.DS_Store`, `.env`, or secrets).
- Commit message format (use HEREDOC for proper formatting):
  ```
  feat: short description of what was done

  Longer explanation if needed.

  Closes <owner/repo>#<issue-number>

  Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
  ```
- Use `Closes SehatDiary/sehat_diary#N` for cross-repo issue references.

## Step 6 — Create PR

After committing:
1. Push the branch: `git push -u origin <branch-name>`
2. Create the PR using `gh pr create` with:
   - Title: short description (under 70 chars), no issue number in title
   - Body: `## Summary` bullets, `## Test plan` checklist, `Closes <owner/repo>#<issue-number>`
   - Always end body with: `🤖 Generated with [Claude Code](https://claude.com/claude-code)`
3. Return the PR URL to the user.

## Hard rules

- Never skip type checking. Run `npx tsc --noEmit` before committing.
- Never commit code with TypeScript errors.
- Never hardcode colors or font sizes — use constants.
- Never hardcode user-facing strings — use i18n.
- Never put business logic in screens — use hooks and API modules.
- Never use `any` type — define proper interfaces.
- Never auto-save AI extraction — user must always confirm first (app-level rule).
- Never diagnose, interpret symptoms, or recommend medicines (app-level rule).
- Never add features beyond what the ticket asks for.
- Always add Hindi translations for every new user-facing string.
- Always register new screens in navigation and types.
- Always use double quotes for strings in TypeScript/TSX files.
