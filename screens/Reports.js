import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import {
  getDailyReport,
  getMonthlyReport,
  getYearlyReport,
  getInvoicesInRange,
} from '../database/db';
import { buildReportHtml } from '../utils/invoiceHtml';

const TABS = ['Daily', 'Monthly', 'Yearly'];

function padDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function monthBounds(year, monthIndex0) {
  const y = year;
  const mo = monthIndex0 + 1;
  const m = String(mo).padStart(2, '0');
  const start = `${y}-${m}-01`;
  const last = new Date(y, mo, 0).getDate();
  const end = `${y}-${m}-${String(last).padStart(2, '0')}`;
  return { start, end };
}

function yearBounds(year) {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

export default function Reports() {
  const [tab, setTab] = useState(0);
  const [day, setDay] = useState(new Date());
  const [monthAnchor, setMonthAnchor] = useState(new Date());
  const [yearVal, setYearVal] = useState(new Date().getFullYear());
  const [showDayPicker, setShowDayPicker] = useState(false);

  const [summary, setSummary] = useState({ total_revenue: 0, trip_count: 0, by_driver: [] });
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const periodLabel = useMemo(() => {
    if (tab === 0) return `Day: ${padDate(day)}`;
    if (tab === 1) {
      const d = monthAnchor;
      return `Month: ${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    return `Year: ${yearVal}`;
  }, [tab, day, monthAnchor, yearVal]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let rep;
      let invRange;
      if (tab === 0) {
        const ds = padDate(day);
        rep = await getDailyReport(ds);
        invRange = { start: ds, end: ds };
      } else if (tab === 1) {
        rep = await getMonthlyReport(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1);
        invRange = monthBounds(monthAnchor.getFullYear(), monthAnchor.getMonth());
      } else {
        rep = await getYearlyReport(yearVal);
        invRange = yearBounds(yearVal);
      }
      setSummary(rep);
      const invs = await getInvoicesInRange(invRange.start, invRange.end);
      setInvoices(invs);
    } finally {
      setLoading(false);
    }
  }, [tab, day, monthAnchor, yearVal]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const downloadPdf = async () => {
    setPdfLoading(true);
    try {
      const title = `Taxi Report — ${TABS[tab]}`;
      const html = buildReportHtml({
        title,
        periodLabel,
        summary,
        invoices,
        driverRows: summary.by_driver,
      });
      const { uri } = await Print.printToFileAsync({ html });
      const safe = periodLabel.replace(/[^a-z0-9]+/gi, '_');
      const baseDir = FileSystem.documentDirectory;
      const dest =
        baseDir != null
          ? `${baseDir}Report_${TABS[tab]}_${safe}.pdf`
          : uri;
      if (baseDir != null) {
        await FileSystem.copyAsync({ from: uri, to: dest });
      }
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(dest, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share report',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Saved', dest);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not generate report PDF.');
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {TABS.map((t, i) => (
          <Pressable
            key={t}
            style={[styles.tab, tab === i && styles.tabActive]}
            onPress={() => setTab(i)}
          >
            <Text style={[styles.tabText, tab === i && styles.tabTextActive]}>{t}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 0 && (
        <View style={styles.controls}>
          <Pressable style={styles.dateBtn} onPress={() => setShowDayPicker(true)}>
            <Text style={styles.dateBtnText}>{padDate(day)}</Text>
          </Pressable>
          {showDayPicker && (
            <DateTimePicker
              value={day}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, d) => {
                if (Platform.OS !== 'ios') setShowDayPicker(false);
                if (d) setDay(d);
              }}
            />
          )}
        </View>
      )}

      {tab === 1 && (
        <View style={styles.rowControls}>
          <Pressable
            style={styles.navChip}
            onPress={() =>
              setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() - 1, 1))
            }
          >
            <Text style={styles.navChipText}>◀</Text>
          </Pressable>
          <Text style={styles.periodText}>
            {monthAnchor.getFullYear()} / {String(monthAnchor.getMonth() + 1).padStart(2, '0')}
          </Text>
          <Pressable
            style={styles.navChip}
            onPress={() =>
              setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1))
            }
          >
            <Text style={styles.navChipText}>▶</Text>
          </Pressable>
        </View>
      )}

      {tab === 2 && (
        <View style={styles.rowControls}>
          <Pressable style={styles.navChip} onPress={() => setYearVal((y) => y - 1)}>
            <Text style={styles.navChipText}>◀</Text>
          </Pressable>
          <Text style={styles.periodText}>{yearVal}</Text>
          <Pressable style={styles.navChip} onPress={() => setYearVal((y) => y + 1)}>
            <Text style={styles.navChipText}>▶</Text>
          </Pressable>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3949ab" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.summary}>
            <Text style={styles.sumLabel}>Total Revenue</Text>
            <Text style={styles.sumBig}>₹ {Number(summary.total_revenue).toFixed(2)}</Text>
            <Text style={styles.sumLabel}>Number of Trips</Text>
            <Text style={styles.sumMid}>{summary.trip_count}</Text>
          </View>

          <Text style={styles.sectionTitle}>Driver-wise breakdown</Text>
          {summary.by_driver.length === 0 ? (
            <Text style={styles.empty}>No trips in this period.</Text>
          ) : (
            summary.by_driver.map((item, idx) => (
              <View key={`${item.driver_name}-${idx}`} style={styles.driverRow}>
                <Text style={styles.driverName}>{item.driver_name}</Text>
                <Text style={styles.driverMeta}>
                  {item.trips} trips · ₹ {Number(item.revenue).toFixed(2)}
                </Text>
              </View>
            ))
          )}

          <Pressable
            style={[styles.pdfBtn, pdfLoading && styles.disabled]}
            onPress={downloadPdf}
            disabled={pdfLoading}
          >
            {pdfLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.pdfBtnText}>Download PDF Report</Text>
            )}
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  tabs: { flexDirection: 'row', margin: 16, marginBottom: 8, gap: 8 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#e8eaf6',
    alignItems: 'center',
  },
  tabActive: { backgroundColor: '#3949ab' },
  tabText: { fontWeight: '600', color: '#3949ab' },
  tabTextActive: { color: '#fff' },
  controls: { paddingHorizontal: 16, marginBottom: 8 },
  rowControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 8,
  },
  dateBtn: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateBtnText: { fontWeight: '700', color: '#1a237e', textAlign: 'center' },
  navChip: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  navChipText: { fontSize: 16, fontWeight: '700', color: '#3949ab' },
  periodText: { fontSize: 18, fontWeight: '800', color: '#1a237e', minWidth: 100, textAlign: 'center' },
  center: { flex: 1, justifyContent: 'center' },
  body: { padding: 16, paddingBottom: 32 },
  summary: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ececf2',
  },
  sumLabel: { color: '#666', fontSize: 13, marginTop: 8 },
  sumBig: { fontSize: 28, fontWeight: '800', color: '#00897b' },
  sumMid: { fontSize: 22, fontWeight: '800', color: '#3949ab' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1a237e', marginBottom: 10 },
  driverRow: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  driverName: { fontWeight: '700', fontSize: 16 },
  driverMeta: { color: '#666', marginTop: 4 },
  empty: { color: '#888', fontStyle: 'italic' },
  pdfBtn: {
    marginTop: 20,
    backgroundColor: '#5e35b1',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  pdfBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  disabled: { opacity: 0.7 },
});
