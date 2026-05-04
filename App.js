import React, { useEffect, useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initDB, hasCompanySetup } from './database/db';
import SetupScreen from './screens/SetupScreen';
import AppDrawer from './navigation/AppDrawer';
import { BootstrapContext } from './context/BootstrapContext';

const Stack = createNativeStackNavigator();

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [hasCompany, setHasCompany] = useState(false);

  const refreshCompany = useCallback(async () => {
    const ok = await hasCompanySetup();
    setHasCompany(ok);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await initDB();
        const ok = await hasCompanySetup();
        if (!cancelled) {
          setHasCompany(ok);
          setDbReady(true);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setDbReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!dbReady) {
    return (
      <GestureHandlerRootView style={styles.flex}>
        <View style={styles.splash}>
          <ActivityIndicator size="large" color="#3949ab" />
          <StatusBar style="dark" />
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <BootstrapContext.Provider value={{ refreshCompany }}>
        <NavigationContainer>
          <Stack.Navigator
            key={hasCompany ? 'app' : 'setup'}
            initialRouteName={hasCompany ? 'Main' : 'Setup'}
            screenOptions={{
              headerStyle: { backgroundColor: '#fff' },
              headerTintColor: '#1a237e',
              headerTitleStyle: { fontWeight: '700' },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: '#f5f6fa' },
            }}
          >
            <Stack.Screen
              name="Setup"
              component={SetupScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Main"
              component={AppDrawer}
              options={{ headerShown: false }}
            />
          </Stack.Navigator>
        </NavigationContainer>
        <StatusBar style="dark" />
      </BootstrapContext.Provider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  splash: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f6fa' },
});
