export interface MarketplaceItemContext {
  type: string;
  name: string;
  originCountry?: string;
  originYear?: string;
}

const TYPE_TERMS: Record<string, string> = {
  stamp: 'timbre',
  coin: 'piece',
  banknote: 'billet',
  card: 'carte collection',
  other: 'objet collection',
};

const DEFAULT_EBAY_BASE = 'https://www.ebay.fr/sch/i.html';
const DEFAULT_DELCAMPE_SELL_URL = 'https://www.delcampe.net/fr/collections/item/sell';

function compactParts(parts: Array<string | undefined>): string[] {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
}

function buildSearchQuery(item: MarketplaceItemContext): string {
  const parts = compactParts([
    item.name,
    item.originCountry,
    item.originYear,
    TYPE_TERMS[item.type] || TYPE_TERMS.other,
  ]);

  return parts.join(' ');
}

export function getEbaySearchUrl(item: MarketplaceItemContext): string {
  const query = buildSearchQuery(item);
  const base = process.env.EXPO_PUBLIC_EBAY_SEARCH_URL || DEFAULT_EBAY_BASE;
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}_nkw=${encodeURIComponent(query)}`;
}

export function getDelcampeSellUrl(): string {
  return process.env.EXPO_PUBLIC_DELCAMPE_SELL_URL || DEFAULT_DELCAMPE_SELL_URL;
}

export function getMarketplaceSearchLabel(item: MarketplaceItemContext): string {
  return buildSearchQuery(item);
}