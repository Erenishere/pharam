import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, of, combineLatest } from 'rxjs';
import { takeUntil, startWith, map, debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';

import { BatchService } from '../../services/batch.service';
import { ItemService } from '../../../items/services/item.service';
import { LocationService } from '../../../../core/services/location.service';
import { SupplierService } from '../../../suppliers/services/supplier.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { LoadingService } from '../../../../shared/services/loading.service';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

import { Batch, CreateBatchRequest, UpdateBatchRequest, Item } from '../../models/batch.model';
import { LocationOption } from '../../../../core/models/location.model';
import { Supplier } from '../../../suppliers/models/supplier.model';

// Interface for item service response
interface ItemServiceResponse {
  success: boolean;
  data: Item[];
  message?: string;
}

@Component({
  selector: 'app-batch-form',
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
    MatCardModule,
    MatAutocompleteModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatDialogModule
  ],
  templateUrl: './batch-form.component.html',
  styleUrls: ['./batch-form.component.scss']
})
export class BatchFormComponent implements OnInit, OnDestroy {
  batchForm!: FormGroup;
  isEditMode = false;
  batchId: string | null = null;
  isLoading = false;
  hasUnsavedChanges = false;

  // Autocomplete options
  filteredItems$!: Observable<Item[]>;
  filteredSuppliers$!: Observable<Supplier[]>;
  locationOptions$!: Observable<LocationOption[]>;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private batchService: BatchService,
    private itemService: ItemService,
    private locationService: LocationService,
    private supplierService: SupplierService,
    private toastService: ToastService,
    private loadingService: LoadingService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.setupAutocomplete();
    this.loadFormData();

    // Check if we're in edit mode
    this.batchId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.batchId;

    if (this.isEditMode && this.batchId) {
      this.loadBatchForEdit(this.batchId);
    }

    // Track form changes for unsaved changes warning
    this.batchForm.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.hasUnsavedChanges = this.batchForm.dirty;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.batchForm = this.fb.group({
      itemId: ['', [Validators.required]],
      itemSearch: ['', [Validators.required]], // For autocomplete display
      batchNumber: ['', [Validators.required]],
      quantity: [0, [Validators.required, Validators.min(1)]],
      unitCost: [0, [Validators.required, Validators.min(0)]],
      manufacturingDate: ['', [Validators.required]],
      expiryDate: ['', [Validators.required]],
      locationId: ['', [Validators.required]],
      supplierId: [''],
      supplierSearch: [''], // For autocomplete display
      notes: ['']
    }, {
      validators: [this.dateValidator, this.batchNumberValidator.bind(this)]
    });
  }

  private setupAutocomplete(): void {
    // Item autocomplete
    this.filteredItems$ = this.batchForm.get('itemSearch')!.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(value => {
        if (typeof value === 'string' && value.length >= 2) {
          return this.itemService.getItems({ search: value }).pipe(
            map((response: ItemServiceResponse) => response.success ? response.data : []),
            catchError(() => of([]))
          );
        }
        return of([]);
      }),
      takeUntil(this.destroy$)
    );

    // Supplier autocomplete
    this.filteredSuppliers$ = this.batchForm.get('supplierSearch')!.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(value => {
        if (typeof value === 'string' && value.length >= 2) {
          return this.supplierService.getSuppliers({ search: value, isActive: true }).pipe(
            map(response => response.success ? response.data : []),
            catchError(() => of([]))
          );
        }
        return of([]);
      }),
      takeUntil(this.destroy$)
    );
  }

  private loadFormData(): void {
    // Load location options
    this.locationOptions$ = this.locationService.getLocationOptions().pipe(
      catchError(() => {
        this.toastService.error('Failed to load locations');
        return of([]);
      })
    );
  }

  private loadBatchForEdit(id: string): void {
    this.isLoading = true;
    this.loadingService.setLoading(true);

    this.batchService.getBatchById(id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (batch) => {
        this.populateForm(batch);
        this.isLoading = false;
        this.loadingService.setLoading(false);
      },
      error: (error) => {
        this.toastService.error('Failed to load batch details');
        this.isLoading = false;
        this.loadingService.setLoading(false);
        this.router.navigate(['/batches/list']);
      }
    });
  }

  private populateForm(batch: Batch): void {
    this.batchForm.patchValue({
      itemId: batch.itemId,
      itemSearch: batch.item ? `${batch.item.code} - ${batch.item.name}` : '',
      batchNumber: batch.batchNumber,
      quantity: batch.quantity,
      unitCost: batch.unitCost,
      manufacturingDate: new Date(batch.manufacturingDate),
      expiryDate: new Date(batch.expiryDate),
      locationId: batch.locationId,
      supplierId: batch.supplierId || '',
      supplierSearch: batch.supplier ? `${batch.supplier.code} - ${batch.supplier.name}` : '',
      notes: batch.notes || ''
    });
  }

  // Custom validators
  private dateValidator(control: AbstractControl): ValidationErrors | null {
    const manufacturingDate = control.get('manufacturingDate')?.value;
    const expiryDate = control.get('expiryDate')?.value;

    if (manufacturingDate && expiryDate) {
      const mfgDate = new Date(manufacturingDate);
      const expDate = new Date(expiryDate);

      if (expDate <= mfgDate) {
        return { dateOrder: true };
      }
    }

    return null;
  }

  private batchNumberValidator(control: AbstractControl): Observable<ValidationErrors | null> {
    const batchNumber = control.get('batchNumber')?.value;
    const itemId = control.get('itemId')?.value;

    if (!batchNumber || !itemId || this.isEditMode) {
      return of(null);
    }

    // This would be implemented as async validation in a real scenario
    // For now, we'll return null and handle uniqueness on the server
    return of(null);
  }

  // Event handlers
  onItemSelected(item: Item): void {
    this.batchForm.patchValue({
      itemId: item._id,
      itemSearch: `${item.code} - ${item.name}`
    });

    // Auto-generate batch number when item is selected
    if (!this.isEditMode) {
      this.generateBatchNumber(item._id);
    }
  }

  onSupplierSelected(supplier: Supplier): void {
    this.batchForm.patchValue({
      supplierId: supplier._id,
      supplierSearch: `${supplier.code} - ${supplier.name}`
    });
  }

  displayItemFn(item: Item): string {
    return item ? `${item.code} - ${item.name}` : '';
  }

  displaySupplierFn(supplier: Supplier): string {
    return supplier ? `${supplier.code} - ${supplier.name}` : '';
  }

  private generateBatchNumber(itemId: string): void {
    this.batchService.getNextBatchNumber(itemId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this.batchForm.patchValue({ batchNumber: response.batchNumber });
      },
      error: () => {
        this.toastService.error('Failed to generate batch number');
      }
    });
  }

  onSubmit(): void {
    if (this.batchForm.valid) {
      this.isLoading = true;
      this.loadingService.setLoading(true);

      const formValue = this.batchForm.value;

      if (this.isEditMode && this.batchId) {
        this.updateBatch(this.batchId, formValue);
      } else {
        this.createBatch(formValue);
      }
    } else {
      this.markFormGroupTouched();
      this.toastService.error('Please fill in all required fields correctly');
    }
  }

  private createBatch(formValue: any): void {
    const createRequest: CreateBatchRequest = {
      itemId: formValue.itemId,
      batchNumber: formValue.batchNumber,
      quantity: formValue.quantity,
      unitCost: formValue.unitCost,
      manufacturingDate: formValue.manufacturingDate,
      expiryDate: formValue.expiryDate,
      locationId: formValue.locationId,
      supplierId: formValue.supplierId || undefined,
      notes: formValue.notes || undefined
    };

    this.batchService.createBatch(createRequest).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (batch) => {
        this.toastService.success(`Batch ${batch.batchNumber} created successfully`);
        this.isLoading = false;
        this.loadingService.setLoading(false);
        this.router.navigate(['/batches/list']);
      },
      error: (error) => {
        let errorMessage = 'Failed to create batch';
        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        this.toastService.error(errorMessage);
        this.isLoading = false;
        this.loadingService.setLoading(false);
      }
    });
  }

  private updateBatch(id: string, formValue: any): void {
    const updateRequest: UpdateBatchRequest = {
      itemId: formValue.itemId,
      unitCost: formValue.unitCost,
      manufacturingDate: formValue.manufacturingDate,
      expiryDate: formValue.expiryDate,
      locationId: formValue.locationId,
      supplierId: formValue.supplierId || undefined,
      notes: formValue.notes || undefined
    };

    this.batchService.updateBatch(id, updateRequest).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (batch) => {
        this.toastService.success(`Batch ${batch.batchNumber} updated successfully`);
        this.isLoading = false;
        this.loadingService.setLoading(false);
        this.router.navigate(['/batches/list']);
      },
      error: (error) => {
        let errorMessage = 'Failed to update batch';
        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        this.toastService.error(errorMessage);
        this.isLoading = false;
        this.loadingService.setLoading(false);
      }
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.batchForm.controls).forEach(key => {
      const control = this.batchForm.get(key);
      control?.markAsTouched();
    });
  }

  onCancel(): void {
    if (this.hasUnsavedChanges) {
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        width: '400px',
        data: {
          title: 'Unsaved Changes',
          message: 'You have unsaved changes. Are you sure you want to leave without saving?',
          confirmText: 'Leave',
          cancelText: 'Stay'
        }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.router.navigate(['/batches/list']);
        }
      });
    } else {
      this.router.navigate(['/batches/list']);
    }
  }

  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: any): void {
    if (this.hasUnsavedChanges) {
      $event.returnValue = true;
    }
  }

  // Getter methods for template
  get isFormValid(): boolean {
    return this.batchForm.valid;
  }

  get hasDateError(): boolean {
    return !!(this.batchForm.hasError('dateOrder') &&
      (this.batchForm.get('manufacturingDate')?.touched || this.batchForm.get('expiryDate')?.touched));
  }
}