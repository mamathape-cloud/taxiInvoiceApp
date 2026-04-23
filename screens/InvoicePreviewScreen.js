import React, { useState, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import InvoicePreview from '../components/InvoicePreview';
import { getCompany, getInvoiceByIdWithDetails } from '../database/db';

export default function InvoicePreviewScreen({ route }) {
  const invoiceId = route.params?.invoiceId;
  const [company, setCompany] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!invoiceId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [c, inv] = await Promise.all([getCompany(), getInvoiceByIdWithDetails(invoiceId)]);
      setCompany(c);
      setInvoice(inv);
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3949ab" />
      </View>
    );
  }

  if (!invoice) {
    return (
      <View style={styles.center}>
        <Text style={styles.err}>Invoice not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <InvoicePreview company={company} invoice={invoice} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  err: { color: '#666' },
});
