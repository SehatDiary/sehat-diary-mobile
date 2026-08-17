import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import RootNavigator from "./src/navigation/RootNavigator";
import { navigationRef } from "./src/navigation/navigationRef";
import { useLocaleStore } from "./src/store/localeStore";
import { queryClient } from "./src/api/queryClient";

export default function App() {
  const locale = useLocaleStore((s) => s.locale);
  const loadLocale = useLocaleStore((s) => s.loadLocale);

  useEffect(() => {
    loadLocale();
  }, [loadLocale]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <NavigationContainer key={locale} ref={navigationRef}>
            <RootNavigator />
          </NavigationContainer>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
