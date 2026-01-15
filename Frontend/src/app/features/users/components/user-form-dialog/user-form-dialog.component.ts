import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UserService } from '../../services/user.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { User, UserRole, UserCreateRequest, UserUpdateRequest } from '../../../../core/models/user.model';

@Component({
    selector: 'app-user-form-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatIconModule,
        MatSlideToggleModule,
        MatProgressSpinnerModule
    ],
    templateUrl: './user-form-dialog.component.html',
    styleUrls: ['./user-form-dialog.component.scss']
})
export class UserFormDialogComponent implements OnInit {
    userForm: FormGroup;
    isEditMode = false;
    saving = false;
    hidePassword = true;

    roles = [
        { value: UserRole.ADMIN, label: 'Admin', icon: 'admin_panel_settings' },
        { value: UserRole.SALES, label: 'Sales', icon: 'point_of_sale' },
        { value: UserRole.PURCHASE, label: 'Purchase', icon: 'shopping_cart' },
        { value: UserRole.INVENTORY, label: 'Inventory', icon: 'inventory' },
        { value: UserRole.ACCOUNTANT, label: 'Accountant', icon: 'account_balance' },
        { value: UserRole.DATA_ENTRY, label: 'Data Entry', icon: 'keyboard' }
    ];

    constructor(
        private fb: FormBuilder,
        private userService: UserService,
        private toastService: ToastService,
        private dialogRef: MatDialogRef<UserFormDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { user?: User }
    ) {
        this.isEditMode = !!data?.user;
        this.userForm = this.createForm();
    }

    ngOnInit(): void {
        if (this.isEditMode && this.data.user) {
            this.populateForm(this.data.user);
        }
    }

    createForm(): FormGroup {
        const formConfig: any = {
            username: ['Johndoe_01', [Validators.required, Validators.minLength(3)]],
            email: ['', [Validators.required, Validators.email]],
            role: ['', Validators.required],
            isActive: [true]
        };

        if (!this.isEditMode) {
            formConfig.password = ['', [Validators.required, Validators.minLength(6)]];
        }

        return this.fb.group(formConfig);
    }

    populateForm(user: User): void {
        this.userForm.patchValue({
            username: user.username,
            email: user.email,
            role: user.role,
            isActive: user.isActive
        });
    }

    onSubmit(): void {
        if (this.userForm.invalid) {
            this.toastService.warning('Please fill in all required fields correctly');
            return;
        }

        this.saving = true;

        if (this.isEditMode) {
            this.updateUser();
        } else {
            this.createUser();
        }
    }

    createUser(): void {
        const userData: UserCreateRequest = this.userForm.value;

        this.userService.createUser(userData).subscribe({
            next: (response) => {
                if (response.success) {
                    this.toastService.success('User created successfully!');
                    this.dialogRef.close(response.data);
                }
            },
            error: (error) => {
                this.toastService.error(error.error?.error?.message || 'Failed to create user');
                this.saving = false;
            }
        });
    }

    updateUser(): void {
        const updateData: UserUpdateRequest = {
            username: this.userForm.value.username,
            email: this.userForm.value.email,
            role: this.userForm.value.role,
            isActive: this.userForm.value.isActive
        };

        this.userService.updateUser(this.data.user!._id, updateData).subscribe({
            next: (response) => {
                if (response.success) {
                    this.toastService.success('User updated successfully!');
                    this.dialogRef.close(response.data);
                }
            },
            error: (error) => {
                this.toastService.error(error.error?.error?.message || 'Failed to update user');
                this.saving = false;
            }
        });
    }
}
