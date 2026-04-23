const ones = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigitsToWords(n) {
  if (n < 20) return ones[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return tens[t] + (o ? ` ${ones[o]}` : '');
}

function threeDigitsToWords(n) {
  let s = '';
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h) s += `${ones[h]} Hundred`;
  if (rest) {
    if (s) s += ' ';
    s += twoDigitsToWords(rest);
  }
  return s.trim();
}

function intToWords(num) {
  if (num === 0) return 'Zero';
  const scales = ['', 'Thousand', 'Million', 'Billion'];
  let n = Math.floor(Math.abs(num));
  const parts = [];
  let scale = 0;
  while (n > 0) {
    const chunk = n % 1000;
    if (chunk) {
      const w = threeDigitsToWords(chunk);
      const label = scales[scale];
      parts.unshift(label ? `${w} ${label}` : w);
    }
    n = Math.floor(n / 1000);
    scale += 1;
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * @param {number} amount
 * @returns {string}
 */
export function amountToWords(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return 'Zero Rupees Only';
  const a = Math.round(Number(amount) * 100) / 100;
  const rupees = Math.floor(a);
  const paise = Math.round((a - rupees) * 100);
  let words = intToWords(rupees) + ' Rupee' + (rupees === 1 ? '' : 's');
  if (paise > 0) {
    words += ' and ' + intToWords(paise) + ' Paise';
  }
  return words + ' Only';
}
