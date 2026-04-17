import type { LoaderFunctionArgs } from "@remix-run/node";

export const loader = async (_: LoaderFunctionArgs) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Privacy Policy — WW Store Locator</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 60px auto; padding: 0 24px; color: #1a1a1a; line-height: 1.7; }
    h1 { font-size: 2rem; margin-bottom: 4px; }
    .subtitle { color: #666; margin-bottom: 40px; font-size: 0.95rem; }
    h2 { font-size: 1.2rem; margin-top: 36px; }
    a { color: #0066cc; }
  </style>
</head>
<body>
  <h1>Privacy Policy</h1>
  <p class="subtitle">WW Store Locator — Win-Win Apps &nbsp;|&nbsp; Last updated: April 17, 2026</p>

  <p>Win-Win Apps ("we", "our", or "us") operates the WW Store Locator Shopify application. This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our app.</p>

  <h2>1. Information We Collect</h2>
  <p>When you install WW Store Locator, we collect and store the following data to operate the app:</p>
  <ul>
    <li><strong>Shopify store URL</strong> — to identify your store and associate your locator configuration</li>
    <li><strong>Shopify access token</strong> — to sync location data to your store's metafields</li>
    <li><strong>Store locations</strong> — the physical locations you enter (name, address, phone, email, hours, service tags, coordinates)</li>
    <li><strong>App settings</strong> — map style, brand colors, feature toggles, and your Google Maps API key</li>
  </ul>
  <p>We do not collect or store any personal information about your customers (shoppers). The store locator widget runs entirely in the customer's browser using your own Google Maps API key.</p>

  <h2>2. How We Use Your Information</h2>
  <ul>
    <li>To display your store locations on the storefront map via Shopify metafields and theme app extensions</li>
    <li>To geocode addresses when you add or edit locations (using Google Geocoding API with your own API key)</li>
    <li>To store your locator settings so they persist between sessions</li>
    <li>To authenticate API requests to Shopify on your behalf</li>
  </ul>
  <p>We do not sell, trade, or otherwise transfer your information to outside parties.</p>

  <h2>3. Data Storage</h2>
  <p>Location data and session information are stored in a secure database hosted on our production servers. Access tokens are encrypted at rest. We retain your data for the duration of your app installation.</p>

  <h2>4. Third-Party Services</h2>
  <p>WW Store Locator uses the following third-party services:</p>
  <ul>
    <li><strong>Shopify API</strong> — to set metafields and manage theme extensions on your store. Shopify's privacy policy is available at <a href="https://www.shopify.com/legal/privacy" target="_blank">shopify.com/legal/privacy</a>.</li>
    <li><strong>Google Maps API</strong> — the storefront widget loads Google Maps using your own API key. Google's Maps terms apply. Server-side geocoding also uses your key. See <a href="https://policies.google.com/privacy" target="_blank">Google Privacy Policy</a>.</li>
    <li><strong>Fly.io</strong> — our application hosting provider. Data is processed in accordance with Fly.io's data processing terms.</li>
  </ul>

  <h2>5. Data Deletion</h2>
  <p>When you uninstall WW Store Locator, we receive a mandatory app/uninstalled webhook from Shopify. Upon receiving this webhook, we permanently delete all data associated with your store, including locations, settings, and access tokens.</p>
  <p>To request manual data deletion, contact us at <a href="mailto:omar@wwapps.io">omar@wwapps.io</a>.</p>

  <h2>6. Security</h2>
  <p>We implement industry-standard security measures including encrypted data storage, HTTPS-only communication, and access controls.</p>

  <h2>7. Changes to This Policy</h2>
  <p>We may update this Privacy Policy from time to time. The "Last updated" date at the top reflects the most recent revision.</p>

  <h2>8. Contact</h2>
  <ul>
    <li>Email: <a href="mailto:omar@wwapps.io">omar@wwapps.io</a></li>
    <li>Company: Win-Win Apps</li>
  </ul>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
};
