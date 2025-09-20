function getWordMap(inputId) {
  const raw = document.getElementById(inputId).value.trim();
  return raw.split(/\s*,\s*/).filter(Boolean);
}

function base64ToWords(base64str, wordMap) {
  const code = base64str.slice(0, 4);
  let nums = Array.from(code).map(c => c.charCodeAt(0));
  let w1 = wordMap[nums[0] % wordMap.length] || "null1";
  let w2 = wordMap[nums[1] % wordMap.length] || "null2";
  return `${w1} ${w2}`;
}

function wordsToBase64(alias, wordMap) {
  let [w1, w2] = alias.trim().split(/\s+/);
  let i1 = wordMap.indexOf(w1);
  let i2 = wordMap.indexOf(w2);
  if (i1 === -1 || i2 === -1) return null;
  return String.fromCharCode(i1 + 33) + String.fromCharCode(i2 + 33);
}

function seedToAlias() {
  const seed = document.getElementById('seedInput').value.trim();
  const password = document.getElementById('password1').value;
  const wordMap = getWordMap('wordMapInput1');

  if (!seed || !password || wordMap.length < 2) return alert("Isi seed, password, dan minimal 2 kata di wordMap!");

  const encrypted = CryptoJS.AES.encrypt(seed, password).toString();
  const alias = base64ToWords(btoa(encrypted), wordMap);
  document.getElementById('aliasOutput').value = alias;
  localStorage.setItem("alias::" + alias, encrypted); // simpan lokal (opsional)
}

function aliasToSeed() {
  const alias = document.getElementById('aliasInput').value.trim();
  const password = document.getElementById('password2').value;
  const wordMap = getWordMap('wordMapInput2');

  if (!alias || !password || wordMap.length < 2) return alert("Isi semua field!");

  const prefix = wordsToBase64(alias, wordMap);
  if (!prefix) return alert("Alias tidak cocok dengan wordMap!");

  // Cari dari localStorage (sementara)
  const encrypted = Object.entries(localStorage)
    .find(([k]) => k.startsWith("alias::" + alias))?.[1];

  if (!encrypted) return alert("Alias belum pernah dibuat di sesi ini.");

  try {
    const bytes = CryptoJS.AES.decrypt(encrypted, password);
    const seed = bytes.toString(CryptoJS.enc.Utf8);
    if (!seed) throw Error();
    document.getElementById('seedOutput').value = seed;
  } catch {
    document.getElementById('seedOutput').value = "⚠️ Password salah atau data rusak!";
  }
}
