# OpenAI Ads by Comprend

## Purpose

Loads the OpenAI Ads Measurement Pixel (`oaiq.min.js`) in a web container, initialises one or more Pixel IDs with optional hashed user data, and sends a measurement event to each of them, so conversions on your site can be attributed to ads in ChatGPT. One tag template covers the base tag, the conversion tags and user-data updates; three checkboxes decide which of those jobs a given tag does.

Documentation for the pixel itself: [Measurement Pixel](https://developers.openai.com/ads/measurement-pixel), [Multiple Pixel IDs](https://developers.openai.com/ads/multiple-pixels), [Supported Events](https://developers.openai.com/ads/supported-events).

## Behaviour

- Reads **Pixel ID(s)**, splits the value on commas, trims each entry and drops blanks and duplicates. Stops with a failure, sending nothing, when no Pixel ID is left.
- With **Initialize Pixels** checked, queues one `init` call per Pixel ID. The call carries the **User Data** fields that pass the checks below and, in Preview and Debug mode or with **Log Diagnostics** checked, the pixel's own `debug` flag so the SDK logs to the browser console. Without **Initialize Pixels**, no `init` is sent and any **User Data** is ignored (a diagnostics line says so).
- With **Send Event** checked, builds one event and sends it to each listed Pixel ID individually. Pixels initialised by other tags but not listed here do not receive it.
- The event name comes from **Event Name**, from **Custom Event Name** when **Event Name** is `custom`, or from the dataLayer `event` key when **Data Layer Integration** is checked. A standard OpenAI Ads name is sent as it is. A GA4 ecommerce name is converted: `page_view` and `gtm.js` to `page_viewed`, `view_item` and `view_item_list` to `contents_viewed`, `add_to_cart` to `items_added`, `begin_checkout` to `checkout_started`, `purchase` to `order_created`, `generate_lead` to `lead_created`, `sign_up` to `registration_completed`. Anything else is sent as a custom event under that name, lowercased.
- The event data type follows the event: `contents` for page and commerce events, `customer_action` for lead, registration and appointment events, `plan_enrollment` for trial and subscription events, `custom` for custom events. `plan_id` is only sent with plan and custom events, and `contents` is never sent with `customer_action` events; values that do not apply are dropped with a diagnostics line.
- Monetary amounts are sent as integers in the currency's minor unit. A whole number in **Amount** or in a contents row is taken as minor units already (`12999` is USD 129.99). A number with decimals is taken as major units and converted with the currency's ISO 4217 exponent (`129.99` USD becomes `12999`, `1.234` KWD becomes `1234`, `12.5` JPY becomes `13`). Values read from the dataLayer (`ecommerce.value`, `items[].price`) are always treated as major units. Quantities are truncated to whole numbers.
- Before anything is sent, the event is checked against the pixel's rules: a currency must be three letters, an amount needs a currency, a custom event name must be valid, **Opt Out** must be true or false, numbers must be numeric. Any problem fails the tag, sends nothing, and lists every problem in the console when diagnostics are on.
- The five hashed **User Data** fields are trimmed and lowercased and must be 64 hexadecimal characters. **Country** is uppercased and must be two letters, **City** and **Region** at most 128 characters, **Postal Code** letters, digits, spaces or hyphens up to 32 characters. A value that fails its check is dropped and named in a diagnostics line; the value itself is never logged.
- With **Load SDK** checked, loads `oaiq.min.js` from `bzrcdn.openai.com`. The script is loaded once per page; further tags from this template reuse it. The tag succeeds when the script has loaded and fails when it cannot be loaded. Without **Load SDK**, the tag succeeds at once and its queued calls run when another tag loads the script.
- Diagnostics lines are prefixed `[OpenAI Ads]` and appear in Preview and Debug mode, or in a published container when **Log Diagnostics** is checked and the template's logging permission allows it.

## Fields

### Pixel setup

| Field | Required | Accepts | Effect on data |
| --- | --- | --- | --- |
| Pixel ID(s) | Yes | One or more Pixel IDs from the conversions tab of Ads Manager, comma separated (`px_a, px_b`), literal or a variable returning a string or an array | One `init` and one event per ID. Empty: the tag fails |
| Load SDK | No, checked by default | Checkbox | Loads the pixel script once per page. Unchecked: nothing is loaded and the tag relies on another tag to load it |
| Initialize Pixels | No, checked by default | Checkbox | Sends `init` for each Pixel ID, with **User Data** when set. Unchecked: no `init`, **User Data** ignored |
| Send Event | No, checked by default | Checkbox | Sends the configured event to each Pixel ID. Unchecked: the two event groups are hidden and nothing is sent |
| Log Diagnostics | No, unchecked by default | Checkbox | Writes diagnostics to the console and sets the pixel's `debug` flag in a published container. Both happen automatically in Preview and Debug mode |

### Event Configuration (shown when Send Event is checked)

| Field | Required | Accepts | Effect on data |
| --- | --- | --- | --- |
| Data Layer Integration | No | Checkbox | Builds the event from the dataLayer: name from `event`, amount from `ecommerce.value`, currency from `ecommerce.currency`, contents from `ecommerce.items`. Hides **Event Name**. The fields below take precedence when they have a value |
| Event Name | Yes, when **Data Layer Integration** is off | `page_viewed` (default), `contents_viewed`, `items_added`, `checkout_started`, `order_created`, `lead_created`, `registration_completed`, `appointment_scheduled`, `trial_started`, `subscription_created` or `custom` | The event name and its data type |
| Custom Event Name | Yes, when **Event Name** is `custom` | 1 to 64 letters, digits, underscores or dashes, starting and ending with a letter or digit; uppercase is lowercased | Sent as `custom_event_name`. A standard OpenAI Ads name is sent as that standard event instead, and a GA4 ecommerce name is converted as described above |
| Currency (currency) | When an amount is set | Three-letter ISO 4217 code, any case | `currency` on the event, and the currency used to convert decimal amounts. Empty with **Data Layer Integration**: `ecommerce.currency` |
| Amount (amount) | No | Whole number in minor units (`12999`) or decimal in major units (`129.99`), literal or variable | `amount` on the event. Empty with **Data Layer Integration**: `ecommerce.value`, converted to minor units. Not numeric: the tag fails |
| Plan ID (plan_id) | No, shown for `trial_started`, `subscription_created` and `custom` | Your plan or subscription identifier | `plan_id` on the event. Ignored for other event types |
| Contents Mapping Type | No, shown for events that accept contents | `Manual` or `GTM Variable` | Chooses where contents come from. Not chosen: contents come only from `ecommerce.items` when **Data Layer Integration** is on |
| Contents (contents), table | No, shown for `Manual` | Rows with `content_type`, `id`, `name`, `quantity` and `amount` | Each row with at least one value becomes a `contents` item. `quantity` is a whole number, `amount` is the price of one unit (minor units or decimal major units, see above). Rows share the event's **Currency**. An empty table falls back to `ecommerce.items` when **Data Layer Integration** is on |
| Contents (contents), variable | No, shown for `GTM Variable` | A variable returning an array of content objects (`id`, `name`, `content_type`, `quantity`, `amount`, `currency`), an array of GA4 `items`, a single object, or a JSON string of either | Converted to `contents`. GA4 items map `item_id` to `id`, `item_name` to `name`, `price` to `amount` (converted), `quantity` to `quantity`, and get `content_type` `product`. Anything else is ignored with a diagnostics line |

### Additional Event Settings (shown when Send Event is checked)

| Field | Required | Accepts | Effect on data |
| --- | --- | --- | --- |
| Event ID (event_id) | No | The ID you also send with the same conversion from the server, literal or variable | `event_id` option, used by OpenAI to deduplicate browser and server events. Empty: omitted |
| Opt Out of User-level Personalization (opt_out) | No | `true` or `false`, literal or a variable returning a boolean | `opt_out` option. Empty: omitted, which OpenAI treats as `false`. Any other value: the tag fails |

### User Data (collapsed, sent only with Initialize Pixels)

| Field | Required | Accepts | Effect on data |
| --- | --- | --- | --- |
| Email (SHA-256) | No | SHA-256 of the email after trimming and lowercasing, as 64 hexadecimal characters | `email_sha256` in the user object, lowercased. Other values are dropped |
| Phone Number (SHA-256) | No | SHA-256 of the 8 to 15 digits left after removing the leading `+`, leading zeroes, spaces, parentheses, periods and hyphens | `phone_number_sha256`, lowercased. Other values are dropped |
| External ID (SHA-256) | No | SHA-256 of your trimmed, stable customer identifier | `external_id_sha256`, lowercased. Other values are dropped |
| First Name (SHA-256) | No | SHA-256 of the lowercase first name without whitespace and ASCII punctuation | `first_name_sha256`, lowercased. Other values are dropped |
| Last Name (SHA-256) | No | SHA-256 of the lowercase last name without whitespace and ASCII punctuation | `last_name_sha256`, lowercased. Other values are dropped |
| Country | No | Two-letter ISO 3166-1 code, any case | `country`, uppercased. Other values are dropped |
| City | No | City name, up to 128 characters | `city`, trimmed |
| Region | No | State, province or region, up to 128 characters | `region`, trimmed |
| Postal Code | No | Letters, digits, spaces or hyphens, up to 32 characters | `postal_code`, trimmed. Other values are dropped |

## Setup notes

- The usual layout is one base tag and one tag per conversion. The base tag fires on All Pages with **Load SDK** and **Initialize Pixels** checked and **Send Event** either checked with `page_viewed` or unchecked. Conversion tags fire on their own triggers with **Load SDK** and **Initialize Pixels** unchecked. The pixel only accepts events for a Pixel ID that has been initialised, so when a conversion can fire on the same event as the base tag, use tag sequencing to fire the base tag first.
- To update user data after a login, add a tag with **Initialize Pixels** checked, **Load SDK** and **Send Event** unchecked, and the **User Data** fields mapped. Calling `init` again with the same Pixel ID is how the pixel takes new user data.
- **Data Layer Integration** expects the standard GA4 ecommerce dataLayer shape (`event`, `ecommerce.value`, `ecommerce.currency`, `ecommerce.items[]` with `item_id`, `item_name`, `price`, `quantity`). Fire the tag on Custom Event triggers for the GA4 events listed above, or on All Pages for `page_viewed`. Push `ecommerce: null` before each ecommerce event as GA4 recommends, otherwise items from an earlier event stay in the dataLayer and are attached to later events.
- The template does not call the pixel's consent command. Control consent with your consent settings and triggers so the tag only fires once measurement consent is granted.
