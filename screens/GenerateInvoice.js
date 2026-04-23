import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import InvoiceForm from '../components/InvoiceForm';

export default function GenerateInvoice({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>New Invoice</Text>
      <InvoiceForm
        onSaved={({ id }) => {
          navigation.replace('InvoicePreview', { invoiceId: id });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a237e',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
});
