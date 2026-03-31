import "react-native-gesture-handler";
import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/context/AuthContext";
import { BabyProvider } from "./src/context/BabyContext";
import RootNavigator from "./src/navigation/RootNavigator";

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <BabyProvider>
          <RootNavigator />
          <StatusBar style="dark" />
        </BabyProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
