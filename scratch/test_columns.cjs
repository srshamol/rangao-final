const https = require('https');

const columns = [
  'id', 'name', 'sku', 'category', 'brand', 'regular_price', 'sale_price',
  'cost_price', 'stock_quantity', 'low_stock_alert', 'description',
  'specifications', 'tags', 'status', 'images', 'featured', 'rating',
  'review_count', 'created_at', 'updated_at', 'short_description'
];

const baseUrl = 'https://yglexjxvypwmvjvsspil.supabase.co/rest/v1/products';
const options = {
  headers: {
    'apikey': 'sb_publishable_wiK1UV-Hm9bP3qeC1Uns2g_qWZ4fY7-',
    'Authorization': 'Bearer sb_publishable_wiK1UV-Hm9bP3qeC1Uns2g_qWZ4fY7-'
  }
};

async function testColumns() {
  for (const col of columns) {
    const url = `${baseUrl}?select=${col}&limit=1`;
    await new Promise((resolve) => {
      https.get(url, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log(`Column: ${col.padEnd(20)} | Status: ${res.statusCode} | Response: ${data.substring(0, 100)}`);
          resolve();
        });
      }).on('error', (err) => {
        console.log(`Column: ${col.padEnd(20)} | Error: ${err.message}`);
        resolve();
      });
    });
  }
}

testColumns();
