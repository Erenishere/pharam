import { Component, OnInit, signal, computed, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap, finalize, startWith, filter, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { PosService, Customer, Item } from '../../../../core/services/pos.service';
import { SalesmanService, Salesman } from '../../../../core/services/salesman.service';
import { ToastService } from '../../../../shared/services/toast.service';

interface CartItem extends Item {
    quantity: number;
    discount: number;
    taxAmount: number;
    lineTotal: number;
    selectedBatch?: string;     // Batch Number
    selectedExpiry?: string;    // Expiry Date
}

@Component({
    selector: 'app-pos',
    standalone: true,
    imports: [
        CommonModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatAutocompleteModule,
        MatSelectModule,
        MatTableModule,
        MatDividerModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        FormsModule,
        ReactiveFormsModule
    ],
    templateUrl: './pos.component.html',
    styleUrl: './pos.component.scss'
})
export class PosComponent implements OnInit, AfterViewInit {
    @ViewChild('productInput') productInput!: ElementRef;

    customerControl = new FormControl();
    itemSearchControl = new FormControl();

    customers: Customer[] = [];
    searchItems: Item[] = [];
    selectedCustomer: Customer | null = null;
    currentSalesman: Salesman | null = null;

    // Customer type: 'walkin' or 'registered'
    customerType: 'walkin' | 'registered' = 'walkin';

    private readonly CART_STORAGE_KEY = 'pos_cart';
    private readonly CUSTOMER_STORAGE_KEY = 'pos_customer';

    cart = signal<CartItem[]>([]);

    totals = computed(() => {
        const items = this.cart();
        return this.posService.calculateTotals(items.map(i => ({
            quantity: i.quantity,
            unitPrice: i.salePrice,
            discount: i.discount,
            gstRate: i.tax?.gstRate // Pass item-specific GST rate
        })));
    });

    isSearchingCustomers = false;
    isSearchingItems = false;
    isSubmitting = false;

    constructor(
        private posService: PosService,
        private salesmanService: SalesmanService,
        private toastService: ToastService
    ) { }

    ngOnInit(): void {
        this.loadSalesmanProfile();
        this.setupSearch();
        this.restoreFromStorage(); // Restore cart & customer first
        // Set initial customer type and load Walk-In if needed
        if (!this.selectedCustomer) {
            this.customerType = 'walkin';
            this.loadDefaultCustomer();
        } else {
            // Determine type based on restored customer
            this.customerType = this.selectedCustomer.code === 'CUST-WALKIN' ? 'walkin' : 'registered';
        }
    }

    // Persist cart to localStorage whenever it changes
    private saveCartToStorage(): void {
        try {
            localStorage.setItem(this.CART_STORAGE_KEY, JSON.stringify(this.cart()));
        } catch (e) {
            console.warn('Failed to save cart to localStorage', e);
        }
    }

    private saveCustomerToStorage(): void {
        try {
            if (this.selectedCustomer) {
                localStorage.setItem(this.CUSTOMER_STORAGE_KEY, JSON.stringify(this.selectedCustomer));
            } else {
                localStorage.removeItem(this.CUSTOMER_STORAGE_KEY);
            }
        } catch (e) {
            console.warn('Failed to save customer to localStorage', e);
        }
    }

    private restoreFromStorage(): void {
        try {
            // Restore cart
            const savedCart = localStorage.getItem(this.CART_STORAGE_KEY);
            if (savedCart) {
                const parsedCart = JSON.parse(savedCart) as CartItem[];
                if (Array.isArray(parsedCart) && parsedCart.length > 0) {
                    this.cart.set(parsedCart);
                }
            }

            // Restore customer
            const savedCustomer = localStorage.getItem(this.CUSTOMER_STORAGE_KEY);
            if (savedCustomer) {
                const parsedCustomer = JSON.parse(savedCustomer) as Customer;
                if (parsedCustomer && parsedCustomer._id) {
                    this.selectedCustomer = parsedCustomer;
                    this.customerControl.setValue(parsedCustomer.name);
                }
            }
        } catch (e) {
            console.warn('Failed to restore from localStorage', e);
        }
    }

    loadDefaultCustomer(): void {
        // Only load default if no customer already selected (from localStorage)
        if (this.selectedCustomer) {
            return;
        }
        // Auto-select Walk-In Customer for quick POS transactions
        this.posService.getCustomerByCode('CUST-WALKIN').subscribe({
            next: (res) => {
                if (res.success && res.data) {
                    this.selectedCustomer = res.data;
                    this.customerControl.setValue(res.data.name);
                    this.saveCustomerToStorage();
                }
            },
            error: () => {
                // Walk-in customer not found; user must select manually
                console.warn('Walk-In Customer not found in database');
            }
        });
    }

    ngAfterViewInit(): void {
        // Focus product input on load (optional, or maybe customer input)
        // setTimeout(() => this.productInput.nativeElement.focus(), 500);
    }

    loadSalesmanProfile(): void {
        this.salesmanService.getMyProfile().subscribe({
            next: (res) => {
                if (res.success) {
                    this.currentSalesman = res.data;
                }
            },
            error: (err) => {
                console.error('Error loading profile', err);
                this.toastService.error('Failed to load salesman profile. ensure you are a registered salesman.');
            }
        });
    }

    setupSearch(): void {
        // Customer Search - triggers after 3 characters, fast debounce
        this.customerControl.valueChanges.pipe(
            filter((value): value is string => typeof value === 'string' && value.length >= 3),
            debounceTime(150), // Fast response
            distinctUntilChanged(),
            switchMap((value: string) => {
                this.isSearchingCustomers = true;
                // Remove routeId filter to allow global search for now
                return this.posService.searchCustomers(value, 10).pipe(
                    finalize(() => this.isSearchingCustomers = false),
                    catchError(() => {
                        this.isSearchingCustomers = false;
                        return of({ success: false, data: [] as Customer[] });
                    })
                );
            })
        ).subscribe(response => {
            this.customers = response.data || [];
        });

        // Item Search
        this.itemSearchControl.valueChanges.pipe(
            // Remove minimum length check to allow "Browse" behavior on click/empty
            debounceTime(300),
            distinctUntilChanged(),
            switchMap(value => {
                // If value is null, treat as empty string
                const query = typeof value === 'string' ? value : '';
                this.isSearchingItems = true;
                return this.posService.searchItems(query).pipe(
                    finalize(() => this.isSearchingItems = false)
                );
            })
        ).subscribe(response => {
            this.searchItems = response.data;
        });
    }

    displayCustomer(customer: Customer): string {
        return customer ? customer.name : '';
    }

    onCustomerSelected(customer: Customer): void {
        this.selectedCustomer = customer;
        this.saveCustomerToStorage();
        // Focus on product input after selecting customer
        setTimeout(() => this.productInput.nativeElement.focus(), 100);
    }

    selectWalkIn(): void {
        this.posService.getCustomerByCode('CUST-WALKIN').subscribe({
            next: (res) => {
                if (res.success && res.data) {
                    this.onCustomerSelected(res.data);
                    this.customerControl.setValue(res.data.name);
                }
            }
        });
    }

    onCustomerInputFocus(): void {
        // If empty, trigger search to show Walk-In option
        if (!this.customerControl.value) {
            this.customerControl.setValue('');
        }
    }

    clearCustomer(): void {
        this.selectedCustomer = null;
        this.customerControl.setValue('');
        this.saveCustomerToStorage();
        // Focus back on customer input
        // (optional: we might want to keep focus on button or move to input)
    }

    onCustomerTypeChange(type: 'walkin' | 'registered'): void {
        this.customerType = type;
        this.clearCustomer();

        if (type === 'walkin') {
            // Auto-select Walk-In customer
            this.selectWalkIn();
        }
        // For 'registered', user will search and select
    }

    addToCart(item: Item): void {
        const currentCart = this.cart();
        const existingIndex = currentCart.findIndex(i => i._id === item._id);

        if (existingIndex > -1) {
            const updatedCart = [...currentCart];
            updatedCart[existingIndex] = {
                ...updatedCart[existingIndex],
                quantity: updatedCart[existingIndex].quantity + 1
            };
            this.cart.set(updatedCart);
            this.saveCartToStorage();
        } else {
            // Auto-select Batch (FEFO - First Expired First Out)
            let selectedBatch = '';
            let selectedExpiry = '';

            if (item.inventory && item.inventory.batches && item.inventory.batches.length > 0) {
                // Sort by expiry date ascending
                const sortedBatches = [...item.inventory.batches].sort((a, b) =>
                    new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
                );
                // Pick the first one (nearest expiry) that has stock > 0
                const bestBatch = sortedBatches.find(b => b.stock > 0) || sortedBatches[0];

                selectedBatch = bestBatch.batchNumber;
                selectedExpiry = bestBatch.expiryDate;
            }

            // Determine correct sale price (handle nested pricing object from backend)
            const actualSalePrice = item.pricing?.salePrice || item.salePrice || 0;

            this.cart.set([...currentCart, {
                ...item,
                salePrice: actualSalePrice, // Normalize price for cart
                quantity: 1,
                discount: 0,
                taxAmount: 0,
                lineTotal: actualSalePrice,
                selectedBatch,
                selectedExpiry
            }]);
            this.saveCartToStorage();
        }

        this.itemSearchControl.setValue('');
        this.searchItems = [];
        this.toastService.success(`${item.name} added`);

        // Keep focus on input for rapid entry
        setTimeout(() => this.productInput.nativeElement.focus(), 100);
    }

    updateQuantity(itemId: string, delta: number): void {
        const updatedCart = this.cart().map(item => {
            if (item._id === itemId) {
                const newQuantity = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQuantity };
            }
            return item;
        });
        this.cart.set(updatedCart);
        this.saveCartToStorage();
    }

    updateManualQuantity(itemId: string, value: number): void {
        const updatedCart = this.cart().map(item => {
            if (item._id === itemId) {
                const newQuantity = Math.max(1, value || 1); // Prevent 0 or null
                return { ...item, quantity: newQuantity };
            }
            return item;
        });
        this.cart.set(updatedCart);
        this.saveCartToStorage();
    }

    updateDiscount(itemId: string, discount: number): void {
        if (discount < 0 || discount > 100) return;

        const currentCart = this.cart();
        const updatedCart = currentCart.map(item => {
            if (item._id === itemId) {
                return { ...item, discount: discount };
            }
            return item;
        });
        this.cart.set(updatedCart);
        this.saveCartToStorage();
    }

    removeFromCart(itemId: string): void {
        this.cart.set(this.cart().filter(item => item._id !== itemId));
        this.saveCartToStorage();
    }

    clearCart(): void {
        this.cart.set([]);
        this.selectedCustomer = null;
        this.customerControl.setValue('');
        // Clear localStorage
        localStorage.removeItem(this.CART_STORAGE_KEY);
        localStorage.removeItem(this.CUSTOMER_STORAGE_KEY);
    }

    submitInvoice(): void {
        if (!this.selectedCustomer) {
            this.toastService.error('Please select a customer');
            return;
        }

        if (this.cart().length === 0) {
            this.toastService.error('Cart is empty');
            return;
        }

        this.isSubmitting = true;
        const invoiceData = {
            type: 'sales' as const,
            customerId: this.selectedCustomer._id,
            invoiceDate: new Date().toISOString(),
            dueDate: new Date().toISOString(), // Immediate payment
            items: this.cart().map(item => {
                const itemSubtotal = item.salePrice * item.quantity;
                const discountAmount = (itemSubtotal * item.discount) / 100;
                const taxableAmount = itemSubtotal - discountAmount;
                const gstRate = item.tax?.gstRate ?? 18; // Default to 18% to match UI

                return {
                    itemId: item._id,
                    quantity: item.quantity,
                    unitPrice: item.salePrice,
                    discount: item.discount,
                    taxAmount: (taxableAmount * gstRate) / 100,
                    lineTotal: itemSubtotal, // Line total usually implies amount before tax/discount or final? Service uses base.
                    // Actually, backend usually expects: unitPrice, qty, discount, tax. 
                    // Let's stick to the interface.
                    batchInfo: {
                        batchNumber: item.selectedBatch || '',
                        expiryDate: item.selectedExpiry || ''
                    }
                };
            }),
            totals: {
                subtotal: this.totals().subtotal,
                totalDiscount: this.totals().totalDiscount,
                totalTax: this.totals().totalTax,
                grandTotal: this.totals().grandTotal
            },
            status: 'confirmed' as const,
            paymentStatus: 'pending' as const
        };

        this.posService.createInvoice(invoiceData).subscribe({
            next: (response) => {
                if (response.success) {
                    this.toastService.success('Invoice created successfully');

                    // Show receipt (do not auto-print)
                    this.showReceipt = true;
                    this.hasProcessedInvoice = true;

                    // Note: We do NOT clear the cart here anymore. 
                    // The cart will be cleared when the user closes the receipt modal.
                }
                this.isSubmitting = false;
            },
            error: (error) => {
                console.error('Error creating invoice:', error);
                this.toastService.error('Failed to create invoice');
                this.isSubmitting = false;
            }
        });
    }

    formatCurrency(amount: number): string {
        if (amount === null || amount === undefined || isNaN(amount)) {
            amount = 0;
        }
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            maximumFractionDigits: 0
        }).format(amount);
    }

    onProductInputEnter(): void {
        const query = this.itemSearchControl.value;
        if (!query || typeof query !== 'string') return;

        // 1. Try to find in current search results
        if (this.searchItems.length > 0) {
            this.addToCart(this.searchItems[0]);
            return;
        }

        // 2. If no results, try to fetch by barcode directly (fast path)
        this.isSearchingItems = true;
        this.posService.getItemByBarcode(query).subscribe({
            next: (res) => {
                if (res.success && res.data.item) {
                    this.addToCart(res.data.item);
                } else {
                    // 3. Fallback: Search by name strictly
                    this.performStrictSearch(query);
                }
                this.isSearchingItems = false;
            },
            error: () => {
                this.performStrictSearch(query);
            }
        });
    }

    private performStrictSearch(query: string): void {
        this.posService.searchItems(query, 1).subscribe({
            next: (res) => {
                if (res.success && res.data.length > 0) {
                    this.addToCart(res.data[0]);
                } else {
                    this.toastService.error('Product not found');
                }
                this.isSearchingItems = false;
            },
            error: () => {
                this.toastService.error('Error searching product');
                this.isSearchingItems = false;
            }
        });
    }

    showReceipt = false;
    hasProcessedInvoice = false;
    today = new Date();

    toggleReceipt(): void {
        this.showReceipt = !this.showReceipt;
        this.today = new Date(); // Refresh date
    }

    onReceiptClose(): void {
        this.showReceipt = false;
        if (this.hasProcessedInvoice) {
            this.clearCart();
            this.hasProcessedInvoice = false;
        }
    }

    printReceipt(): void {
        const receiptContent = document.querySelector('.receipt-paper')?.innerHTML;
        if (!receiptContent) return;

        const popupWin = window.open('', '_blank', 'width=400,height=600');
        if (popupWin) {
            popupWin.document.open();
            popupWin.document.write(`
                <html>
                <head>
                    <title>Print Receipt</title>
                    <style>
                        @page { size: auto; margin: 0; }
                        body { margin: 0; padding: 10px; font-family: 'Courier New', monospace; font-size: 12px; }
                        .receipt-header { text-align: center; margin-bottom: 20px; }
                        .receipt-header h3 { margin: 0; font-size: 18px; font-weight: bold; }
                        .receipt-header p { margin: 2px 0; }
                        .receipt-meta { margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
                        .receipt-divider { display: none; } 
                        .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
                        .receipt-items { margin-bottom: 15px; }
                        .item-header { display: flex; font-weight: bold; border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 5px; }
                        .col-name { flex: 2; }
                        .col-qty { flex: 1; text-align: center; }
                        .col-price { flex: 1; text-align: right; }
                        .item-row { margin-bottom: 8px; }
                        .item-line-1 { font-weight: bold; margin-bottom: 2px; }
                        .item-line-2 { display: flex; justify-content: space-between; }
                        .receipt-totals { border-top: 1px dashed #000; padding-top: 10px; }
                        .grand-total { font-weight: bold; font-size: 16px; margin-top: 10px; }
                        .receipt-footer { text-align: center; margin-top: 30px; font-size: 10px; border-top: 1px dashed #000; padding-top: 10px; }
                        .receipt-actions { display: none; }
                    </style>
                </head>
                <body>
                    ${receiptContent}
                    <script>
                        setTimeout(() => {
                            window.print();
                            window.close();
                        }, 500);
                    </script>
                </body>
                </html>
            `);
            popupWin.document.close();
        }
    }

    isExpired(dateStr?: string): boolean {
        if (!dateStr) return false;
        return new Date(dateStr) < new Date();
    }
}
