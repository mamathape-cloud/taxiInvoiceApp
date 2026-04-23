import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import ConfirmModal from '../components/ConfirmModal';
import {
  getAllInvoices,
  updateInvoice,
  deleteInvoice,
  getCustomerById,
} from '../database/db';

function padDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseIso(s) {
  if (!s) return new Date();
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export default function Invoices({ navigation }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editRow, setEditRow] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const [driverName, setDriverName] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [received, setReceived] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getAllInvoices();
      setList(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openEdit = (inv) => {
    setEditRow(inv);
    setDriverName(inv.driver_name || '');
    setInvoiceDate(parseIso(inv.date));
    setDescription(inv.description || '');
    setAmount(String(inv.amount ?? ''));
    setReceived(String(inv.received_amount ?? ''));
    setShowPicker(false);
  };

  const saveEdit = async () => {
    if (!editRow) return;
    const amtNum = parseFloat(amount) || 0;
    const recNum = parseFloat(received) || 0;
    if (amtNum <= 0) {
      Alert.alert('Validation', 'Total amount must be greater than zero.');
      return;
    }
    if (recNum < 0 || recNum > amtNum) {
      Alert.alert('Validation', 'Received amount must be between 0 and total amount.');
      return;
    }
    setSaveLoading(true);
    try {
      let customerId = editRow.customer_id;
      let customerName = editRow.customer_name;
      if (customerId) {
        const c = await getCustomerById(customerId);
        if (c?.name) customerName = c.name;
      }
      await updateInvoice(editRow.id, {
        date: padDate(invoiceDate),
        customer_id: customerId,
        customer_name: customerName,
        driver_name: driverName,
        description: description.trim(),
        amount: amtNum,
        received_amount: recNum,
      });
      Alert.alert('Success', 'Invoice updated.');
      setEditRow(null);
      await load();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not update invoice.');
    } finally {
      setSaveLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteInvoice(deleteTarget.id);
      Alert.alert('Success', 'Invoice deleted.');
      setDeleteTarget(null);
      await load();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not delete invoice.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const amtNum = parseFloat(amount) || 0;
  const recNum = parseFloat(received) || 0;
  const balance = Math.max(0, amtNum - recNum);
  const status = recNum < amtNum && amtNum > 0 ? 'PARTIAL' : amtNum > 0 ? 'FULL' : '—';

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3949ab" />
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={list.length === 0 ? styles.emptyPad : styles.listPad}
          ListEmptyComponent={
            <Text style={styles.empty}>No invoices yet. Generate one from the dashboard.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.invNo}>{item.invoice_number}</Text>
                <Text style={styles.badge}>{item.payment_status}</Text>
              </View>
              <Text style={styles.line}>{item.customer_name}</Text>
              <Text style={styles.sub}>
                {item.date} · ₹ {Number(item.amount).toFixed(2)}
              </Text>
              <View style={styles.row}>
                <Pressable
                  style={styles.smallBtn}
                  onPress={() =>
                    navigation.navigate('InvoicePreview', { invoiceId: item.id })
                  }
                >
                  <Text style={styles.smallBtnText}>View</Text>
                </Pressable>
                <Pressable style={styles.smallBtn} onPress={() => openEdit(item)}>
                  <Text style={styles.smallBtnText}>Edit</Text>
                </Pressable>
                <Pressable style={styles.smallBtnDanger} onPress={() => setDeleteTarget(item)}>
                  <Text style={styles.smallBtnDangerText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={!!editRow} animationType="slide">
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Edit Invoice</Text>
          <Pressable onPress={() => setEditRow(null)}>
            <Text style={styles.close}>Close</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.form}>
          <Text style={styles.label}>Customer</Text>
          <Text style={styles.ro}>{editRow?.customer_name}</Text>
          <Text style={styles.label}>Driver Name</Text>
          <TextInput
            style={styles.input}
            value={driverName}
            onChangeText={setDriverName}
            placeholder="Driver"
            placeholderTextColor="#999"
          />
          <Text style={styles.label}>Date</Text>
          <Pressable style={styles.inputLike} onPress={() => setShowPicker(true)}>
            <Text>{padDate(invoiceDate)}</Text>
          </Pressable>
          {showPicker && (
            <DateTimePicker
              value={invoiceDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, d) => {
                if (Platform.OS !== 'ios') setShowPicker(false);
                if (d) setInvoiceDate(d);
              }}
            />
          )}
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={description}
            onChangeText={setDescription}
            multiline
            placeholderTextColor="#999"
          />
          <Text style={styles.label}>Total Amount</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholderTextColor="#999"
          />
          <Text style={styles.label}>Received Amount</Text>
          <TextInput
            style={styles.input}
            value={received}
            onChangeText={setReceived}
            keyboardType="decimal-pad"
            placeholderTextColor="#999"
          />
          <Text style={styles.hint}>
            Balance: ₹ {balance.toFixed(2)} · Status: {status}
          </Text>
          <Pressable
            style={[styles.saveBtn, saveLoading && styles.disabled]}
            onPress={saveEdit}
            disabled={saveLoading}
          >
            {saveLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </Pressable>
        </ScrollView>
      </Modal>

      <ConfirmModal
        visible={!!deleteTarget}
        title="Delete invoice?"
        message={
          deleteTarget
            ? `Permanently delete ${deleteTarget.invoice_number}? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        destructive
        loading={deleteLoading}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  center: { flex: 1, justifyContent: 'center' },
  listPad: { padding: 16, paddingBottom: 32 },
  emptyPad: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  empty: { textAlign: 'center', color: '#666', fontSize: 15 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ececf2',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  invNo: { fontSize: 16, fontWeight: '800', color: '#1a237e' },
  badge: { fontSize: 12, fontWeight: '700', color: '#00897b', backgroundColor: '#e0f2f1', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  line: { fontSize: 15, fontWeight: '600', marginTop: 8 },
  sub: { fontSize: 13, color: '#666', marginTop: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  smallBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#e8eaf6',
    borderRadius: 8,
  },
  smallBtnText: { color: '#3949ab', fontWeight: '700', fontSize: 13 },
  smallBtnDanger: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#ffebee',
    borderRadius: 8,
  },
  smallBtnDangerText: { color: '#c62828', fontWeight: '700', fontSize: 13 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 52,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  close: { color: '#3949ab', fontWeight: '600' },
  form: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginTop: 12, marginBottom: 6 },
  ro: { fontSize: 16, fontWeight: '600', color: '#222' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputLike: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    backgroundColor: '#f8f9ff',
  },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  hint: { marginTop: 12, color: '#333', fontWeight: '600' },
  saveBtn: {
    marginTop: 24,
    backgroundColor: '#3949ab',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  disabled: { opacity: 0.7 },
});
