import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getCompany, getInvoicesInRange, getInvoicesByDate } from '../database/db';

function padDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function monthRange(date) {
  const y = date.getFullYear();
  const mo = date.getMonth() + 1;
  const m = String(mo).padStart(2, '0');
  const start = `${y}-${m}-01`;
  const last = new Date(y, mo, 0).getDate();
  const end = `${y}-${m}-${String(last).padStart(2, '0')}`;
  return { start, end };
}

function sumAmounts(rows) {
  return rows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
}

export default function Dashboard({ navigation }) {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [monthTrips, setMonthTrips] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dayRevenue, setDayRevenue] = useState(0);
  const [showPicker, setShowPicker] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const c = await getCompany();
      setCompany(c);
      const now = new Date();
      const { start, end } = monthRange(now);
      const monthInv = await getInvoicesInRange(start, end);
      setMonthRevenue(sumAmounts(monthInv));
      setMonthTrips(monthInv.length);

      const dayStr = padDate(selectedDate);
      const dayInv = await getInvoicesByDate(dayStr);
      setDayRevenue(sumAmounts(dayInv));
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onDateChange = (_, d) => {
    if (Platform.OS !== 'ios') setShowPicker(false);
    if (d) setSelectedDate(d);
  };

  if (loading && !company) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3949ab" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.brand}>
        {company?.logo ? (
          <Image source={{ uri: company.logo }} style={styles.logo} resizeMode="contain" />
        ) : (
          <View style={styles.logoPlaceholder} />
        )}
        <Text style={styles.companyName}>{company?.company_name || 'Company'}</Text>
      </View>

      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>This month</Text>
        <Text style={styles.statBig}>₹ {monthRevenue.toFixed(2)}</Text>
        <Text style={styles.statLabel}>Current Month Revenue</Text>
        <View style={styles.divider} />
        <Text style={styles.statBig}>{monthTrips}</Text>
        <Text style={styles.statLabel}>Number of Trips</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Selected day</Text>
        <Pressable style={styles.dateBtn} onPress={() => setShowPicker(true)}>
          <Text style={styles.dateBtnText}>{padDate(selectedDate)}</Text>
        </Pressable>
        {showPicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
          />
        )}
        <Text style={styles.dayRevLabel}>Revenue for selected date</Text>
        <Text style={styles.dayRevVal}>₹ {dayRevenue.toFixed(2)}</Text>
      </View>

      <Pressable
        style={styles.primaryBtn}
        onPress={() => navigation.navigate('GenerateInvoice')}
      >
        <Text style={styles.primaryBtnText}>Generate Invoice</Text>
      </Pressable>

      <View style={styles.navGrid}>
        <Pressable
          style={styles.navCard}
          onPress={() => navigation.navigate('Customers')}
        >
          <Text style={styles.navCardTitle}>Customers</Text>
          <Text style={styles.navCardSub}>Manage customer list</Text>
        </Pressable>
        <Pressable
          style={styles.navCard}
          onPress={() => navigation.navigate('Invoices')}
        >
          <Text style={styles.navCardTitle}>Invoices</Text>
          <Text style={styles.navCardSub}>View all invoices</Text>
        </Pressable>
        <Pressable
          style={[styles.navCard, styles.navCardWide]}
          onPress={() => navigation.navigate('Reports')}
        >
          <Text style={styles.navCardTitle}>Reports</Text>
          <Text style={styles.navCardSub}>Daily, monthly, yearly summaries</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f5f6fa' },
  content: { padding: 20, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  brand: { alignItems: 'center', marginBottom: 20 },
  logo: { width: 120, height: 120, borderRadius: 16, backgroundColor: '#fff' },
  logoPlaceholder: { width: 120, height: 120, borderRadius: 16, backgroundColor: '#e0e0e0' },
  companyName: { marginTop: 12, fontSize: 22, fontWeight: '800', color: '#1a237e', textAlign: 'center' },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e8e8f0',
  },
  statsTitle: { fontSize: 13, color: '#666', fontWeight: '600', marginBottom: 8 },
  statBig: { fontSize: 28, fontWeight: '800', color: '#00897b' },
  statLabel: { fontSize: 14, color: '#444', marginTop: 4 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 16 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e8e8f0',
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 10 },
  dateBtn: {
    backgroundColor: '#f0f4ff',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dce3ff',
  },
  dateBtnText: { fontSize: 16, fontWeight: '700', color: '#1a237e' },
  dayRevLabel: { marginTop: 14, color: '#666' },
  dayRevVal: { fontSize: 22, fontWeight: '800', color: '#3949ab', marginTop: 4 },
  primaryBtn: {
    backgroundColor: '#3949ab',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 17 },
  navGrid: { gap: 12 },
  navCard: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e8e8f0',
  },
  navCardWide: {},
  navCardTitle: { fontSize: 17, fontWeight: '700', color: '#1a237e' },
  navCardSub: { fontSize: 13, color: '#666', marginTop: 4 },
});
