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
  FlatList,
  Platform,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import CustomerForm from './CustomerForm';
import {
  getCustomersLimited,
  insertCustomer,
  insertInvoice,
  getDistinctDriverNames,
} from '../database/db';

const CUSTOMER_MIN_CHARS = 1;
const CUSTOMER_LIMIT = 25;
const DRIVER_SUGGEST_LIMIT = 12;

function padDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const initialErrors = () => ({
  customer: '',
  driver: '',
  amount: '',
  received: '',
  description: '',
});

export default function InvoiceForm({ onSaved, loadingExternal }) {
  const [customerQuery, setCustomerQuery] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [customerListOpen, setCustomerListOpen] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addCustomerLoading, setAddCustomerLoading] = useState(false);

  const [driverName, setDriverName] = useState('');
  const [driverSuggest, setDriverSuggest] = useState([]);
  const [driverListOpen, setDriverListOpen] = useState(false);

  const [invoiceDate, setInvoiceDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [received, setReceived] = useState('');

  const [errors, setErrors] = useState(initialErrors);
  const [touched, setTouched] = useState({});

  const loadCustomers = useCallback(async (q) => {
    const trimmed = q.trim();
    if (trimmed.length < CUSTOMER_MIN_CHARS) {
      setCustomers([]);
      return;
    }
    const list = await getCustomersLimited(trimmed, CUSTOMER_LIMIT);
    setCustomers(list);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      loadCustomers(customerQuery);
    }, 220);
    return () => clearTimeout(t);
  }, [customerQuery, loadCustomers]);

  const loadDrivers = useCallback(async (prefix) => {
    const rows = await getDistinctDriverNames(prefix, DRIVER_SUGGEST_LIMIT);
    setDriverSuggest(rows.map((r) => r.name).filter(Boolean));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      loadDrivers(driverName.trim());
    }, 200);
    return () => clearTimeout(t);
  }, [driverName, loadDrivers]);

  const amtNum = parseFloat(amount) || 0;
  const recNum = parseFloat(received) || 0;
  const balance = Math.max(0, amtNum - recNum);
  const status = recNum < amtNum && amtNum > 0 ? 'PARTIAL' : amtNum > 0 ? 'FULL' : '—';

  const setFieldError = (key, msg) => {
    setErrors((e) => ({ ...e, [key]: msg }));
  };

  const validateAll = () => {
    const next = initialErrors();
    let ok = true;
    if (!selected) {
      next.customer = 'Select a customer from the search results, or add a new one.';
      ok = false;
    }
    if (!driverName.trim()) {
      next.driver = 'Driver name is required.';
      ok = false;
    }
    if (amtNum <= 0) {
      next.amount = 'Enter a total amount greater than zero.';
      ok = false;
    }
    if (received.trim() === '' || Number.isNaN(parseFloat(received))) {
      next.received = 'Enter the received amount.';
      ok = false;
    } else if (recNum < 0 || recNum > amtNum) {
      next.received = 'Received must be between 0 and the total amount.';
      ok = false;
    }
    if (!description.trim()) {
      next.description = 'Add at least one line in the description (e.g. trip, toll).';
      ok = false;
    }
    setErrors(next);
    setTouched({
      customer: true,
      driver: true,
      amount: true,
      received: true,
      description: true,
    });
    return ok;
  };

  const handleSave = async () => {
    if (!validateAll()) return;
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
      const list = await getCustomersLimited(name.trim(), CUSTOMER_LIMIT);
      const row = list.find((c) => c.id === newId) || {
        id: newId,
        name: name.trim(),
        address,
        phone,
      };
      setSelected(row);
      setCustomerQuery(row.name);
      setCustomerListOpen(false);
      setAddModal(false);
      setFieldError('customer', '');
      Alert.alert('Success', 'Customer added.');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not add customer.');
    } finally {
      setAddCustomerLoading(false);
    }
  };

  const inputStyle = (key, base = styles.input) => [
    base,
    (touched[key] || errors[key]) && errors[key] ? styles.inputError : null,
  ];

  const busy = saving || loadingExternal;
  const showCustomerResults =
    customerListOpen && customerQuery.trim().length >= CUSTOMER_MIN_CHARS;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Customer *</Text>
      <TextInput
        style={inputStyle('customer')}
        value={customerQuery}
        onChangeText={(t) => {
          setCustomerQuery(t);
          setCustomerListOpen(true);
          if (selected && t !== selected.name) setSelected(null);
          if (errors.customer) setFieldError('customer', '');
        }}
        onBlur={() => {
          setTouched((x) => ({ ...x, customer: true }));
          setTimeout(() => setCustomerListOpen(false), 200);
        }}
        onFocus={() => setCustomerListOpen(true)}
        placeholder="Type name, phone, or address (min. 1 character)…"
        placeholderTextColor="#999"
      />
      {touched.customer && errors.customer ? (
        <Text style={styles.errText}>{errors.customer}</Text>
      ) : null}
      {customerQuery.trim().length < CUSTOMER_MIN_CHARS ? (
        <Text style={styles.helper}>
          Start typing to search customers. Results are limited to {CUSTOMER_LIMIT} matches — refine
          your search if needed.
        </Text>
      ) : null}
      {showCustomerResults && customers.length > 0 ? (
        <View style={styles.dropdown}>
          <FlatList
            data={customers}
            keyExtractor={(item) => String(item.id)}
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 220 }}
            nestedScrollEnabled
            renderItem={({ item }) => (
              <Pressable
                style={styles.ddRow}
                onPress={() => {
                  setSelected(item);
                  setCustomerQuery(item.name);
                  setCustomerListOpen(false);
                  setFieldError('customer', '');
                }}
              >
                <Text style={styles.ddName}>{item.name}</Text>
                {item.phone ? <Text style={styles.ddSub}>{item.phone}</Text> : null}
              </Pressable>
            )}
          />
        </View>
      ) : null}
      {showCustomerResults && customers.length === 0 ? (
        <View style={styles.inlineAdd}>
          <Text style={styles.hint}>No match for this search.</Text>
          <Pressable style={styles.linkBtn} onPress={() => setAddModal(true)}>
            <Text style={styles.linkBtnText}>Add New Customer</Text>
          </Pressable>
        </View>
      ) : null}
      <Pressable style={styles.linkBtnMargin} onPress={() => setAddModal(true)}>
        <Text style={styles.linkBtnText}>+ Add New Customer</Text>
      </Pressable>

      <Text style={styles.label}>Driver Name *</Text>
      <TextInput
        style={inputStyle('driver')}
        value={driverName}
        onChangeText={(t) => {
          setDriverName(t);
          setDriverListOpen(true);
          if (errors.driver) setFieldError('driver', '');
        }}
        onBlur={() => {
          setTouched((x) => ({ ...x, driver: true }));
          setTimeout(() => setDriverListOpen(false), 200);
        }}
        onFocus={() => setDriverListOpen(true)}
        placeholder="Driver name (suggestions from past invoices)"
        placeholderTextColor="#999"
      />
      {touched.driver && errors.driver ? (
        <Text style={styles.errText}>{errors.driver}</Text>
      ) : null}
      {driverListOpen && driverSuggest.length > 0 ? (
        <View style={styles.dropdown}>
          <FlatList
            data={driverSuggest.filter((n) => n.toLowerCase() !== driverName.trim().toLowerCase())}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 140 }}
            nestedScrollEnabled
            renderItem={({ item }) => (
              <Pressable
                style={styles.ddRow}
                onPress={() => {
                  setDriverName(item);
                  setDriverListOpen(false);
                  setFieldError('driver', '');
                }}
              >
                <Text style={styles.ddName}>{item}</Text>
              </Pressable>
            )}
          />
        </View>
      ) : null}
      <Text style={styles.helperSmall}>Names are loaded from existing invoices (no extra table).</Text>

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

      <Text style={styles.label}>Description *</Text>
      <TextInput
        style={[
          styles.input,
          styles.multiline,
          (touched.description || errors.description) && errors.description ? styles.inputError : null,
        ]}
        value={description}
        onChangeText={(t) => {
          setDescription(t);
          if (errors.description) setFieldError('description', '');
        }}
        onBlur={() => setTouched((x) => ({ ...x, description: true }))}
        placeholder={'e.g. Trip\nParking\nToll'}
        placeholderTextColor="#999"
        multiline
      />
      {touched.description && errors.description ? (
        <Text style={styles.errText}>{errors.description}</Text>
      ) : null}

      <Text style={styles.label}>Total Amount *</Text>
      <TextInput
        style={inputStyle('amount')}
        value={amount}
        onChangeText={(t) => {
          setAmount(t);
          if (errors.amount) setFieldError('amount', '');
        }}
        onBlur={() => setTouched((x) => ({ ...x, amount: true }))}
        placeholder="0.00"
        placeholderTextColor="#999"
        keyboardType="decimal-pad"
      />
      {touched.amount && errors.amount ? <Text style={styles.errText}>{errors.amount}</Text> : null}

      <Text style={styles.label}>Received Amount *</Text>
      <TextInput
        style={inputStyle('received')}
        value={received}
        onChangeText={(t) => {
          setReceived(t);
          if (errors.received) setFieldError('received', '');
        }}
        onBlur={() => setTouched((x) => ({ ...x, received: true }))}
        placeholder="0.00"
        placeholderTextColor="#999"
        keyboardType="decimal-pad"
      />
      {touched.received && errors.received ? (
        <Text style={styles.errText}>{errors.received}</Text>
      ) : null}

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
  inputError: {
    borderColor: '#c62828',
    backgroundColor: '#fff8f8',
  },
  errText: { color: '#c62828', fontSize: 13, marginTop: 4, marginBottom: 2 },
  helper: { color: '#666', fontSize: 13, marginTop: 6, lineHeight: 18 },
  helperSmall: { color: '#888', fontSize: 12, marginTop: 4 },
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
