import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { amountToWords } from '../utils/amountToWords';
import { buildInvoiceHtml } from '../utils/invoiceHtml';

function formatDisplayDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function formatMoney(n) {
  const x = Number(n);
  if (Number.isNaN(x)) return '0.00';
  return x.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function InvoicePreview({ company, invoice }) {
  const [pdfLoading, setPdfLoading] = useState(false);

  const words = useMemo(() => amountToWords(invoice?.amount), [invoice?.amount]);

  const descriptionLines = (invoice?.description || '').split('\n');

  const handlePdf = async () => {
    if (!company || !invoice) return;
    setPdfLoading(true);
    try {
      const html = buildInvoiceHtml(company, invoice);
      const { uri } = await Print.printToFileAsync({ html });
      const baseDir = FileSystem.documentDirectory;
      const dest =
        baseDir != null
          ? `${baseDir}Invoice_${invoice.invoice_number}.pdf`
          : uri;
      if (baseDir != null) {
        await FileSystem.copyAsync({ from: uri, to: dest });
      }
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(dest, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share invoice',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Saved', `PDF saved to:\n${dest}`);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not generate or share PDF.');
    } finally {
      setPdfLoading(false);
    }
  };

  const logoUri = company?.logo;
  const sigUri = company?.signature;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.actions}>
        <Pressable
          style={[styles.pdfBtn, pdfLoading && styles.btnDisabled]}
          onPress={handlePdf}
          disabled={pdfLoading}
        >
          {pdfLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.pdfBtnText}>PDF / Share (WhatsApp)</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.companyBlock}>
            {logoUri ? (
              <Image source={{ uri: logoUri }} style={styles.logo} resizeMode="contain" />
            ) : null}
            <Text style={styles.companyName}>{company?.company_name}</Text>
            <Text style={styles.muted}>{company?.address}</Text>
            <Text style={styles.muted}>Phone: {company?.phone}</Text>
            {company?.email && String(company.email).trim() ? (
              <Text style={styles.muted}>Email: {company.email}</Text>
            ) : null}
          </View>
          <Text style={styles.taxTitle}>Tax Invoice</Text>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Bill To</Text>
            <Text style={styles.billName}>{invoice?.customer_name}</Text>
            <Text style={styles.muted}>Contact No: {invoice?.customer_phone || '—'}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Invoice Details</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Invoice Number</Text>
              <Text style={styles.metaVal}>{invoice?.invoice_number}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Date</Text>
              <Text style={styles.metaVal}>{formatDisplayDate(invoice?.date)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Total Amount</Text>
              <Text style={styles.metaValBold}>₹ {formatMoney(invoice?.amount)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.amountBox}>
          <Text style={styles.boxLabel}>Invoice Amount in Words</Text>
          <Text style={styles.words}>{words}</Text>
          <View style={styles.amountRow}>
            <Text>Received Amount</Text>
            <Text style={styles.amt}>₹ {formatMoney(invoice?.received_amount)}</Text>
          </View>
          <View style={styles.amountRow}>
            <Text>Balance Amount</Text>
            <Text style={styles.amt}>₹ {formatMoney(invoice?.balance_amount)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Description</Text>
        <View style={styles.descBox}>
          {descriptionLines.length === 0 || (descriptionLines.length === 1 && !descriptionLines[0]) ? (
            <Text style={styles.muted}>—</Text>
          ) : (
            descriptionLines.map((line, i) => (
              <Text key={i} style={styles.descLine}>
                {line}
              </Text>
            ))
          )}
        </View>

        <View style={styles.terms}>
          <Text style={styles.termsTitle}>Terms:</Text>
          <Text style={styles.termsText}>Thank you, It was a pleasure serving you...</Text>
        </View>

        <View style={styles.signFooter}>
          {sigUri ? (
            <Image source={{ uri: sigUri }} style={styles.signature} resizeMode="contain" />
          ) : (
            <View style={styles.signaturePlaceholder} />
          )}
          <Text style={styles.signLabel}>Authorized Signatory</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f2f4f8' },
  content: { padding: 16, paddingBottom: 32 },
  actions: { marginBottom: 12 },
  pdfBtn: {
    backgroundColor: '#25D366',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  pdfBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnDisabled: { opacity: 0.7 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      android: { elevation: 2 },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
    }),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: '#1a237e',
    paddingBottom: 14,
    marginBottom: 16,
  },
  companyBlock: { flex: 1, paddingRight: 8 },
  logo: { width: 140, height: 56, marginBottom: 8 },
  companyName: { fontSize: 18, fontWeight: '800', color: '#1a237e', marginBottom: 4 },
  taxTitle: { fontSize: 16, fontWeight: '800', color: '#1a237e', alignSelf: 'flex-start' },
  muted: { color: '#555', fontSize: 13, marginTop: 2, lineHeight: 18 },
  twoCol: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  col: { flex: 1, minWidth: 140 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1a237e',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  billName: { fontWeight: '700', fontSize: 15, color: '#222' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  metaLabel: { color: '#666', flex: 0.45 },
  metaVal: { flex: 0.55, textAlign: 'right', fontWeight: '600' },
  metaValBold: { flex: 0.55, textAlign: 'right', fontWeight: '800' },
  amountBox: {
    backgroundColor: '#f5f7ff',
    borderRadius: 10,
    padding: 14,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#e0e4ff',
  },
  boxLabel: { fontWeight: '600', marginBottom: 6 },
  words: { fontStyle: 'italic', color: '#333', marginBottom: 12, lineHeight: 20 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  amt: { fontWeight: '700' },
  descBox: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fafafa',
    minHeight: 72,
  },
  descLine: { fontSize: 14, marginVertical: 2, lineHeight: 20 },
  terms: { marginTop: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#eee' },
  termsTitle: { fontWeight: '700', marginBottom: 4 },
  termsText: { color: '#555', lineHeight: 20 },
  signFooter: { marginTop: 24, alignItems: 'flex-end' },
  signature: { width: 160, height: 64 },
  signaturePlaceholder: { height: 48 },
  signLabel: { fontSize: 12, color: '#333', marginTop: 4 },
});
