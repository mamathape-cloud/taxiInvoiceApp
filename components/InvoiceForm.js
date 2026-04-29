import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import CustomerForm from './CustomerForm';
import { getCustomers, insertCustomer, insertInvoice } from '../database/db';

function padDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function InvoiceForm({ onSaved, loadingExternal }) {
  const [customerQuery, setCustomerQuery] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addCustomerLoading, setAddCustomerLoading] = useState(false);

  const [driverName, setDriverName] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [received, setReceived] = useState('');

  const loadCustomers = useCallback(async (q) => {
    const list = await getCustomers(q);
    setCustomers(list);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      loadCustomers(customerQuery);
    }, 200);
    return () => clearTimeout(t);
  }, [customerQuery, loadCustomers]);

  const amtNum = parseFloat(amount) || 0;
  const recNum = parseFloat(received) || 0;
  const balance = Math.max(0, amtNum - recNum);
  const status = recNum < amtNum && amtNum > 0 ? 'PARTIAL' : amtNum > 0 ? 'FULL' : '—';

  const validate = () => {
    if (!selected) {
      Alert.alert('Validation', 'Please select a customer.');
      return false;
    }
    if (!driverName.trim()) {
      Alert.alert('Validation', 'Please enter driver name.');
      return false;
    }
    if (amtNum <= 0) {
      Alert.alert('Validation', 'Total amount must be greater than zero.');
      return false;
    }
    if (recNum < 0 || recNum > amtNum) {
      Alert.alert('Validation', 'Received amount must be between 0 and total amount.');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const dateStr = padDate(invoiceDate);
      const { id, invoice_number } = await insertInvoice({
        date: dateStr,
        customer_id: selected.id,
        customer_name: selected.name,
        driver_name: driverName,
        description: description.trim(),
        amount: amtNum,
        received_amount: recNum,
      });
      if (onSaved) onSaved({ id, invoice_number });
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not save invoice.');
    } finally {
      setSaving(false);
    }
  };

  const onAddCustomer = async ({ name, address, phone }) => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Customer name is required.');
      return;
    }
    setAddCustomerLoading(true);
    try {
      const newId = await insertCustomer({ name, address, phone });
      await loadCustomers('');
      const list = await getCustomers('');
      const row = list.find((c) => c.id === newId) || {
        id: newId,
        name: name.trim(),
        address,
        phone,
      };
      setSelected(row);
      setCustomerQuery(row.name);
      setAddModal(false);
      Alert.alert('Success', 'Customer added.');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not add customer.');
    } finally {
      setAddCustomerLoading(false);
    }
  };

  const busy = saving || loadingExternal;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Customer *</Text>
      <TextInput
        style={styles.input}
        value={customerQuery}
        onChangeText={(t) => {
          setCustomerQuery(t);
          setDropdownOpen(true);
          if (selected && t !== selected.name) setSelected(null);
        }}
        onFocus={() => setDropdownOpen(true)}
        placeholder="Search customer by name, phone..."
        placeholderTextColor="#999"
      />
      {dropdownOpen && customers.length > 0 ? (
        <View style={styles.dropdown}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 200 }}
            nestedScrollEnabled
          >
            {customers.map((item) => (
              <Pressable
                key={String(item.id)}
                style={styles.ddRow}
                onPress={() => {
                  setSelected(item);
                  setCustomerQuery(item.name);
                  setDropdownOpen(false);
                }}
              >
                <Text style={styles.ddName}>{item.name}</Text>
                {item.phone ? (
                  <Text style={styles.ddSub}>{item.phone}</Text>
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
      {dropdownOpen && customerQuery.trim() && customers.length === 0 ? (
        <View style={styles.inlineAdd}>
          <Text style={styles.hint}>No customer found.</Text>
          <Pressable style={styles.linkBtn} onPress={() => setAddModal(true)}>
            <Text style={styles.linkBtnText}>Add New Customer</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.linkBtnMargin} onPress={() => setAddModal(true)}>
          <Text style={styles.linkBtnText}>+ Add New Customer</Text>
        </Pressable>
      )}

      <Text style={styles.label}>Driver Name *</Text>
      <TextInput
        style={styles.input}
        value={driverName}
        onChangeText={setDriverName}
        placeholder="Driver name"
        placeholderTextColor="#999"
      />

      <Text style={styles.label}>Date</Text>
      <Pressable style={styles.dateBtn} onPress={() => setShowPicker(true)}>
        <Text style={styles.dateBtnText}>{padDate(invoiceDate)}</Text>
      </Pressable>
      {showPicker && (
        <DateTimePicker
          value={invoiceDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => {
            setShowPicker(Platform.OS === 'ios');
            if (d) setInvoiceDate(d);
          }}
        />
      )}

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        placeholder={'e.g. Trip\nParking\nToll'}
        placeholderTextColor="#999"
        multiline
      />

      <Text style={styles.label}>Total Amount *</Text>
      <TextInput
        style={styles.input}
        value={amount}
        onChangeText={setAmount}
        placeholder="0.00"
        placeholderTextColor="#999"
        keyboardType="decimal-pad"
      />

      <Text style={styles.label}>Received Amount *</Text>
      <TextInput
        style={styles.input}
        value={received}
        onChangeText={setReceived}
        placeholder="0.00"
        placeholderTextColor="#999"
        keyboardType="decimal-pad"
      />

      <View style={styles.summaryBox}>
        <Text style={styles.summaryLine}>
          Balance: <Text style={styles.summaryVal}>₹ {balance.toFixed(2)}</Text>
        </Text>
        <Text style={styles.summaryLine}>
          Payment status: <Text style={styles.summaryVal}>{status}</Text>
        </Text>
      </View>

      <Pressable
        style={[styles.btn, busy && styles.btnDisabled]}
        onPress={handleSave}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Save & Preview</Text>
        )}
      </Pressable>

      <Modal visible={addModal} animationType="slide">
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>New Customer</Text>
          <Pressable onPress={() => setAddModal(false)}>
            <Text style={styles.close}>Close</Text>
          </Pressable>
        </View>
        <CustomerForm
          onSubmit={onAddCustomer}
          submitLabel="Add Customer"
          loading={addCustomerLoading}
        />
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  multiline: { minHeight: 120, textAlignVertical: 'top' },
  dropdown: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    marginTop: 6,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  ddRow: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  ddName: { fontSize: 16, fontWeight: '600' },
  ddSub: { fontSize: 13, color: '#666', marginTop: 2 },
  inlineAdd: { marginTop: 8, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  hint: { color: '#666' },
  linkBtn: { paddingVertical: 4 },
  linkBtnMargin: { marginTop: 8, alignSelf: 'flex-start' },
  linkBtnText: { color: '#3949ab', fontWeight: '700' },
  dateBtn: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    backgroundColor: '#f8f9ff',
  },
  dateBtnText: { fontSize: 16, fontWeight: '600' },
  summaryBox: {
    marginTop: 20,
    padding: 14,
    backgroundColor: '#f0f4ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dce3ff',
  },
  summaryLine: { fontSize: 15, marginVertical: 4, color: '#333' },
  summaryVal: { fontWeight: '700', color: '#1a237e' },
  btn: {
    marginTop: 24,
    backgroundColor: '#00897b',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingTop: 48,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  close: { color: '#3949ab', fontWeight: '600' },
});
