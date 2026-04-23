import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { saveCompany } from '../database/db';
import { useBootstrap } from '../context/BootstrapContext';

export default function SetupScreen({ navigation }) {
  const { refreshCompany } = useBootstrap();
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [logo, setLogo] = useState('');
  const [signature, setSignature] = useState('');
  const [loading, setLoading] = useState(false);

  const pickImage = async (setter) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission', 'Photo library access is required.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
    });
    if (!res.canceled && res.assets?.[0]) {
      const a = res.assets[0];
      if (a.base64) {
        const mime = a.mimeType || 'image/jpeg';
        setter(`data:${mime};base64,${a.base64}`);
      } else if (a.uri) {
        setter(a.uri);
      }
    }
  };

  const handleSave = async () => {
    if (!companyName.trim()) {
      Alert.alert('Validation', 'Company name is required.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Validation', 'Phone is required.');
      return;
    }
    setLoading(true);
    try {
      await saveCompany({
        company_name: companyName.trim(),
        logo: logo || null,
        signature: signature || null,
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim(),
      });
      await refreshCompany();
      Alert.alert('Success', 'Company profile saved.');
      navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not save company details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Company Setup</Text>
      <Text style={styles.sub}>One-time setup. You can update details later from settings if you add that flow.</Text>

      <Text style={styles.label}>Company Name *</Text>
      <TextInput
        style={styles.input}
        value={companyName}
        onChangeText={setCompanyName}
        placeholder="Your taxi company"
        placeholderTextColor="#999"
      />

      <Text style={styles.label}>Address</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={address}
        onChangeText={setAddress}
        placeholder="Full address"
        placeholderTextColor="#999"
        multiline
      />

      <Text style={styles.label}>Phone *</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        placeholder="Contact number"
        placeholderTextColor="#999"
        keyboardType="phone-pad"
      />

      <Text style={styles.label}>Email (optional)</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="company@example.com"
        placeholderTextColor="#999"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={styles.label}>Logo</Text>
      <Pressable style={styles.pickBtn} onPress={() => pickImage(setLogo)}>
        <Text style={styles.pickBtnText}>Choose logo image</Text>
      </Pressable>
      {logo ? <Image source={{ uri: logo }} style={styles.preview} resizeMode="contain" /> : null}

      <Text style={styles.label}>Signature</Text>
      <Pressable style={styles.pickBtn} onPress={() => pickImage(setSignature)}>
        <Text style={styles.pickBtnText}>Choose signature image</Text>
      </Pressable>
      {signature ? (
        <Image source={{ uri: signature }} style={styles.sigPreview} resizeMode="contain" />
      ) : null}

      <Pressable
        style={[styles.saveBtn, loading && styles.disabled]}
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>Save & Continue</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f5f6fa' },
  content: { padding: 20, paddingTop: 56, paddingBottom: 40 },
  heading: { fontSize: 26, fontWeight: '800', color: '#1a237e', marginBottom: 8 },
  sub: { color: '#666', marginBottom: 20, lineHeight: 22 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginTop: 14, marginBottom: 6 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
  pickBtn: {
    backgroundColor: '#e8eaf6',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  pickBtnText: { color: '#3949ab', fontWeight: '700' },
  preview: { width: '100%', height: 100, marginTop: 10, borderRadius: 8, backgroundColor: '#fff' },
  sigPreview: { width: 180, height: 72, marginTop: 10, alignSelf: 'flex-start', backgroundColor: '#fff' },
  saveBtn: {
    marginTop: 32,
    backgroundColor: '#3949ab',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabled: { opacity: 0.7 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
