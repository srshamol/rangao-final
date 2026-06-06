const url = "https://yglexjxvypwmvjvsspil.supabase.co/rest/v1/products?select=*&status=eq.active&stock_quantity=gt.0&order=review_count.desc&limit=4";
const apikey = "sb_publishable_wiK1UV-Hm9bP3qeC1Uns2g_qWZ4fY7-";

async function run() {
  try {
    const res = await fetch(url, {
      headers: {
        "apikey": apikey,
        "Authorization": `Bearer ${apikey}`
      }
    });
    console.log("Status Code:", res.status);
    console.log("Status Text:", res.statusText);
    const body = await res.text();
    console.log("Body:", body);
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
