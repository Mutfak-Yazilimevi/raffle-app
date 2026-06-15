export const MOCK_COMMENTS_PRESET = [
  { username: 'ahmet_yılmaz', text: 'Harika bir çekiliş! Katılıyorum @merve_kaya @can_demir @elif_sahin' },
  { username: 'merve_kaya', text: 'Umarım bana çıkar #cekilis @ahmet_yılmaz @can_demir' },
  { username: 'can_demir', text: 'Katıldım, herkese bol şans @elif_sahin' },
  { username: 'elif_sahin', text: 'Katılıyorum! #cekilis @ahmet_yılmaz @merve_kaya @can_demir' },
  { username: 'burak_avci', text: 'Bol şans dilerim @selin_ozdemir @kemal_aslan @deniz_aksoy' },
  { username: 'selin_ozdemir', text: 'Harika hediye! @burak_avci @kemal_aslan @deniz_aksoy' },
  { username: 'kemal_aslan', text: 'Katılıyorum @burak_avci @selin_ozdemir' },
  { username: 'deniz_aksoy', text: '#cekilis süper hediye @burak_avci @selin_ozdemir @kemal_aslan' },
  { username: 'fatma_celik', text: 'Katıldım @murat_kara @buse_tekin' },
  { username: 'murat_kara', text: 'Katılıyorum @fatma_celik' },
  { username: 'buse_tekin', text: 'Bol şans! @fatma_celik @murat_kara @gokhan_yilmaz' },
  { username: 'gokhan_yilmaz', text: 'İnşallah bana gelir @buse_tekin @zeynep_durmaz' },
  { username: 'zeynep_durmaz', text: '#cekilis katıldım @gokhan_yilmaz' },
  { username: 'oguzhan_unal', text: 'Katılıyorum @gamze_sari @ahmet_yılmaz' },
  { username: 'gamze_sari', text: 'Katıldım @oguzhan_unal' },
  { username: 'ahmet_yılmaz', text: 'Tekrar yorum atıyorum bol şans @merve_kaya @elif_sahin @burak_avci' },
  { username: 'can_demir', text: 'Şansımızı artıralım @elif_sahin @ahmet_yılmaz' },
  { username: 'can_demir', text: 'Son yorumum @merve_kaya' },
  { username: 'zeynep_durmaz', text: 'Harika @gokhan_yilmaz @can_demir @merve_kaya' },
];

export function parseRawText(text) {
  const lines = text.split('\n');
  const parsedComments = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;

    if (
      line.match(/^\d+[gsqd]$/) ||
      line.match(/^\d+\s*(gün|saat|dakika|hafta|g|s|d|h|yıl)/i) ||
      line.match(/^(Yanıtla|Reply|Beğen|Like|Diğer yanıtları gör|View replies)/i) ||
      line.startsWith('Beğenildi')
    ) {
      continue;
    }

    const usernameMatch = line.match(/^[a-zA-Z0-9._]{1,30}$/);

    if (usernameMatch) {
      let commentText = '';
      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j].trim();
        if (!nextLine) {
          j += 1;
          continue;
        }
        if (
          nextLine.match(/^\d+[gsqd]$/) ||
          nextLine.match(/^\d+\s*(gün|saat|dakika|hafta|g|s|d|h|yıl)/i) ||
          nextLine.match(/^(Yanıtla|Reply|Beğen|Like|Diğer yanıtları gör|View replies)/i)
        ) {
          j += 1;
          continue;
        }

        const nextUserMatch = nextLine.match(/^[a-zA-Z0-9._]{1,30}$/);
        if (nextUserMatch && j === i + 1) break;

        commentText = nextLine;
        break;
      }

      if (commentText) {
        parsedComments.push({ username: line, text: commentText });
        i = j;
      }
    } else {
      const colonMatch = line.match(/^([a-zA-Z0-9._]{1,30}):\s*(.*)$/);
      if (colonMatch) {
        parsedComments.push({ username: colonMatch[1], text: colonMatch[2] });
      } else {
        const spaceMatch = line.match(/^([a-zA-Z0-9._]{1,30})\s+(.*)$/);
        if (spaceMatch) {
          parsedComments.push({ username: spaceMatch[1], text: spaceMatch[2] });
        }
      }
    }
  }
  return parsedComments;
}

export function dedupeTopLevelComments(comments) {
  if (!Array.isArray(comments)) return [];

  const byId = new Map();
  const withoutId = [];

  for (const item of comments) {
    if (item.id) {
      const id = String(item.id);
      if (!byId.has(id)) byId.set(id, item);
    } else {
      withoutId.push(item);
    }
  }

  const coveredById = new Set(
    [...byId.values()].map((item) => `${item.username.toLowerCase()}\0${item.text}`),
  );

  const result = [...byId.values()];
  for (const item of withoutId) {
    const contentKey = `${item.username.toLowerCase()}\0${item.text}`;
    if (coveredById.has(contentKey)) continue;
    result.push(item);
  }

  return result;
}

export function normalizeImportedComments(comments) {
  if (!Array.isArray(comments)) return [];

  return dedupeTopLevelComments(
    comments
      .filter((item) => item && item.username && item.text && !item.isReply)
      .map((item) => ({
        username: String(item.username).trim().replace(/^@+/, ''),
        text: String(item.text).trim(),
        id: item.id ? String(item.id) : undefined,
      }))
      .filter((item) => item.username && item.text),
  );
}

export function getUniqueParticipantUsernames(comments) {
  return Array.from(new Set(
    normalizeImportedComments(comments).map((item) => item.username.toLowerCase()),
  ));
}

export function extractPostOwnerFromUrl(postUrl) {
  if (!postUrl) return null;
  // Matches: instagram.com/username/reel/... or instagram.com/username/p/...
  const match = String(postUrl).match(/instagram\.com\/([^/?#]+)\/(?:reel|p|tv)\//i);
  return match ? match[1].toLowerCase() : null;
}

export function parseCSV(csvText) {
  const lines = csvText.split('\n');
  if (lines.length < 2) return [];

  const header = lines[0];
  let sep = ',';
  if (header.includes(';')) sep = ';';
  else if (header.includes('\t')) sep = '\t';

  const headers = header.split(sep).map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));
  const userIdx = headers.findIndex((h) => h.includes('user') || h.includes('kullan') || h.includes('name') || h.includes('ad'));
  const commentIdx = headers.findIndex((h) => h.includes('comment') || h.includes('yorum') || h.includes('text') || h.includes('mesaj'));

  if (userIdx === -1 || commentIdx === -1) {
    return lines.slice(1).map((line) => {
      const cols = line.split(sep).map((c) => c.trim().replace(/['"]/g, ''));
      if (cols.length >= 2) return { username: cols[0], text: cols[1] };
      return null;
    }).filter(Boolean);
  }

  return lines.slice(1).map((line) => {
    const cols = line.split(sep).map((c) => c.trim().replace(/['"]/g, ''));
    if (cols.length > Math.max(userIdx, commentIdx)) {
      return { username: cols[userIdx].replace('@', ''), text: cols[commentIdx] };
    }
    return null;
  }).filter(Boolean);
}
