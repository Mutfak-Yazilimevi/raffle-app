/**
 * crypto.getRandomValues() tabanlı güvenli tam sayı seçici.
 * Math.random()'a kıyasla kriptografik olarak güçlüdür;
 * yüksek profilli çekilişlerde şeffaflık belgesi sunar.
 */
export function cryptoRandomInt(n) {
  if (n <= 0) return 0;
  const arr = new Uint32Array(1);
  // Modulo bias önlemi: 2^32 % n sınırının üzerindeki değerleri at
  const limit = 2 ** 32 - (2 ** 32 % n);
  let value;
  do {
    crypto.getRandomValues(arr);
    value = arr[0];
  } while (value >= limit);
  return value % n;
}
