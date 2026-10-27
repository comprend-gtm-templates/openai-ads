// OpenAI Ads Measurement Pixel: GTM custom template tests.
//
// Each block below is one test for the template editor's Tests tab. Add a
// test, name it exactly as the banner line (number included), and paste the
// code between that banner and the next one.
//
// createArgumentsQueue, injectScript, copyFromDataLayer and getContainerVersion
// are mocked so nothing touches the window, the dataLayer or the network; the
// rest of the standard library runs for real. The queue mock records every
// oaiq call as [command, arg1, arg2, arg3, arg4], so an init call is
// ['init', config] and a measureSingle call is
// ['measureSingle', pixelId, eventName, eventData, eventOptions].
//
// gtmOnSuccess / gtmOnFailure must not be passed in the data object; the
// harness injects its own tracked stubs. Assert them with assertApi().

// ============================================================================
// 1 - Initialises every Pixel ID, sends the event to each one and loads the SDK
// ============================================================================
let calls = [], queueKeys, injected;
mock('createArgumentsQueue', function(fnKey, arrayKey) {
  queueKeys = [fnKey, arrayKey];
  return function(command, arg1, arg2, arg3, arg4) {
    calls.push([command, arg1, arg2, arg3, arg4]);
  };
});
mock('injectScript', function(url, onSuccess, onFailure, cacheToken) {
  injected = { url: url, cacheToken: cacheToken };
  onSuccess();
});
mock('getContainerVersion', { debugMode: false, previewMode: false });

runCode({ pixelIds: 'px_a,px_b', loadScript: true, initPixels: true, sendEvent: true, event: 'page_viewed' });

assertThat(queueKeys).isEqualTo(['oaiq', 'oaiq.q']);
assertThat(calls).hasLength(4);
assertThat(calls[0][0]).isEqualTo('init');
assertThat(calls[0][1]).isEqualTo({ pixelId: 'px_a' });
assertThat(calls[1][0]).isEqualTo('init');
assertThat(calls[1][1]).isEqualTo({ pixelId: 'px_b' });
assertThat(calls[2].slice(0, 4)).isEqualTo(['measureSingle', 'px_a', 'page_viewed', { type: 'contents' }]);
assertThat(calls[2][4]).isUndefined();
assertThat(calls[3].slice(0, 4)).isEqualTo(['measureSingle', 'px_b', 'page_viewed', { type: 'contents' }]);
assertThat(injected).isEqualTo({
  url: 'https://bzrcdn.openai.com/sdk/oaiq.min.js',
  cacheToken: 'https://bzrcdn.openai.com/sdk/oaiq.min.js'
});
assertApi('copyFromDataLayer').wasNotCalled();
assertApi('gtmOnSuccess').wasCalled();
assertApi('gtmOnFailure').wasNotCalled();

// ============================================================================
// 2 - Trims, de-duplicates and accepts an array of Pixel IDs
// ============================================================================
let calls = [];
mock('createArgumentsQueue', function(fnKey, arrayKey) {
  return function(command, arg1, arg2, arg3, arg4) {
    calls.push([command, arg1, arg2, arg3, arg4]);
  };
});
mock('injectScript', function(url, onSuccess, onFailure, cacheToken) {
  onSuccess();
});
mock('getContainerVersion', { debugMode: false, previewMode: false });

runCode({ pixelIds: ' px_a , px_b,,px_a ', loadScript: true, initPixels: true, sendEvent: false });

assertThat(calls).hasLength(2);
assertThat(calls[0][1]).isEqualTo({ pixelId: 'px_a' });
assertThat(calls[1][1]).isEqualTo({ pixelId: 'px_b' });

calls = [];
runCode({ pixelIds: ['px_c', ' px_c ', 42], loadScript: true, initPixels: true, sendEvent: false });

assertThat(calls).hasLength(2);
assertThat(calls[0][1]).isEqualTo({ pixelId: 'px_c' });
assertThat(calls[1][1]).isEqualTo({ pixelId: '42' });

// ============================================================================
// 3 - Fails without touching the window when Pixel IDs is empty
// ============================================================================
mock('createArgumentsQueue', function(fnKey, arrayKey) {
  return function(command, arg1, arg2, arg3, arg4) {};
});
mock('injectScript', function(url, onSuccess, onFailure, cacheToken) {
  onSuccess();
});

runCode({ pixelIds: '', loadScript: true, initPixels: true, sendEvent: true, event: 'page_viewed' });
runCode({ pixelIds: ' , ', loadScript: true, initPixels: true, sendEvent: true, event: 'page_viewed' });
runCode({ loadScript: true, initPixels: true, sendEvent: true, event: 'page_viewed' });

assertApi('createArgumentsQueue').wasNotCalled();
assertApi('injectScript').wasNotCalled();
assertApi('gtmOnFailure').wasCalled();
assertApi('gtmOnSuccess').wasNotCalled();

// ============================================================================
// 4 - Skips init when Initialize Pixels is unchecked and points at unused User Data
// ============================================================================
let calls = [], logs = [];
mock('createArgumentsQueue', function(fnKey, arrayKey) {
  return function(command, arg1, arg2, arg3, arg4) {
    calls.push([command, arg1, arg2, arg3, arg4]);
  };
});
mock('injectScript', function(url, onSuccess, onFailure, cacheToken) {
  onSuccess();
});
mock('getContainerVersion', { debugMode: false, previewMode: false });
mock('logToConsole', function(message) {
  logs.push(message);
});

runCode({
  pixelIds: 'px_a',
  loadScript: false,
  initPixels: false,
  sendEvent: true,
  enableDebug: true,
  event: 'lead_created',
  email_sha256: 'b4c9a289323b21a01c3e940f150eb9b8c542587f1abfd8f0e1cc1ffc5e475514'
});

assertThat(calls).hasLength(1);
assertThat(calls[0].slice(0, 4)).isEqualTo(['measureSingle', 'px_a', 'lead_created', { type: 'customer_action' }]);
assertThat(logs).hasLength(1);
assertThat(logs[0].indexOf('Initialize Pixels') !== -1).isTrue();
assertApi('gtmOnSuccess').wasCalled();

// ============================================================================
// 5 - Succeeds at once without injecting the SDK when Load SDK is unchecked
// ============================================================================
let calls = [];
mock('createArgumentsQueue', function(fnKey, arrayKey) {
  return function(command, arg1, arg2, arg3, arg4) {
    calls.push([command, arg1, arg2, arg3, arg4]);
  };
});
mock('injectScript', function(url, onSuccess, onFailure, cacheToken) {
  onSuccess();
});
mock('getContainerVersion', { debugMode: false, previewMode: false });

runCode({ pixelIds: 'px_a', loadScript: false, initPixels: true, sendEvent: false });

assertThat(calls).hasLength(1);
assertThat(calls[0][0]).isEqualTo('init');
assertApi('injectScript').wasNotCalled();
assertApi('gtmOnSuccess').wasCalled();
assertApi('gtmOnFailure').wasNotCalled();

// ============================================================================
// 6 - Sends no event when Send Event is unchecked
// ============================================================================
let calls = [];
mock('createArgumentsQueue', function(fnKey, arrayKey) {
  return function(command, arg1, arg2, arg3, arg4) {
    calls.push([command, arg1, arg2, arg3, arg4]);
  };
});
mock('injectScript', function(url, onSuccess, onFailure, cacheToken) {
  onSuccess();
});
mock('getContainerVersion', { debugMode: false, previewMode: false });

runCode({ pixelIds: 'px_a,px_b', loadScript: true, initPixels: true, sendEvent: false });

assertThat(calls).hasLength(2);
assertThat(calls.filter(call => call[0] === 'measureSingle')).isEmpty();
assertApi('gtmOnSuccess').wasCalled();

// ============================================================================
// 7 - Adds the debug flag to init in Preview mode
// ============================================================================
let calls = [];
mock('createArgumentsQueue', function(fnKey, arrayKey) {
  return function(command, arg1, arg2, arg3, arg4) {
    calls.push([command, arg1, arg2, arg3, arg4]);
  };
});
mock('injectScript', function(url, onSuccess, onFailure, cacheToken) {
  onSuccess();
});
mock('getContainerVersion', { debugMode: false, previewMode: true });

runCode({ pixelIds: 'px_a', loadScript: false, initPixels: true, sendEvent: false });

assertThat(calls[0][1]).isEqualTo({ pixelId: 'px_a', debug: true });

// ============================================================================
// 8 - Adds the debug flag to init when Log Diagnostics is checked
// ============================================================================
let calls = [];
mock('createArgumentsQueue', function(fnKey, arrayKey) {
  return function(command, arg1, arg2, arg3, arg4) {
    calls.push([command, arg1, arg2, arg3, arg4]);
  };
});
mock('injectScript', function(url, onSuccess, onFailure, cacheToken) {
  onSuccess();
});
mock('getContainerVersion', { debugMode: false, previewMode: false });

runCode({ pixelIds: 'px_a', loadScript: false, initPixels: true, sendEvent: false, enableDebug: true });

assertThat(calls[0][1]).isEqualTo({ pixelId: 'px_a', debug: true });

// ============================================================================
// 9 - Sends valid User Data with every init call and normalises it
// ============================================================================
let calls = [];
mock('createArgumentsQueue', function(fnKey, arrayKey) {
  return function(command, arg1, arg2, arg3, arg4) {
    calls.push([command, arg1, arg2, arg3, arg4]);
  };
});
mock('injectScript', function(url, onSuccess, onFailure, cacheToken) {
  onSuccess();
});
mock('getContainerVersion', { debugMode: false, previewMode: false });

const emailHash = 'B4C9A289323B21A01C3E940F150EB9B8C542587F1ABFD8F0E1CC1FFC5E475514';

runCode({
  pixelIds: 'px_a,px_b',
  loadScript: false,
  initPixels: true,
  sendEvent: false,
  email_sha256: ' ' + emailHash + ' ',
  phone_number_sha256: '758fbf68945f21c416814c539ab578876c8d98fb69e6da692def92cd52417fe0',
  external_id_sha256: '73d83a078369bb4f0971b317aa7797a91cf5c0df1b62161c2e47d75c33ab5b6e',
  first_name_sha256: 'fdee430d40bd57deeac186cd9790033d0f06f909a8806e7ce6e717ab7c7d5029',
  last_name_sha256: 'fb1e7ec987523d2cb9e022cec1d6ae7c99dc46edfae4fe51254025fe4bea571f',
  country: ' se ',
  city: ' Stockholm ',
  region: 'Stockholm County',
  postal_code: ' 114 56 '
});

const expectedUser = {
  email_sha256: emailHash.toLowerCase(),
  phone_number_sha256: '758fbf68945f21c416814c539ab578876c8d98fb69e6da692def92cd52417fe0',
  external_id_sha256: '73d83a078369bb4f0971b317aa7797a91cf5c0df1b62161c2e47d75c33ab5b6e',
  first_name_sha256: 'fdee430d40bd57deeac186cd9790033d0f06f909a8806e7ce6e717ab7c7d5029',
  last_name_sha256: 'fb1e7ec987523d2cb9e022cec1d6ae7c99dc46edfae4fe51254025fe4bea571f',
  country: 'SE',
  city: 'Stockholm',
  region: 'Stockholm County',
  postal_code: '114 56'
};

assertThat(calls).hasLength(2);
assertThat(calls[0][1]).isEqualTo({ pixelId: 'px_a', user: expectedUser });
assertThat(calls[1][1]).isEqualTo({ pixelId: 'px_b', user: expectedUser });

// ============================================================================
// 10 - Drops User Data values that fail the sanity check and logs each one
// ============================================================================
let calls = [], logs = [];
mock('createArgumentsQueue', function(fnKey, arrayKey) {
  return function(command, arg1, arg2, arg3, arg4) {
    calls.push([command, arg1, arg2, arg3, arg4]);
  };
});
mock('injectScript', function(url, onSuccess, onFailure, cacheToken) {
  onSuccess();
});
mock('getContainerVersion', { debugMode: false, previewMode: false });
mock('logToConsole', function(message) {
  logs.push(message);
});

let longCity = '';
for (let i = 0; i < 129; i++) longCity += 'a';

runCode({
  pixelIds: 'px_a',
  loadScript: false,
  initPixels: true,
  sendEvent: false,
  enableDebug: true,
  email_sha256: 'john@example.com',
  phone_number_sha256: '+1 (415) 555-2671',
  external_id_sha256: '73d83a078369bb4f0971b317aa7797a91cf5c0df1b62161c2e47d75c33ab5b6e',
  first_name_sha256: 'fdee430d40bd57deeac186cd9790033d0f06f909a8806e7ce6e717ab7c7d502',
  last_name_sha256: '',
  country: 'USA',
  city: longCity,
  region: '   ',
  postal_code: 'ABC_123!'
});

assertThat(calls[0][1]).isEqualTo({
  pixelId: 'px_a',
  debug: true,
  user: { external_id_sha256: '73d83a078369bb4f0971b317aa7797a91cf5c0df1b62161c2e47d75c33ab5b6e' }
});
assertThat(logs).hasLength(7);
const joinedLogs = logs.join('|');
['email_sha256', 'phone_number_sha256', 'first_name_sha256', 'country', 'city', 'region', 'postal_code']
  .forEach(field => assertThat(joinedLogs.indexOf(field) !== -1, field + ' should be logged').isTrue());
assertThat(joinedLogs.indexOf('john@example.com') === -1, 'raw values must not be logged').isTrue();
assertApi('gtmOnSuccess').wasCalled();

// ============================================================================
// 11 - Sends amount, currency and the manual contents table with integer values
// ============================================================================
let calls = [];
mock('createArgumentsQueue', function(fnKey, arrayKey) {
  return function(command, arg1, arg2, arg3, arg4) {
    calls.push([command, arg1, arg2, arg3, arg4]);
  };
});
mock('injectScript', function(url, onSuccess, onFailure, cacheToken) {
  onSuccess();
});
mock('getContainerVersion', { debugMode: false, previewMode: false });

runCode({
  pixelIds: 'px_a',
  loadScript: false,
  initPixels: false,
  sendEvent: true,
  event: 'order_created',
  amount: '2599',
  currency: 'usd',
  contentsMappingType: 'manual',
  contentsTable: [
    { content_type: 'product', id: 'sku_1', name: 'Starter bundle', quantity: '2', amount: '1299' },
    { content_type: '', id: '', name: '', quantity: '', amount: '' }
  ]
});

assertThat(calls).hasLength(1);
assertThat(calls[0].slice(0, 4)).isEqualTo(['measureSingle', 'px_a', 'order_created', {
  type: 'contents',
  amount: 2599,
  currency: 'USD',
  contents: [{ content_type: 'product', id: 'sku_1', name: 'Starter bundle', quantity: 2, amount: 1299 }]
}]);
assertThat(calls[0][4]).isUndefined();
assertApi('gtmOnSuccess').wasCalled();

// ============================================================================
// 12 - Converts decimal amounts to minor units with the currency exponent
// ============================================================================
let calls = [];
mock('createArgumentsQueue', function(fnKey, arrayKey) {
  return function(command, arg1, arg2, arg3, arg4) {
    calls.push([command, arg1, arg2, arg3, arg4]);
  };
});
mock('injectScript', function(url, onSuccess, onFailure, cacheToken) {
  onSuccess();
});
mock('getContainerVersion', { debugMode: false, previewMode: false });

runCode({
  pixelIds: 'px_a',
  loadScript: false,
  initPixels: false,
  sendEvent: true,
  event: 'order_created',
  amount: '12.99',
  currency: 'USD',
  contentsMappingType: 'manual',
  contentsTable: [{ id: 'a', quantity: '2.7', amount: '0.5' }]
});

assertThat(calls[0][3]).isEqualTo({
  type: 'contents',
  amount: 1299,
  currency: 'USD',
  contents: [{ id: 'a', quantity: 2, amount: 50 }]
});

calls = [];
runCode({
  pixelIds: 'px_a',
  loadScript: false,
  initPixels: false,
  sendEvent: true,
  event: 'order_created',
  amount: '12.5',
  currency: 'jpy'
});

assertThat(calls[0][3]).isEqualTo({ type: 'contents', amount: 13, currency: 'JPY' });

calls = [];
runCode({
  pixelIds: 'px_a',
  loadScript: false,
  initPixels: false,
  sendEvent: true,
  event: 'order_created',
  amount: 1.234,
  currency: 'KWD',
  contentsMappingType: 'manual',
  contentsTable: [{ id: 'b', amount: '2.5', currency: 'eur' }]
});

assertThat(calls[0][3]).isEqualTo({
  type: 'contents',
  amount: 1234,
  currency: 'KWD',
  contents: [{ id: 'b', amount: 250, currency: 'EUR' }]
});

// ============================================================================
// 13 - Fails when an amount has no currency or the currency is not a 3-letter code
// ============================================================================
let calls = [];
mock('createArgumentsQueue', function(fnKey, arrayKey) {
  return function(command, arg1, arg2, arg3, arg4) {
    calls.push([command, arg1, arg2, arg3, arg4]);
  };
});
mock('injectScript', function(url, onSuccess, onFailure, cacheToken) {
  onSuccess();
});
mock('getContainerVersion', { debugMode: false, previewMode: false });

runCode({ pixelIds: 'px_a', loadScript: false, initPixels: false, sendEvent: true, event: 'order_created', amount: '100' });
runCode({ pixelIds: 'px_a', loadScript: false, initPixels: false, sendEvent: true, event: 'order_created', amount: '100', currency: 'US Dollar' });
runCode({
  pixelIds: 'px_a',
  loadScript: false,
  initPixels: false,
  sendEvent: true,
  event: 'order_created',
  contentsMappingType: 'manual',
  contentsTable: [{ id: 'a', amount: '100' }]
});

assertThat(calls).isEmpty();
assertApi('gtmOnFailure').wasCalled();
assertApi('gtmOnSuccess').wasNotCalled();

// ============================================================================
// 14 - Fails when an amount or quantity is not numeric
// ============================================================================
let calls = [];
mock('createArgumentsQueue', function(fnKey, arrayKey) {
  return function(command, arg1, arg2, arg3, arg4) {
    calls.push([command, arg1, arg2, arg3, arg4]);
  };
});
mock('injectScript', function(url, onSuccess, onFailure, cacheToken) {
  onSuccess();
});
mock('getContainerVersion', { debugMode: false, previewMode: false });

runCode({ pixelIds: 'px_a', loadScript: false, initPixels: false, sendEvent: true, event: 'order_created', amount: 'free', currency: 'USD' });
runCode({
  pixelIds: 'px_a',
  loadScript: false,
  initPixels: false,
  sendEvent: true,
  event: 'order_created',
  currency: 'USD',
  contentsMappingType: 'manual',
  contentsTable: [{ id: 'a', quantity: 'two' }]
});
runCode({
  pixelIds: 'px_a',
  loadScript: false,
  initPixels: false,
  sendEvent: true,
  event: 'order_created',
  currency: 'USD',
  contentsMappingType: 'manual',
  contentsTable: [{ id: 'a', amount: '1,299' }]
});

assertThat(calls).isEmpty();
assertApi('gtmOnFailure').wasCalled();
assertApi('gtmOnSuccess').wasNotCalled();

// ============================================================================
// 15 - Sends a custom event with its lowercased name in the options
// ============================================================================
let calls = [];
mock('createArgumentsQueue', function(fnKey, arrayKey) {
  return function(command, arg1, arg2, arg3, arg4) {
    calls.push([command, arg1, arg2, arg3, arg4]);
  };
});
mock('injectScript', function(url, onSuccess, onFailure, cacheToken) {
  onSuccess();
});
mock('getContainerVersion', { debugMode: false, previewMode: false });

runCode({
  pixelIds: 'px_a',
  loadScript: false,
  initPixels: false,
  sendEvent: true,
  event: 'custom',
  custom_event_name: ' Quote_Requested ',
  plan_id: ' pro_monthly ',
  amount: '1000',
  currency: 'EUR',
  contentsMappingType: 'manual',
  contentsTable: [{ content_type: 'plan', id: 'pro' }]
});

assertThat(calls).hasLength(1);
assertThat(calls[0]).isEqualTo([
  'measureSingle',
  'px_a',
  'custom',
  { type: 'custom', amount: 1000, currency: 'EUR', plan_id: 'pro_monthly', contents: [{ content_type: 'plan', id: 'pro' }] },
  { custom_event_name: 'quote_requested' }
]);
assertApi('gtmOnSuccess').wasCalled();

// ============================================================================
// 16 - Converts a custom event name that matches a standard or GA4 event
// ============================================================================
let calls = [];
mock('createArgumentsQueue', function(fnKey, arrayKey) {
  return function(command, arg1, arg2, arg3, arg4) {
    calls.push([command, arg1, arg2, arg3, arg4]);
  };
});
mock('injectScript', function(url, onSuccess, onFailure, cacheToken) {
  onSuccess();
});
mock('getContainerVersion', { debugMode: false, previewMode: false });

runCode({
  pixelIds: 'px_a',
  loadScript: false,
  initPixels: false,
  sendEvent: true,
  event: 'custom',
  custom_event_name: 'purchase',
  amount: '500',
  currency: 'SEK'
});

assertThat(calls[0].slice(0, 4)).isEqualTo(['measureSingle', 'px_a', 'order_created', { type: 'contents', amount: 500, currency: 'SEK' }]);
assertThat(calls[0][4]).isUndefined();

calls = [];
runCode({ pixelIds: 'px_a', loadScript: false, initPixels: false, sendEvent: true, event: 'custom', custom_event_name: 'Lead_Created' });

assertThat(calls[0].slice(0, 4)).isEqualTo(['measureSingle', 'px_a', 'lead_created', { type: 'customer_action' }]);
assertThat(calls[0][4]).isUndefined();

// ============================================================================
// 17 - Fails when the custom event name is missing or invalid
// ============================================================================
let calls = [];
mock('createArgumentsQueue', function(fnKey, arrayKey) {
  return function(command, arg1, arg2, arg3, arg4) {
    calls.push([command, arg1, arg2, arg3, arg4]);
  };
});
mock('injectScript', function(url, onSuccess, onFailure, cacheToken) {
  onSuccess();
});
mock('getContainerVersion', { debugMode: false, previewMode: false });

let longName = '';
for (let i = 0; i < 65; i++) longName += 'a';

runCode({ pixelIds: 'px_a', loadScript: false, initPixels: false, sendEvent: true, event: 'custom' });
runCode({ pixelIds: 'px_a', loadScript: false, initPixels: false, sendEvent: true, event: 'custom', custom_event_name: 'quote requested' });
runCode({ pixelIds: 'px_a', loadScript: false, initPixels: false, sendEvent: true, event: 'custom', custom_event_name: 'custom' });
runCode({ pixelIds: 'px_a', loadScript: false, initPixels: false, sendEvent: true, event: 'custom', custom_event_name: '-quote' });
runCode({ pixelIds: 'px_a', loadScript: false, initPixels: false, sendEvent: true, event: 'custom', custom_event_name: longName });

assertThat(calls).isEmpty();
assertApi('gtmOnFailure').wasCalled();
assertApi('gtmOnSuccess').wasNotCalled();

// ============================================================================
// 18 - Ignores contents and Plan ID for customer_action events
// ============================================================================
let calls = [], logs = [];
mock('createArgumentsQueue', function(fnKey, arrayKey) {
  return function(command, arg1, arg2, arg3, arg4) {
    calls.push([command, arg1, arg2, arg3, arg4]);
  };
});
mock('injectScript', function(url, onSuccess, onFailure, cacheToken) {
  onSuccess();
});
mock('getContainerVersion', { debugMode: false, previewMode: false });
mock('logToConsole', function(message) {
  logs.push(message);
});

runCode({
  pixelIds: 'px_a',
  loadScript: false,
  initPixels: false,
  sendEvent: true,
  enableDebug: true,
  event: 'appointment_scheduled',
  amount: '5000',
  currency: 'USD',
  plan_id: 'pro',
  contentsMappingType: 'manual',
  contentsTable: [{ id: 'a' }]
});

assertThat(calls[0][3]).isEqualTo({ type: 'customer_action', amount: 5000, currency: 'USD' });
assertThat(logs).hasLength(2);
assertApi('gtmOnSuccess').wasCalled();

// ============================================================================
// 19 - Reads contents from a GTM variable in OpenAI shape, GA4 item shape or as a JSON string
// ============================================================================
let calls = [];
mock('createArgumentsQueue', function(fnKey, arrayKey) {
  return function(command, arg1, arg2, arg3, arg4) {
    calls.push([command, arg1, arg2, arg3, arg4]);
  };
});
mock('injectScript', function(url, onSuccess, onFailure, cacheToken) {
  onSuccess();
});
mock('getContainerVersion', { debugMode: false, previewMode: false });

runCode({
  pixelIds: 'px_a',
  loadScript: false,
  initPixels: false,
  sendEvent: true,
  event: 'items_added',
  currency: 'SEK',
  contentsMappingType: 'variable',
  contentsVariable: [{ id: 'a', name: 'A', content_type: 'product', quantity: 1, amount: 500, currency: 'SEK' }]
});

assertThat(calls[0][3]).isEqualTo({
  type: 'contents',
  currency: 'SEK',
  contents: [{ id: 'a', name: 'A', content_type: 'product', quantity: 1, amount: 500, currency: 'SEK' }]
});

calls = [];
runCode({
  pixelIds: 'px_a',
  loadScript: false,
  initPixels: false,
  sendEvent: true,
  event: 'items_added',
  currency: 'USD',
  contentsMappingType: 'variable',
  contentsVariable: [{ item_id: 'sku_1', item_name: 'Starter', price: 12.99, quantity: 2, item_category: 'Bundles' }]
});

assertThat(calls[0][3]).isEqualTo({
  type: 'contents',
  currency: 'USD',
  contents: [{ id: 'sku_1', name: 'Starter', content_type: 'product', quantity: 2, amount: 1299 }]
});

calls = [];
runCode({
  pixelIds: 'px_a',
  loadScript: false,
  initPixels: false,
  sendEvent: true,
  event: 'contents_viewed',
  contentsMappingType: 'variable',
  contentsVariable: '[{"id":"json_1"},{"id":"json_2"}]'
});

assertThat(calls[0][3]).isEqualTo({ type: 'contents', contents: [{ id: 'json_1' }, { id: 'json_2' }] });

calls = [];
runCode({
  pixelIds: 'px_a',
  loadScript: false,
  initPixels: false,
  sendEvent: true,
  event: 'contents_viewed',
  contentsMappingType: 'variable',
  contentsVariable: 'not json'
});

assertThat(calls[0][3]).isEqualTo({ type: 'contents' });
assertApi('gtmOnSuccess').wasCalled();
assertApi('gtmOnFailure').wasNotCalled();

// ============================================================================
// 20 - Builds the event from the dataLayer when Data Layer Integration is on
// ============================================================================
let calls = [];
mock('createArgumentsQueue', function(fnKey, arrayKey) {
  return function(command, arg1, arg2, arg3, arg4) {
    calls.push([command, arg1, arg2, arg3, arg4]);
  };
});
mock('injectScript', function(url, onSuccess, onFailure, cacheToken) {
  onSuccess();
});
mock('getContainerVersion', { debugMode: false, previewMode: false });
mock('copyFromDataLayer', function(key) {
  return ({
    event: 'purchase',
    ecommerce: {
      transaction_id: 'T_1',
      value: 25.99,
      currency: 'usd',
      items: [{ item_id: 'sku_1', item_name: 'Starter', price: 12.99, quantity: 2 }]
    }
  })[key];
});

runCode({ pixelIds: 'px_a', loadScript: false, initPixels: false, sendEvent: true, ecomIntegration: true, event_id: 'T_1' });

assertThat(calls).hasLength(1);
assertThat(calls[0]).isEqualTo([
  'measureSingle',
  'px_a',
  'order_created',
  {
    type: 'contents',
    amount: 2599,
    currency: 'USD',
    contents: [{ id: 'sku_1', name: 'Starter', content_type: 'product', quantity: 2, amount: 1299 }]
  },
  { event_id: 'T_1' }
]);
assertApi('copyFromDataLayer').wasCalledWith('event');
assertApi('copyFromDataLayer').wasCalledWith('ecommerce');
assertApi('gtmOnSuccess').wasCalled();

// ============================================================================
// 21 - Lets manually mapped fields override dataLayer values
// ============================================================================
let calls = [];
mock('createArgumentsQueue', function(fnKey, arrayKey) {
  return function(command, arg1, arg2, arg3, arg4) {
    calls.push([command, arg1, arg2, arg3, arg4]);
  };
});
mock('injectScript', function(url, onSuccess, onFailure, cacheToken) {
  onSuccess();
});
mock('getContainerVersion', { debugMode: false, previewMode: false });
mock('copyFromDataLayer', function(key) {
  return ({
    event: 'purchase',
    ecommerce: {
      value: 25.99,
      currency: 'USD',
      items: [{ item_id: 'sku_1', item_name: 'Starter', price: 12.99, quantity: 2 }]
    }
  })[key];
});

runCode({
  pixelIds: 'px_a',
  loadScript: false,
  initPixels: false,
  sendEvent: true,
  ecomIntegration: true,
  amount: '9900',
  currency: 'SEK',
  contentsMappingType: 'manual',
  contentsTable: [{ id: 'manual_1', quantity: '1' }]
});

assertThat(calls[0][2]).isEqualTo('order_created');
assertThat(calls[0][3]).isEqualTo({
  type: 'contents',
  amount: 9900,
  currency: 'SEK',
  contents: [{ id: 'manual_1', quantity: 1 }]
});

// An empty manual table falls back to the dataLayer items.
calls = [];
runCode({
  pixelIds: 'px_a',
  loadScript: false,
  initPixels: false,
  sendEvent: true,
  ecomIntegration: true,
  contentsMappingType: 'manual',
  contentsTable: []
});

assertThat(calls[0][3].contents).hasLength(1);
assertThat(calls[0][3].contents[0].id).isEqualTo('sku_1');

// ============================================================================
// 22 - Sends an unmapped dataLayer event as a custom event and fails on an invalid name
// ============================================================================
let calls = [], dataLayerEvent = 'newsletter_signup';
mock('createArgumentsQueue', function(fnKey, arrayKey) {
  return function(command, arg1, arg2, arg3, arg4) {
    calls.push([command, arg1, arg2, arg3, arg4]);
  };
});
mock('injectScript', function(url, onSuccess, onFailure, cacheToken) {
  onSuccess();
});
mock('getContainerVersion', { debugMode: false, previewMode: false });
mock('copyFromDataLayer', function(key) {
  return key === 'event' ? dataLayerEvent : undefined;
});

runCode({ pixelIds: 'px_a', loadScript: false, initPixels: false, sendEvent: true, ecomIntegration: true });

assertThat(calls[0]).isEqualTo(['measureSingle', 'px_a', 'custom', { type: 'custom' }, { custom_event_name: 'newsletter_signup' }]);
assertApi('gtmOnSuccess').wasCalled();

// The container load event is mapped to page_viewed so an All Pages trigger works.
calls = [];
dataLayerEvent = 'gtm.js';
runCode({ pixelIds: 'px_a', loadScript: false, initPixels: false, sendEvent: true, ecomIntegration: true });

assertThat(calls[0].slice(0, 4)).isEqualTo(['measureSingle', 'px_a', 'page_viewed', { type: 'contents' }]);
assertThat(calls[0][4]).isUndefined();

// Any other dotted name is not a valid custom event name.
calls = [];
dataLayerEvent = 'some.event';
runCode({ pixelIds: 'px_a', loadScript: false, initPixels: false, sendEvent: true, ecomIntegration: true });

assertThat(calls).isEmpty();
assertApi('gtmOnFailure').wasCalled();

calls = [];
dataLayerEvent = undefined;
runCode({ pixelIds: 'px_a', loadScript: false, initPixels: false, sendEvent: true, ecomIntegration: true });

assertThat(calls).isEmpty();

// ============================================================================
// 23 - Passes event_id and opt_out through the options
// ============================================================================
let calls = [];
mock('createArgumentsQueue', function(fnKey, arrayKey) {
  return function(command, arg1, arg2, arg3, arg4) {
    calls.push([command, arg1, arg2, arg3, arg4]);
  };
});
mock('injectScript', function(url, onSuccess, onFailure, cacheToken) {
  onSuccess();
});
mock('getContainerVersion', { debugMode: false, previewMode: false });

runCode({ pixelIds: 'px_a', loadScript: false, initPixels: false, sendEvent: true, event: 'page_viewed', event_id: ' evt_1 ', opt_out: 'TRUE' });

assertThat(calls[0][4]).isEqualTo({ event_id: 'evt_1', opt_out: true });

calls = [];
runCode({ pixelIds: 'px_a', loadScript: false, initPixels: false, sendEvent: true, event: 'page_viewed', opt_out: false });

assertThat(calls[0][4]).isEqualTo({ opt_out: false });

calls = [];
runCode({ pixelIds: 'px_a', loadScript: false, initPixels: false, sendEvent: true, event: 'page_viewed', opt_out: '' });

assertThat(calls[0][4]).isUndefined();

calls = [];
runCode({ pixelIds: 'px_a', loadScript: false, initPixels: false, sendEvent: true, event: 'page_viewed', opt_out: 'maybe' });

assertThat(calls).isEmpty();
assertApi('gtmOnFailure').wasCalled();

// ============================================================================
// 24 - Signals failure when the SDK fails to load
// ============================================================================
mock('createArgumentsQueue', function(fnKey, arrayKey) {
  return function(command, arg1, arg2, arg3, arg4) {};
});
mock('injectScript', function(url, onSuccess, onFailure, cacheToken) {
  onFailure();
});
mock('getContainerVersion', { debugMode: false, previewMode: false });

runCode({ pixelIds: 'px_a', loadScript: true, initPixels: true, sendEvent: false });

assertApi('gtmOnFailure').wasCalled();
assertApi('gtmOnSuccess').wasNotCalled();
