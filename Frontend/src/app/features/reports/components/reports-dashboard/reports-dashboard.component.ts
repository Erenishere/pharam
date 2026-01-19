import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

interface ReportCategory {
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
  reports: string[];
}

@Component({
  selector: 'app-reports-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatIconModule, MatButtonModule],
  templateUrl: './reports-dashboard.component.html',
  styleUrl: './reports-dashboard.component.scss'
})
export class ReportsDashboardComponent {
  reportCategories: ReportCategory[] = [
    {
      title: 'Sales Reports',
      description: 'Analyze sales performance, trends, and customer insights',
      icon: 'trending_up',
      route: '/reports/sales',
      color: 'purple',
      reports: ['Sales Summary', 'Sales by Customer', 'Sales by Item', 'Sales by Salesman', 'Sales Trends', 'Top Customers']
    },
    {
      title: 'Purchase Reports',
      description: 'Track purchases, supplier analysis, and GST breakdown',
      icon: 'shopping_cart',
      route: '/reports/purchase',
      color: 'info',
      reports: ['Purchase Summary', 'Purchase by Supplier', 'Purchase by Item', 'GST Breakdown (4%/18%)', 'Supplier-wise GST']
    },
    {
      title: 'Inventory Reports',
      description: 'Monitor stock levels, valuations, and batch tracking',
      icon: 'inventory_2',
      route: '/reports/inventory',
      color: 'success',
      reports: ['Current Stock', 'Low Stock Alert', 'Stock by Category', 'Stock by Warehouse', 'Inventory Valuation', 'Expiring Batches']
    },
    {
      title: 'Financial Reports',
      description: 'Profit & Loss, Balance Sheet, and Cash Flow statements',
      icon: 'account_balance',
      route: '/reports/financial',
      color: 'warning',
      reports: ['Profit & Loss', 'Balance Sheet', 'Cash Flow Statement', 'Financial Summary']
    },
    {
      title: 'Tax Reports',
      description: 'GST compliance, advance tax, and tax liability reports',
      icon: 'receipt_long',
      route: '/reports/tax',
      color: 'danger',
      reports: ['GST Summary (18%/4%)', 'Advance Tax (0.5%/2.5%)', 'Non-Filer GST', 'Tax Compliance (SRB/FBR)']
    },
    {
      title: 'Accounts Reports',
      description: 'Receivables aging, payables, and collection tracking',
      icon: 'account_balance_wallet',
      route: '/reports/accounts',
      color: 'purple',
      reports: ['Receivables Aging', 'Accounts Payable', 'Customer Ledger', 'Pending Cheques', 'Collection Efficiency']
    },
    {
      title: 'Salesman Reports',
      description: 'Performance tracking, commissions, and target analysis',
      icon: 'badge',
      route: '/reports/salesman',
      color: 'info',
      reports: ['Salesman Sales', 'Salesman Collections', 'Performance Report', 'Commission Report', 'Target Achievement']
    },
    {
      title: 'Scheme & Discount Reports',
      description: 'Analyze schemes, discounts, and trade offers',
      icon: 'local_offer',
      route: '/reports/schemes',
      color: 'success',
      reports: ['Scheme Analysis', 'Scheme Comparison', 'Discount Breakdown (D1/D2)', 'Trade Offer Analysis']
    },
    {
      title: 'Warehouse Reports',
      description: 'Stock by warehouse, movements, and transfers',
      icon: 'warehouse',
      route: '/reports/warehouse',
      color: 'warning',
      reports: ['Warehouse Stock', 'Stock Comparison', 'Stock Movements', 'Transfer History']
    }
  ];
}
