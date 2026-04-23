import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import CustomerForm from '../components/CustomerForm';
import ConfirmModal from '../components/ConfirmModal';
import { getCustomers, updateCustomer, deleteCustomer, insertCustomer } from '../database/db';

export default function Customers() {
  const [search, setSearch] = useState('');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getCustomers(search);
      setList(rows);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onSaveEdit = async (values) => {
    if (!editItem) return;
    if (!values.name.trim()) {
      Alert.alert('Validation', 'Name is required.');
      return;
    }
    setEditLoading(true);
    try {
      await updateCustomer(editItem.id, values);
      Alert.alert('Success', 'Customer updated.');
      setEditItem(null);
      await load();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not update customer.');
    } finally {
      setEditLoading(false);
    }
  };

  const onAddCustomer = async (values) => {
    if (!values.name.trim()) {
      Alert.alert('Validation', 'Name is required.');
      return;
    }
    setAddLoading(true);
    try {
      await insertCustomer(values);
      Alert.alert('Success', 'Customer added.');
      setAddOpen(false);
      await load();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not add customer.');
    } finally {
      setAddLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteCustomer(deleteTarget.id);
      Alert.alert('Success', 'Customer deleted.');
      setDeleteTarget(null);
      await load();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not delete customer.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <Pressable style={styles.addBtn} onPress={() => setAddOpen(true)}>
          <Text style={styles.addBtnText}>+ Add Customer</Text>
        </Pressable>
      </View>
      <TextInput
        style={styles.search}
        placeholder="Search by name, phone, address..."
        placeholderTextColor="#999"
        value={search}
        onChangeText={setSearch}
      />
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
            <Text style={styles.empty}>No customers yet. Tap “Add Customer” to create one.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name}>{item.name}</Text>
              {item.phone ? <Text style={styles.sub}>{item.phone}</Text> : null}
              {item.address ? (
                <Text style={styles.sub} numberOfLines={2}>
                  {item.address}
                </Text>
              ) : null}
              <View style={styles.row}>
                <Pressable style={styles.smallBtn} onPress={() => setEditItem(item)}>
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

      <Modal visible={addOpen} animationType="slide">
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add Customer</Text>
          <Pressable onPress={() => setAddOpen(false)}>
            <Text style={styles.close}>Close</Text>
          </Pressable>
        </View>
        <CustomerForm
          onSubmit={onAddCustomer}
          submitLabel="Add"
          loading={addLoading}
        />
      </Modal>

      <Modal visible={!!editItem} animationType="slide">
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Edit Customer</Text>
          <Pressable onPress={() => setEditItem(null)}>
            <Text style={styles.close}>Close</Text>
          </Pressable>
        </View>
        {editItem ? (
          <CustomerForm
            key={editItem.id}
            initialValues={editItem}
            onSubmit={onSaveEdit}
            submitLabel="Update"
            loading={editLoading}
          />
        ) : null}
      </Modal>

      <ConfirmModal
        visible={!!deleteTarget}
        title="Delete customer?"
        message={
          deleteTarget
            ? `Remove "${deleteTarget.name}" from your list? This does not delete past invoices.`
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
  toolbar: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 0 },
  addBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#3949ab',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  addBtnText: { color: '#fff', fontWeight: '700' },
  search: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  center: { flex: 1, justifyContent: 'center' },
  listPad: { paddingHorizontal: 16, paddingBottom: 24 },
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
  name: { fontSize: 17, fontWeight: '700', color: '#1a1a2e' },
  sub: { fontSize: 14, color: '#666', marginTop: 4 },
  row: { flexDirection: 'row', gap: 10, marginTop: 12 },
  smallBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#e8eaf6',
    borderRadius: 8,
  },
  smallBtnText: { color: '#3949ab', fontWeight: '700' },
  smallBtnDanger: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#ffebee',
    borderRadius: 8,
  },
  smallBtnDangerText: { color: '#c62828', fontWeight: '700' },
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
});
