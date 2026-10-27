const copyFromDataLayer = require('copyFromDataLayer');
const createArgumentsQueue = require('createArgumentsQueue');
const getContainerVersion = require('getContainerVersion');
const getType = require('getType');
const injectScript = require('injectScript');
const JSON = require('JSON');
const logToConsole = require('logToConsole');
const makeInteger = require('makeInteger');
const makeNumber = require('makeNumber');
const makeString = require('makeString');
const Math = require('Math');

const SDK_URL = 'https://bzrcdn.openai.com/sdk/oaiq.min.js';
const LOG_PREFIX = '[OpenAI Ads]';

// Events the Measurement Pixel accepts and the data shape each one uses.
// app_installed and app_opened are Conversions API only, so they are left out.
const EVENT_DATA_TYPES = {
  appointment_scheduled: 'customer_action',
  checkout_started: 'contents',
  contents_viewed: 'contents',
  custom: 'custom',
  items_added: 'contents',
  lead_created: 'customer_action',
  order_created: 'contents',
  page_viewed: 'contents',
  registration_completed: 'customer_action',
  subscription_created: 'plan_enrollment',
  trial_started: 'plan_enrollment'
};

// GA4 recommended events that have a standard OpenAI Ads counterpart.
const GA4_EVENT_MAP = {
  'gtm.js': 'page_viewed',
  page_view: 'page_viewed',
  add_to_cart: 'items_added',
  begin_checkout: 'checkout_started',
  generate_lead: 'lead_created',
  purchase: 'order_created',
  sign_up: 'registration_completed',
  view_item: 'contents_viewed',
  view_item_list: 'contents_viewed'
};

// ISO 4217 currencies whose minor unit is not two decimals.
const CURRENCY_EXPONENTS = {
  BHD: 3, BIF: 0, CLF: 4, CLP: 0, DJF: 0, GNF: 0, IQD: 3, ISK: 0, JOD: 3,
  JPY: 0, KMF: 0, KRW: 0, KWD: 3, LYD: 3, OMR: 3, PYG: 0, RWF: 0, TND: 3,
  UGX: 0, UYI: 0, UYW: 4, VND: 0, VUV: 0, XAF: 0, XOF: 0, XPF: 0
};
const DEFAULT_CURRENCY_EXPONENT = 2;

const HASH_FIELDS = [
  'email_sha256',
  'phone_number_sha256',
  'external_id_sha256',
  'first_name_sha256',
  'last_name_sha256'
];
const LOCALITY_FIELDS = ['city', 'region'];
const USER_FIELDS = HASH_FIELDS.concat(LOCALITY_FIELDS, ['country', 'postal_code']);

// Formats required by the OpenAI Ads documentation. The SDK rejects the whole
// event on a bad currency and silently drops unusable user data, so both are
// checked here where the problem can be logged.
const HASH_PATTERN = '^[0-9a-f]{64}$';
const COUNTRY_PATTERN = '^[A-Z]{2}$';
const CURRENCY_PATTERN = '^[A-Z]{3}$';
const POSTAL_CODE_PATTERN = '^[A-Za-z0-9 -]{1,32}$';
const CUSTOM_EVENT_NAME_PATTERN = '^[a-z0-9]([a-z0-9_-]{0,62}[a-z0-9])?$';
const MAX_LOCALITY_LENGTH = 128;

const containerVersion = getContainerVersion() || {};
const debugEnabled =
  data.enableDebug === true ||
  containerVersion.debugMode === true ||
  containerVersion.previewMode === true;

const pixelIds = parsePixelIds(data.pixelIds);
if (!pixelIds.length) {
  log('Missing required field: Pixel ID(s)');
  return data.gtmOnFailure();
}

// Mirrors the official snippet: window.oaiq buffers calls in oaiq.q until the
// SDK loads, and the same function reaches the SDK directly once it has.
const oaiq = createArgumentsQueue('oaiq', 'oaiq.q');

if (data.initPixels === true) {
  const user = buildUser();
  pixelIds.forEach(pixelId => {
    const initConfig = { pixelId: pixelId };
    if (debugEnabled) initConfig.debug = true;
    if (user) initConfig.user = user;
    oaiq('init', initConfig);
  });
} else if (hasAnyUserData()) {
  log('User Data is only sent with init. Enable Initialize Pixels to send it.');
}

if (data.sendEvent === true) {
  const event = buildEvent();
  if (event.errors.length) {
    event.errors.forEach(error => log(error));
    return data.gtmOnFailure();
  }
  // measureSingle targets one pixel, so only the listed Pixel IDs receive the
  // event even when other tags initialised more pixels on the page.
  pixelIds.forEach(pixelId => {
    if (event.options) {
      oaiq('measureSingle', pixelId, event.name, event.data, event.options);
    } else {
      oaiq('measureSingle', pixelId, event.name, event.data);
    }
  });
}

if (data.loadScript === true) {
  // The URL doubles as the cache token: one script element per page, however
  // many tags from this template fire.
  injectScript(SDK_URL, data.gtmOnSuccess, () => {
    log('Failed to load ' + SDK_URL);
    data.gtmOnFailure();
  }, SDK_URL);
} else {
  data.gtmOnSuccess();
}

/****************** HELPER FUNCTIONS ******************/

function log(message) {
  if (debugEnabled) logToConsole(LOG_PREFIX + ' ' + message);
}

function hasValue(value) {
  return value !== undefined && value !== null && value !== '';
}

function hasKeys(object) {
  for (const key in object) return true;
  return false;
}

function hasAnyValue(object) {
  for (const key in object) {
    if (hasValue(object[key])) return true;
  }
  return false;
}

function hasAnyUserData() {
  return USER_FIELDS.some(field => hasValue(data[field]));
}

function addString(target, key, value) {
  if (hasValue(value)) target[key] = makeString(value).trim();
}

// Accepts a comma-delimited string or an array from a variable. Blank entries
// and duplicates are dropped so a pixel is never initialised twice.
function parsePixelIds(value) {
  if (!hasValue(value)) return [];
  const items = getType(value) === 'array' ? value : makeString(value).split(',');
  const ids = [];
  items.forEach(item => {
    const id = makeString(item).trim();
    if (id && ids.indexOf(id) === -1) ids.push(id);
  });
  return ids;
}

// Builds the user object for init. A hashed field has to be a 64-character hex
// digest; anything else is most likely a raw value and is dropped so no
// personal data leaves the template. Non-hashed fields are checked against the
// limits in the documentation.
function buildUser() {
  const user = {};

  HASH_FIELDS.forEach(field => {
    if (!hasValue(data[field])) return;
    const digest = makeString(data[field]).trim().toLowerCase();
    if (digest.match(HASH_PATTERN)) {
      user[field] = digest;
    } else {
      log('User Data: ' + field + ' is not a 64-character SHA-256 hex digest, field dropped.');
    }
  });

  if (hasValue(data.country)) {
    const country = makeString(data.country).trim().toUpperCase();
    if (country.match(COUNTRY_PATTERN)) {
      user.country = country;
    } else {
      log('User Data: country must be a two-letter ISO 3166-1 code, field dropped.');
    }
  }

  LOCALITY_FIELDS.forEach(field => {
    if (!hasValue(data[field])) return;
    const text = makeString(data[field]).trim();
    if (text.length > 0 && text.length <= MAX_LOCALITY_LENGTH) {
      user[field] = text;
    } else {
      log('User Data: ' + field + ' must be 1 to ' + MAX_LOCALITY_LENGTH + ' characters, field dropped.');
    }
  });

  if (hasValue(data.postal_code)) {
    const postalCode = makeString(data.postal_code).trim();
    if (postalCode.match(POSTAL_CODE_PATTERN)) {
      user.postal_code = postalCode;
    } else {
      log('User Data: postal_code may only contain letters, numbers, spaces or hyphens (max 32), field dropped.');
    }
  }

  return hasKeys(user) ? user : null;
}

// Resolves the event name, its data object and its options object. Every
// problem that would make the SDK reject the event is collected in errors so
// the tag fails once with a complete list instead of sending a broken event.
function buildEvent() {
  const errors = [];
  const useDataLayer = data.ecomIntegration === true;
  const ecommerce = useDataLayer ? readEcommerce() : {};

  let rawName;
  if (useDataLayer) {
    rawName = copyFromDataLayer('event');
    if (!hasValue(rawName)) errors.push('Data Layer Integration: no event name found in the dataLayer.');
  } else if (data.event === 'custom') {
    rawName = data.custom_event_name;
    if (!hasValue(rawName)) errors.push('Custom Event Name is required for a custom event.');
  } else {
    rawName = data.event;
  }

  const resolved = hasValue(rawName) ? resolveEventName(rawName) : null;
  if (resolved && resolved.error) errors.push(resolved.error);
  if (!resolved || resolved.error) return { errors: errors };

  const type = resolved.type;
  const eventData = { type: type };
  const options = {};

  // Manually mapped fields win over dataLayer values when they resolve to
  // something, as promised by the Data Layer Integration help text.
  let currency;
  const rawCurrency = hasValue(data.currency) ? data.currency : ecommerce.currency;
  if (hasValue(rawCurrency)) {
    currency = normaliseCurrency(rawCurrency);
    if (!currency) errors.push('Currency must be a 3-letter ISO 4217 code, got "' + makeString(rawCurrency) + '".');
  }

  let amount;
  if (hasValue(data.amount)) {
    amount = toMinorUnits(data.amount, currency, false);
    if (amount === undefined) errors.push('Amount must be numeric, got "' + makeString(data.amount) + '".');
  } else if (hasValue(ecommerce.value)) {
    amount = toMinorUnits(ecommerce.value, currency, true);
    if (amount === undefined) errors.push('Data Layer Integration: ecommerce.value must be numeric, got "' + makeString(ecommerce.value) + '".');
  }
  if (amount !== undefined && !currency) errors.push('Currency is required when Amount is set.');
  if (amount !== undefined) eventData.amount = amount;
  if (currency) eventData.currency = currency;

  if (hasValue(data.plan_id)) {
    if (type === 'plan_enrollment' || type === 'custom') {
      eventData.plan_id = makeString(data.plan_id).trim();
    } else {
      log('Plan ID is not supported for ' + type + ' events, ignored.');
    }
  }

  const rows = collectContentRows(ecommerce);
  if (rows.length) {
    if (type === 'customer_action') {
      log('Contents are not supported for ' + type + ' events, ignored.');
    } else {
      const contents = [];
      rows.forEach(row => {
        const content = toContent(row, currency, errors);
        if (content) contents.push(content);
      });
      if (contents.length) eventData.contents = contents;
    }
  }

  if (resolved.customEventName) options.custom_event_name = resolved.customEventName;
  if (hasValue(data.event_id)) options.event_id = makeString(data.event_id).trim();
  const optOut = parseOptOut(data.opt_out);
  if (optOut === null) {
    errors.push('opt_out must be true or false, got "' + makeString(data.opt_out) + '".');
  } else if (optOut !== undefined) {
    options.opt_out = optOut;
  }

  return {
    errors: errors,
    name: resolved.name,
    data: eventData,
    options: hasKeys(options) ? options : null
  };
}

// A standard OpenAI Ads name is sent as is, a GA4 ecommerce name is converted
// to its OpenAI counterpart, and anything else becomes a custom event. The SDK
// only accepts lowercase custom names, so the name is lowercased before the
// format check.
function resolveEventName(rawName) {
  const name = makeString(rawName).trim().toLowerCase();
  if (name !== 'custom' && typeof EVENT_DATA_TYPES[name] === 'string') {
    return { name: name, type: EVENT_DATA_TYPES[name] };
  }
  if (typeof GA4_EVENT_MAP[name] === 'string') {
    const mapped = GA4_EVENT_MAP[name];
    return { name: mapped, type: EVENT_DATA_TYPES[mapped] };
  }
  if (name === 'custom' || !name.match(CUSTOM_EVENT_NAME_PATTERN)) {
    return {
      error: '"' + makeString(rawName) + '" is not a valid custom event name. Use 1 to 64 lowercase letters, ' +
        'numbers, underscores or dashes, starting and ending with a letter or number.'
    };
  }
  return { name: 'custom', type: 'custom', customEventName: name };
}

function readEcommerce() {
  const ecommerce = copyFromDataLayer('ecommerce');
  return getType(ecommerce) === 'object' ? ecommerce : {};
}

// Manual contents (table or variable) take precedence; the dataLayer items are
// the fallback when Data Layer Integration is on. Rows without a single value
// are skipped so an untouched table row sends nothing.
function collectContentRows(ecommerce) {
  let rows;
  if (data.contentsMappingType === 'manual') {
    rows = data.contentsTable;
  } else if (data.contentsMappingType === 'variable') {
    rows = parseContentsVariable(data.contentsVariable);
  }
  if (getType(rows) !== 'array' || !rows.length) {
    rows = getType(ecommerce.items) === 'array' ? ecommerce.items : [];
  }
  return rows.filter(row => getType(row) === 'object' && hasAnyValue(row));
}

// A variable may resolve to an array, a single object or a JSON string of
// either, which is common when the value was stringified into the dataLayer.
function parseContentsVariable(value) {
  if (getType(value) === 'array') return value;
  if (getType(value) === 'object') return [value];
  if (getType(value) === 'string' && value.trim()) {
    const parsed = JSON.parse(value);
    if (getType(parsed) === 'array') return parsed;
    if (getType(parsed) === 'object') return [parsed];
  }
  if (hasValue(value)) log('Contents variable must resolve to an array of content objects, ignored.');
  return [];
}

// Converts one row into a Content object. A GA4 item is recognised by its
// item_id, item_name or price key and mapped onto the OpenAI fields; a row in
// OpenAI shape is passed through with its numbers coerced.
function toContent(row, eventCurrency, errors) {
  const content = {};
  const isGa4Item = row.item_id !== undefined || row.item_name !== undefined || row.price !== undefined;

  if (isGa4Item) {
    addString(content, 'id', row.item_id);
    addString(content, 'name', row.item_name);
    content.content_type = 'product';
    addQuantity(content, row.quantity, errors);
    if (hasValue(row.price)) {
      // GA4 prices are major units (12.99), so they are always scaled.
      const amount = toMinorUnits(row.price, eventCurrency, true);
      if (amount === undefined) {
        errors.push('Content price must be numeric, got "' + makeString(row.price) + '".');
      } else {
        content.amount = amount;
      }
    }
    return hasKeys(content) ? content : null;
  }

  addString(content, 'content_type', row.content_type);
  addString(content, 'id', row.id);
  addString(content, 'name', row.name);
  addQuantity(content, row.quantity, errors);

  let itemCurrency;
  if (hasValue(row.currency)) {
    itemCurrency = normaliseCurrency(row.currency);
    if (!itemCurrency) errors.push('Content currency must be a 3-letter ISO 4217 code, got "' + makeString(row.currency) + '".');
  }
  if (hasValue(row.amount)) {
    const amount = toMinorUnits(row.amount, itemCurrency || eventCurrency, false);
    if (amount === undefined) {
      errors.push('Content amount must be numeric, got "' + makeString(row.amount) + '".');
    } else {
      content.amount = amount;
      if (!itemCurrency && !eventCurrency) errors.push('Content currency or event Currency is required when a content amount is set.');
    }
  }
  if (itemCurrency) content.currency = itemCurrency;

  return hasKeys(content) ? content : null;
}

function addQuantity(content, value, errors) {
  if (!hasValue(value)) return;
  const number = makeNumber(value);
  if (number !== number) {
    errors.push('Content quantity must be an integer, got "' + makeString(value) + '".');
    return;
  }
  // makeInteger rounds, so truncate towards zero first for parseInt semantics.
  content.quantity = makeInteger(number - number % 1);
}

function normaliseCurrency(value) {
  const currency = makeString(value).trim().toUpperCase();
  return currency.match(CURRENCY_PATTERN) ? currency : undefined;
}

// Returns an integer in the currency's minor unit, or undefined when the value
// is not numeric. An integer is taken as minor units already unless forceMajor
// is set; a value with decimals is always major units and is scaled by the
// currency exponent (12.99 USD gives 1299, 1.234 KWD gives 1234).
function toMinorUnits(value, currency, forceMajor) {
  const number = makeNumber(value);
  if (number !== number) return undefined;
  if (!forceMajor && number % 1 === 0) return makeInteger(number);
  const exponent = currency && CURRENCY_EXPONENTS[currency] !== undefined
    ? CURRENCY_EXPONENTS[currency]
    : DEFAULT_CURRENCY_EXPONENT;
  return makeInteger(Math.round(number * Math.pow(10, exponent)));
}

// true / false in boolean or text form, undefined when unset, null when the
// value cannot be interpreted.
function parseOptOut(value) {
  if (!hasValue(value)) return undefined;
  if (value === true || value === false) return value;
  const text = makeString(value).trim().toLowerCase();
  if (text === 'true') return true;
  if (text === 'false') return false;
  return null;
}
