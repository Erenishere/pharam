import { Component, OnInit, OnDestroy, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSliderModule } from '@angular/material/slider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, startWith, combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BatchFilter, BatchFilterForm, LocationOption, SupplierOption } from '../../models/batch-filter.model';
import { BatchStatus } from '../../models/batch.model';
import { ItemService } from '../../../items/services/item.service';
import { LocationService } from '../../../../core/services/location.service';
import { SupplierService } from '../../../suppliers/services/supplier.service';

@Component({
  selector: 'app-batch-filters',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatAutocompleteModule,
    MatSliderModule,
    MatCheckboxModule,
    MatCardModule,
    MatExpansionModule
  ],
  templateUrl: './batch-filters.component.html',
  styleUrls: ['./batch-filters-enhanced.component.scss']
})
export class BatchFiltersComponent implements OnInit, OnDestroy, OnChanges {
  @Input() initialFilters?: BatchFilter;
  @Output() filtersChanged = new EventEmitter<BatchFilter>();

  filterForm!: FormGroup;
  showAdvancedFilters = false;

  // Options for dropdowns
  locationOptions$!: Observable<LocationOption[]>;
  supplierOptions$!: Observable<SupplierOption[]>;
  filteredItems$!: Observable<any[]>;

  statusOptions = [
    { value: BatchStatus.ACTIVE, label: 'Active' },
    { value: BatchStatus.EXPIRED, label: 'Expired' },
    { value: BatchStatus.DEPLETED, label: 'Depleted' },
    { value: BatchStatus.QUARANTINED, label: 'Quarantined' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private itemService: ItemService,
    private locationService: LocationService,
    private supplierService: SupplierService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadFilterOptions();
    this.setupFormSubscriptions();
    this.applyInitialFilters();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialFilters'] && changes['initialFilters'].currentValue) {
      this.applyInitialFilters();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.filterForm = this.fb.group({
      itemSearch: [''],
      locations: [[]],
      suppliers: [[]],
      statuses: [[]],
      expiryStartDate: [null],
      expiryEndDate: [null],
      quantityMin: [null],
      quantityMax: [null],
      includeExpired: [false],
      includeDepleted: [false]
    });
  }

  private loadFilterOptions(): void {
    // Load location options
    this.locationOptions$ = this.locationService.getLocationOptions();

    // Load supplier options
    this.supplierOptions$ = this.supplierService.getSuppliersByType('supplier').pipe(
      map(response => response.success ? response.data.map(supplier => ({
        value: supplier._id,
        label: supplier.name,
        code: supplier.code
      })) : [])
    );

    // Setup item autocomplete
    this.filteredItems$ = this.filterForm.get('itemSearch')!.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      map(value => {
        const searchTerm = typeof value === 'string' ? value : (value?.name || '');
        return this.filterItems(searchTerm);
      })
    );
  }

  private setupFormSubscriptions(): void {
    // Auto-apply filters on form changes (debounced)
    this.filterForm.valueChanges.pipe(
      takeUntil(this.destroy$),
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(() => {
      this.applyFilters();
    });
  }

  private filterItems(searchTerm: string): any[] {
    if (!searchTerm || searchTerm.length < 2) {
      return [];
    }

    // This would normally call the item service to search items
    // For now, return empty array - will be implemented when item search API is available
    return [];
  }

  displayItemFn(item: any): string {
    return item ? item.name : '';
  }

  applyFilters(): void {
    const formValue = this.filterForm.value;

    const filters: BatchFilter = {
      itemSearch: formValue.itemSearch && typeof formValue.itemSearch === 'string'
        ? formValue.itemSearch
        : (formValue.itemSearch?.name || ''),
      locationIds: formValue.locations || [],
      supplierIds: formValue.suppliers || [],
      statuses: formValue.statuses || [],
      includeExpired: formValue.includeExpired || false,
      includeDepleted: formValue.includeDepleted || false
    };

    // Add date ranges if specified
    if (formValue.expiryStartDate || formValue.expiryEndDate) {
      filters.expiryDateRange = {
        start: formValue.expiryStartDate || undefined,
        end: formValue.expiryEndDate || undefined
      };
    }

    // Add quantity range if specified
    if (formValue.quantityMin !== null || formValue.quantityMax !== null) {
      filters.quantityRange = {
        min: formValue.quantityMin || undefined,
        max: formValue.quantityMax || undefined
      };
    }

    this.filtersChanged.emit(filters);
  }

  clearFilters(): void {
    this.filterForm.reset({
      itemSearch: '',
      locations: [],
      suppliers: [],
      statuses: [],
      expiryStartDate: null,
      expiryEndDate: null,
      quantityMin: null,
      quantityMax: null,
      includeExpired: false,
      includeDepleted: false
    });

    this.applyFilters();
  }

  private applyInitialFilters(): void {
    if (!this.initialFilters) {
      return;
    }

    const formValue: any = {
      itemSearch: this.initialFilters.itemSearch || '',
      locations: this.initialFilters.locationIds || [],
      suppliers: this.initialFilters.supplierIds || [],
      statuses: this.initialFilters.statuses || [],
      expiryStartDate: this.initialFilters.expiryDateRange?.start || null,
      expiryEndDate: this.initialFilters.expiryDateRange?.end || null,
      quantityMin: this.initialFilters.quantityRange?.min || null,
      quantityMax: this.initialFilters.quantityRange?.max || null,
      includeExpired: this.initialFilters.includeExpired || false,
      includeDepleted: this.initialFilters.includeDepleted || false
    };

    // Update form without triggering change events
    this.filterForm.patchValue(formValue, { emitEvent: false });

    // Show advanced filters if any advanced filters are set
    if (this.hasAdvancedFilters(this.initialFilters)) {
      this.showAdvancedFilters = true;
    }
  }

  private hasAdvancedFilters(filters: BatchFilter): boolean {
    return !!(
      (filters.locationIds && filters.locationIds.length > 0) ||
      (filters.supplierIds && filters.supplierIds.length > 0) ||
      (filters.statuses && filters.statuses.length > 0) ||
      filters.expiryDateRange?.start ||
      filters.expiryDateRange?.end ||
      filters.quantityRange?.min !== undefined ||
      filters.quantityRange?.max !== undefined ||
      filters.includeExpired ||
      filters.includeDepleted
    );
  }

  toggleAdvancedFilters(): void {
    this.showAdvancedFilters = !this.showAdvancedFilters;
  }
}