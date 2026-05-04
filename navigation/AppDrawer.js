import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CommonActions, useNavigation } from '@react-navigation/native';
import ConfirmModal from '../components/ConfirmModal';
import Dashboard from '../screens/Dashboard';
import Customers from '../screens/Customers';
import Invoices from '../screens/Invoices';
import Reports from '../screens/Reports';
import SettingsScreen from '../screens/SettingsScreen';
import GenerateInvoice from '../screens/GenerateInvoice';
import InvoicePreviewScreen from '../screens/InvoicePreviewScreen';
import { clearAllAppData } from '../database/db';
import { useBootstrap } from '../context/BootstrapContext';

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

const MENU = [
  { key: 'Dashboard', label: 'Dashboard' },
  { key: 'Customers', label: 'Customers' },
  { key: 'Invoices', label: 'Invoices' },
  { key: 'Reports', label: 'Reports' },
  { key: 'Settings', label: 'Settings' },
];

function DrawerMenuContent(props) {
  const rootNav = props.navigation.getParent();
  const { refreshCompany } = useBootstrap();
  const [logoutOpen, setLogoutOpen] = React.useState(false);
  const [logoutBusy, setLogoutBusy] = React.useState(false);

  const go = (screen) => {
    props.navigation.navigate('Main', { screen });
    props.navigation.closeDrawer();
  };

  const runLogout = async () => {
    setLogoutBusy(true);
    try {
      await clearAllAppData();
      await refreshCompany();
      setLogoutOpen(false);
      props.navigation.closeDrawer();
      rootNav?.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Setup' }],
        })
      );
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not clear local data.');
    } finally {
      setLogoutBusy(false);
    }
  };

  return (
    <>
      <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerScroll}>
        <Text style={styles.drawerTitle}>Menu</Text>
        {MENU.map((item) => (
          <Pressable
            key={item.key}
            style={styles.menuRow}
            onPress={() => go(item.key)}
          >
            <Text style={styles.menuText}>{item.label}</Text>
          </Pressable>
        ))}
        <View style={styles.divider} />
        <Pressable style={styles.logoutRow} onPress={() => setLogoutOpen(true)}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </DrawerContentScrollView>
      <ConfirmModal
        visible={logoutOpen}
        title="Log out?"
        message="This removes all local company, customer, and invoice data from this device. Continue?"
        confirmLabel="Log out"
        cancelLabel="Cancel"
        destructive
        loading={logoutBusy}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={runLogout}
      />
    </>
  );
}

function MainStackNavigator() {
  const navigation = useNavigation();

  const openMenu = () => {
    navigation.getParent()?.openDrawer?.();
  };

  return (
    <Stack.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#1a237e',
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: '#f5f6fa' },
        headerLeft: () => (
          <Pressable onPress={openMenu} style={styles.hamburger} hitSlop={12}>
            <Text style={styles.hamburgerIcon}>☰</Text>
          </Pressable>
        ),
      }}
    >
      <Stack.Screen
        name="Dashboard"
        component={Dashboard}
        options={{ title: 'Dashboard', headerBackVisible: false }}
      />
      <Stack.Screen name="Customers" component={Customers} options={{ title: 'Customers' }} />
      <Stack.Screen name="Invoices" component={Invoices} options={{ title: 'Invoices' }} />
      <Stack.Screen name="Reports" component={Reports} options={{ title: 'Reports' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
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
  );
}

export default function AppDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerMenuContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerStyle: { width: 280, backgroundColor: '#fff' },
      }}
    >
      <Drawer.Screen name="Main" component={MainStackNavigator} />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  drawerScroll: { paddingTop: 48, paddingBottom: 24 },
  drawerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a237e',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  menuRow: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  menuText: { fontSize: 16, color: '#222', fontWeight: '600' },
  divider: { height: 16 },
  logoutRow: { paddingVertical: 14, paddingHorizontal: 20 },
  logoutText: { fontSize: 16, color: '#c62828', fontWeight: '700' },
  hamburger: { marginLeft: 4, paddingVertical: 4, paddingRight: 12 },
  hamburgerIcon: { fontSize: 22, color: '#1a237e' },
});
