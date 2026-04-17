import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const ROOT_DIR = process.cwd();
const REMOTE_ENV_PATH = path.join(ROOT_DIR, '.env');
const LOCAL_ENV_PATH = path.join(ROOT_DIR, '.env.local');
const DEFAULT_LOCAL_URL = 'http://127.0.0.1:54321';
const DEFAULT_LOCAL_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

function parseEnvFile(content) {
  const values = {};

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

async function loadEnv(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return parseEnvFile(content);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return {};
    }

    throw error;
  }
}

function getRequiredValue(values, key, fallback) {
  const value = values[key] || fallback;
  if (!value) {
    throw new Error(`Missing required configuration: ${key}`);
  }

  return value;
}

function stripQueryString(value) {
  return value.split('?')[0] || value;
}

function guessContentTypeFromPath(value) {
  const normalized = stripQueryString(value).toLowerCase();

  if (normalized.endsWith('.png')) return 'image/png';
  if (normalized.endsWith('.webp')) return 'image/webp';
  if (normalized.endsWith('.gif')) return 'image/gif';

  return 'image/jpeg';
}

function toDataUri(buffer, contentType) {
  return `data:${contentType};base64,${buffer.toString('base64')}`;
}

async function tryConvertImageToDataUri(imageUrl, remoteAnonKey) {
  if (!imageUrl || imageUrl.startsWith('data:')) {
    return imageUrl;
  }

  if (!/^https?:\/\//iu.test(imageUrl)) {
    return imageUrl;
  }

  try {
    const response = await fetch(imageUrl, {
      headers: {
        apikey: remoteAnonKey,
        Authorization: `Bearer ${remoteAnonKey}`,
      },
    });

    if (!response.ok) {
      return imageUrl;
    }

    const contentType = (response.headers.get('content-type') || guessContentTypeFromPath(imageUrl)).split(';')[0].trim();
    const arrayBuffer = await response.arrayBuffer();
    return toDataUri(Buffer.from(arrayBuffer), contentType);
  } catch {
    return imageUrl;
  }
}

function normalizeRemoteItem(item) {
  return {
    id: item.id,
    user_id: null,
    type: item.type,
    name: item.name || '',
    description: item.description || '',
    estimated_value_min: Number(item.estimated_value_min) || 0,
    estimated_value_max: Number(item.estimated_value_max) || 0,
    estimated_value_currency: item.estimated_value_currency || 'EUR',
    confidence_score: Number(item.confidence_score) || 0,
    historical_info: item.historical_info || '',
    origin_country: item.origin_country || '',
    origin_year: item.origin_year || '',
    image_url: item.image_url || '',
    ai_analysis: item.ai_analysis && typeof item.ai_analysis === 'object' ? item.ai_analysis : {},
    notes: item.notes || null,
    guided_condition_grade: item.guided_condition_grade || 'auto',
    guided_condition_issues: Array.isArray(item.guided_condition_issues) ? item.guided_condition_issues : [],
    expert_verification_status: item.expert_verification_status || 'none',
    expert_verification_requested_at: item.expert_verification_requested_at || null,
    expert_verification_completed_at: item.expert_verification_completed_at || null,
    expert_verification_report: item.expert_verification_report || '',
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
}

async function fetchRemoteOwnerItems(remoteClient) {
  const pageSize = 100;
  let from = 0;
  const items = [];

  while (true) {
    const { data, error } = await remoteClient
      .from('collection_items')
      .select('*')
      .is('user_id', null)
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(`Remote fetch failed: ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    items.push(...data);

    if (data.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return items;
}

async function main() {
  const remoteEnv = await loadEnv(REMOTE_ENV_PATH);
  const localEnv = await loadEnv(LOCAL_ENV_PATH);

  const remoteUrl = getRequiredValue(remoteEnv, 'EXPO_PUBLIC_SUPABASE_URL');
  const remoteAnonKey = getRequiredValue(remoteEnv, 'EXPO_PUBLIC_SUPABASE_ANON_KEY');
  const localUrl = getRequiredValue(localEnv, 'EXPO_PUBLIC_SUPABASE_URL', DEFAULT_LOCAL_URL);
  const localAnonKey = getRequiredValue(localEnv, 'EXPO_PUBLIC_SUPABASE_ANON_KEY', DEFAULT_LOCAL_KEY);

  const remoteClient = createClient(remoteUrl, remoteAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const localClient = createClient(localUrl, localAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const remoteItems = await fetchRemoteOwnerItems(remoteClient);

  if (remoteItems.length === 0) {
    console.log('No remote owner-mode scans found.');
    return;
  }

  const payload = [];

  for (const item of remoteItems) {
    const normalized = normalizeRemoteItem(item);
    normalized.image_url = await tryConvertImageToDataUri(normalized.image_url, remoteAnonKey);
    payload.push(normalized);
  }

  const { data, error } = await localClient
    .from('collection_items')
    .upsert(payload, { onConflict: 'id' })
    .select('id');

  if (error) {
    throw new Error(`Local upsert failed: ${error.message}`);
  }

  console.log(`Migrated ${data?.length || payload.length} owner-mode scans to local Supabase.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});