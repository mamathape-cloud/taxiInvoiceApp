import React, { useEffect, useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { initDB, hasCompanySetup } from './database/db';
import SetupScreen from './screens/SetupScreen';
import Dashboard from './screens/Dashboard';
import Customers from './screens/Customers';
import Invoices from './screens/Invoices';
import Reports from './screens/Reports';
import GenerateInvoice from './screens/GenerateInvoice';
import InvoicePreviewScreen from './screens/InvoicePreviewScreen';
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
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#3949ab" />
        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <BootstrapContext.Provider value={{ refreshCompany }}>
      <NavigationContainer>
        <Stack.Navigator
          key={hasCompany ? 'app' : 'setup'}
          initialRouteName={hasCompany ? 'Dashboard' : 'Setup'}
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
            name="Dashboard"
            component={Dashboard}
            options={{ title: 'Dashboard', headerBackVisible: false }}
          />
          <Stack.Screen name="Customers" component={Customers} options={{ title: 'Customers' }} />
          <Stack.Screen name="Invoices" component={Invoices} options={{ title: 'Invoices' }} />
          <Stack.Screen name="Reports" component={Reports} options={{ title: 'Reports' }} />
          <Stack.Screen
            name="GenerateInvoice"
            component={GenerateInvoice}
            options={{ title: 'Generate Invoice' }}
          />
          <Stack.Screen
            name="InvoicePreview"
            component={InvoicePreviewScreen}
            options={{ title: 'Invoice Preview' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="dark" />
    </BootstrapContext.Provider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f6fa' },
});
