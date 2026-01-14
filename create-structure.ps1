# Angular 18 Pharma Management System - Professional Folder Structure

$basePath = "d:\pharma-management-system\frontend\src\app"

# Core Module
New-Item -ItemType Directory -Path "$basePath\core\guards" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\core\interceptors" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\core\services" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\core\models" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\core\constants" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\core\enums" -Force | Out-Null

# Shared Module
New-Item -ItemType Directory -Path "$basePath\shared\components" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\shared\directives" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\shared\pipes" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\shared\validators" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\shared\utils" -Force | Out-Null

# Layout Module
New-Item -ItemType Directory -Path "$basePath\layout\header" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\layout\sidebar" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\layout\footer" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\layout\breadcrumb" -Force | Out-Null

# Features Module - Auth
New-Item -ItemType Directory -Path "$basePath\features\auth\components\login" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\features\auth\components\profile" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\features\auth\services" -Force | Out-Null

# Features Module - Dashboard
New-Item -ItemType Directory -Path "$basePath\features\dashboard\components" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\features\dashboard\services" -Force | Out-Null

# Features Module - Users
New-Item -ItemType Directory -Path "$basePath\features\users\components\user-list" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\features\users\components\user-form" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\features\users\components\user-detail" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\features\users\services" -Force | Out-Null

# Features Module - Customers
New-Item -ItemType Directory -Path "$basePath\features\customers\components\customer-list" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\features\customers\components\customer-form" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\features\customers\components\customer-detail" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\features\customers\services" -Force | Out-Null

# Features Module - Suppliers
New-Item -ItemType Directory -Path "$basePath\features\suppliers\components\supplier-list" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\features\suppliers\components\supplier-form" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\features\suppliers\components\supplier-detail" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\features\suppliers\services" -Force | Out-Null

# Features Module - Items
New-Item -ItemType Directory -Path "$basePath\features\items\components\item-list" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\features\items\components\item-form" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\features\items\components\item-detail" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\features\items\components\low-stock" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\features\items\services" -Force | Out-Null

# Features Module - Batches
New-Item -ItemType Directory -Path "$basePath\features\batches\components\batch-list" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\features\batches\components\batch-form" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\features\batches\components\batch-detail" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\features\batches\components\expiring-batches" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\features\batches\services" -Force | Out-Null

# Features Module - Sales Invoices
New-Item -ItemType Directory -Path "$basePath\features\sales-invoices\components\invoice-list" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\features\sales-invoices\components\invoice-form" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\features\sales-invoices\components\invoice-detail" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\features\sales-invoices\components\invoice-confirm" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\features\sales-invoices\services" -Force | Out-Null

# Features Module - Purchase Invoices
New-Item -ItemType Directory -Path "$basePath\features\purchase-invoices\components\invoice-list" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\features\purchase-invoices\components\invoice-form" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\features\purchase-invoices\components\invoice-detail" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\features\purchase-invoices\components\invoice-confirm" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\features\purchase-invoices\services" -Force | Out-Null

# Features Module - Reports
New-Item -ItemType Directory -Path "$basePath\features\reports\components\sales-report" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\features\reports\components\purchase-report" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\features\reports\components\inventory-report" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\features\reports\components\financial-report" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\features\reports\services" -Force | Out-Null

# Assets
New-Item -ItemType Directory -Path "d:\pharma-management-system\frontend\src\assets\images" -Force | Out-Null
New-Item -ItemType Directory -Path "d:\pharma-management-system\frontend\src\assets\icons" -Force | Out-Null
New-Item -ItemType Directory -Path "d:\pharma-management-system\frontend\src\assets\fonts" -Force | Out-Null
New-Item -ItemType Directory -Path "d:\pharma-management-system\frontend\src\assets\styles" -Force | Out-Null

# Environments
New-Item -ItemType Directory -Path "d:\pharma-management-system\frontend\src\environments" -Force | Out-Null

Write-Host "✅ Angular 18 Pharma Management System folder structure created successfully!" -ForegroundColor Green
