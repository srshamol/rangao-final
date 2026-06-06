const https = require('https');

const url = 'https://yglexjxvypwmvjvsspil.supabase.co/rest/v1/products?select=*&status=eq.active&stock_quantity=gt.0&sale_price=not.is.null&order=created_at.desc&limit=8';

const options = {
  headers: {
    'apikey': 'sb_publishable_wiK1UV-Hm9bP3qeC1Uns2g_qWZ4fY7-',
    'Authorization': 'Bearer sb_publishable_wiK1UV-Hm9bP3qeC1Uns2g_qWZ4fY7-'
  }
};

https.get(url, options, (res) => {
  console.log('StatusCode:', res.statusCode);
  console.log('Headers:', res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Body:', data);
  });
}).on('error', (err) => {
  console.error('Error:', err);
});
