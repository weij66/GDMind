// 從 Steam appdetails API 抓真實遊戲截圖 URL，寫回 genres.json
// 使用：node scripts/fetch-screenshots.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const GENRES_PATH = resolve('src/lib/data/genres.json');

const data = JSON.parse(readFileSync(GENRES_PATH, 'utf-8'));

// 收集 appid；跳過已有 screenshot 的（重跑只補缺）
const appids = new Set();
const filled = new Set();
for (const g of data.genres) {
  for (const t of g.topics) {
    for (const e of t.examples || []) {
      if (!e.appid) continue;
      if (e.screenshot) filled.add(e.appid);
      else appids.add(e.appid);
    }
  }
}
console.log(`已有 ${filled.size} 個 app 截圖，需要再抓 ${appids.size} 個`);

const cache = new Map();

async function fetchScreenshots(appid, attempt = 0) {
  if (cache.has(appid)) return cache.get(appid);
  const url = `https://store.steampowered.com/api/appdetails?appids=${appid}&l=english`;
  try {
    const res = await fetch(url);
    if (res.status === 429) {
      if (attempt >= 3) throw new Error(`HTTP 429 (放棄)`);
      const wait = 30_000 * Math.pow(2, attempt);
      process.stdout.write(` 429, 等 ${wait / 1000}s...`);
      await new Promise((r) => setTimeout(r, wait));
      return fetchScreenshots(appid, attempt + 1);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const entry = json[String(appid)];
    if (!entry || !entry.success) {
      cache.set(appid, []);
      return [];
    }
    const shots = (entry.data?.screenshots || []).map((s) => s.path_full);
    cache.set(appid, shots);
    return shots;
  } catch (err) {
    console.error(`appid ${appid} 失敗：${err.message}`);
    cache.set(appid, []);
    return [];
  }
}

// 依序抓（Steam rate limit：每個間隔 1.5s）
const ids = [...appids];
for (let i = 0; i < ids.length; i++) {
  const id = ids[i];
  process.stdout.write(`[${i + 1}/${ids.length}] appid=${id} ... `);
  const shots = await fetchScreenshots(id);
  console.log(`${shots.length} 張`);
  await new Promise((r) => setTimeout(r, 1500));
}

// 寫回每個 example 的 screenshot 欄位（取前 2 張）
for (const g of data.genres) {
  for (const t of g.topics) {
    for (const e of t.examples || []) {
      if (!e.appid) continue;
      const shots = cache.get(e.appid) || [];
      if (shots.length > 0) {
        e.screenshot = shots[0];
        if (shots.length > 1) e.screenshot2 = shots[1];
      }
    }
  }
}

writeFileSync(GENRES_PATH, JSON.stringify(data, null, 2) + '\n', 'utf-8');
console.log('✓ 已寫回 src/lib/data/genres.json');
