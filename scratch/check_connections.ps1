$sbUrl = "https://yglexjxvypwmvjvsspil.supabase.co"
$sbKey = "sb_publishable_wiK1UV-Hm9bP3qeC1Uns2g_qWZ4fY7-"

Write-Output "========================================"
Write-Output "       RANGAO CONNECTION CHECK"
Write-Output "========================================"
Write-Output ""

# 1. Supabase Auth Health
Write-Output "[1/4] Checking Supabase Auth Service..."
try {
    $authResp = Invoke-WebRequest -Uri "$sbUrl/auth/v1/health" -Headers @{ "apikey" = $sbKey } -TimeoutSec 10 -UseBasicParsing
    Write-Output "  Status: OK (HTTP $($authResp.StatusCode))"
} catch {
    Write-Output "  Status: Failed ($($_.Exception.Message))"
}

# 2. Supabase REST API (Database access)
Write-Output ""
Write-Output "[2/4] Checking Supabase Database Tables (Categories/Products)..."
try {
    $headers = @{
        "apikey" = $sbKey
        "Authorization" = "Bearer $sbKey"
    }
    $catResp = Invoke-RestMethod -Uri "$sbUrl/rest/v1/categories?select=id,name,slug&limit=5" -Headers $headers -TimeoutSec 10
    Write-Output "  Categories Query: SUCCESS (Found $($catResp.Count) categories)"
    foreach ($cat in $catResp) {
        Write-Output "   - $($cat.name) ($($cat.slug))"
    }
} catch {
    Write-Output "  Database Query Failed: $($_.Exception.Message)"
}

# 3. Supabase Products Table
Write-Output ""
Write-Output "[3/4] Checking Products Table..."
try {
    $prodResp = Invoke-RestMethod -Uri "$sbUrl/rest/v1/products?select=id,name,regular_price,sale_price&limit=3" -Headers $headers -TimeoutSec 10
    Write-Output "  Products Query: SUCCESS (Found $($prodResp.Count) products)"
    foreach ($p in $prodResp) {
        Write-Output "   - $($p.name) (Regular: $($p.regular_price), Sale: $($p.sale_price))"
    }
} catch {
    Write-Output "  Products Query Failed: $($_.Exception.Message)"
}

# 4. Supabase Storage Buckets
Write-Output ""
Write-Output "[4/4] Checking Storage Service..."
try {
    $storageResp = Invoke-RestMethod -Uri "$sbUrl/storage/v1/bucket" -Headers $headers -TimeoutSec 10
    Write-Output "  Storage Query: SUCCESS (Found $($storageResp.Count) buckets)"
    foreach ($b in $storageResp) {
        Write-Output "   - Bucket: $($b.name) (Public: $($b.public))"
    }
} catch {
    Write-Output "  Storage Query: $($_.Exception.Message)"
}

Write-Output ""
Write-Output "========================================"
Write-Output "           CHECK COMPLETE"
Write-Output "========================================"
