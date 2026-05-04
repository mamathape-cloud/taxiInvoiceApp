import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import CustomerForm from '../components/CustomerForm';
import { getCompany, saveCompany } from '../database/db';
import { useBootstrap } from '../context/BootstrapContext';

export default function SettingsScreen() {
  const { refreshCompany } = useBootstrap();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [row, setRow] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const c = await getCompany();
      setRow(c || {});
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onSave = async (values) => {
    if (!values.name.trim()) {
      Alert.alert('Validation', 'Company name is required.');
      return;
    }
    if (!values.phone.trim()) {
      Alert.alert('Validation', 'Phone is required.');
      return;
    }
    setSaving(true);
    try {
      await saveCompany({
        company_name: values.name.trim(),
        logo: row?.logo ?? null,
        signature: row?.signature ?? null,
        address: (values.address ?? '').trim(),
        phone: values.phone.trim(),
        email: (values.email ?? '').trim(),
      });
      await refreshCompany();
      await load();
      Alert.alert('Success', 'Company details updated.');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !row) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3949ab" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.hint}>
        Update your company profile. Logo and signature can be changed from the full setup flow if
        needed — here you can edit text fields. Use the menu to return to other screens.
      </Text>
      <CustomerForm
        initialValues={{
          name: row.company_name || '',
          address: row.address || '',
          phone: row.phone || '',
          email: row.email || '',
        }}
        onSubmit={(v) =>
          onSave({
            name: v.name,
            address: v.address,
            phone: v.phone,
            email: v.email,
          })
        }
        submitLabel="Save company details"
        loading={saving}
        showEmail
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f5f6fa' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hint: { color: '#666', marginBottom: 8, lineHeight: 20 },
});
