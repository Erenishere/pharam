/**
 * SMS Notification Component
 * 
 * This component handles sending SMS notifications for invoices.
 * It provides templates, customization options, and delivery tracking.
 */

import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chip';
import { Subject, takeUntil } from 'rxjs';

import { SalesInvoiceService } from '../../services/sales-invoice.service';
import { SalesInvoice, SMSNotificationRequest } from '../../models/sales-invoice.model';

export interface SMSDialogData {
    invoice: SalesInvoice;
}

export interface SMSTemplate {
    id: string;
    name: string;
    content: string;
    variables: string[];
}

@Component({
    selector: 'app-sms-notification',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatCheckboxModule,
        MatProgressSpinnerModule,
        MatSnackBarModule,
        MatTabsModule,
        MatCardModule,
        MatChipsModule
    ],
    templateUrl: './sms-notification.component.html',
    styleUrls: ['./sms-notification.component.scss']
})
export class SMSNotificationComponent implements OnInit, OnDestroy {
    smsForm: FormGroup;
    isLoading = false;
    characterCount = 0;
    maxCharacters = 160;
    estimatedParts = 1;

    // SMS Templates
    templates: SMSTemplate[] = [
        {
            id: 'invoice_created',
            name: 'Invoice Created',
            content: 'Dear {{customerName}}, your invoice {{invoiceNumber}} for {{amount}} has been generated. Due date: {{dueDate}}. Thank you for your business!',
            variables: ['customerName', 'invoiceNumber', 'amount', 'dueDate']
        },
        {
            id: 'invoice_confirmed',
            name: 'Invoice Confirmed',
            content: 'Dear {{customerName}}, your invoice {{invoiceNumber}} for {{amount}} has been confirmed. Please arrange payment by {{dueDate}}.',
            variables: ['customerName', 'invoiceNumber', 'amount', 'dueDate']
        },
        {
            id: 'payment_reminder',
            name: 'Payment Reminder',
            content: 'Dear {{customerName}}, this is a reminder that invoice {{invoiceNumber}} for {{amount}} is due on {{dueDate}}. Please arrange payment.',
            variables: ['customerName', 'invoiceNumber', 'amount', 'dueDate']
        },
        {
            id: 'payment_overdue',
            name: 'Payment Overdue',
            content: 'Dear {{customerName}}, invoice {{invoiceNumber}} for {{amount}} was due on {{dueDate}} and is now overdue. Please arrange immediate payment.',
            variables: ['customerName', 'invoiceNumber', 'amount', 'dueDate']
        },
        {
            id: 'payment_received',
            name: 'Payment Received',
            content: 'Dear {{customerName}}, we have received your payment for invoice {{invoiceNumber}}. Thank you for your prompt payment!',
            variables: ['customerName', 'invoiceNumber']
        },
        {
            id: 'custom',
            name: 'Custom Message',
            content: '',
            variables: ['customerName', 'invoiceNumber', 'amount', 'dueDate', 'companyName']
        }
    ];

    private destroy$ = new Subject<void>();

    constructor(
        private fb: FormBuilder,
        private salesInvoiceService: SalesInvoiceService,
        private snackBar: MatSnackBar,
        private dialogRef: MatDialogRef<SMSNotificationComponent>,
        @Inject(MAT_DIALOG_DATA) public data: SMSDialogData
    ) {
        this.smsForm = this.createForm();
    }

    ngOnInit(): void {
        this.setupFormSubscriptions();
        this.loadDefaultTemplate();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Create SMS form
     */
    private createForm(): FormGroup {
        return this.fb.group({
            templateId: ['invoice_created', Validators.required],
            phoneNumber: [this.data.invoice.customer?.phone || '', [Validators.required, Validators.pattern(/^\+?[\d\s-()]+$/)]],
            message: ['', [Validators.required, Validators.maxLength(1000)]],
            sendImmediately: [true],
            scheduleDateTime: [null],
            includeInvoiceLink: [false],
            saveAsTemplate: [false],
            templateName: ['']
        });
    }

    /**
     * Setup form subscriptions
     */
    private setupFormSubscriptions(): void {
        // Watch template changes
        this.smsForm.get('templateId')?.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(templateId => {
                this.loadTemplate(templateId);
            });

        // Watch message changes for character count
        this.smsForm.get('message')?.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(message => {
                this.updateCharacterCount(message || '');
            });

        // Watch send immediately changes
        this.smsForm.get('sendImmediately')?.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(immediate => {
                const scheduleControl = this.smsForm.get('scheduleDateTime');
                if (immediate) {
                    scheduleControl?.clearValidators();
                    scheduleControl?.setValue(null);
                } else {
                    scheduleControl?.setValidators([Validators.required]);
                }
                scheduleControl?.updateValueAndValidity();
            });

        // Watch save as template changes
        this.smsForm.get('saveAsTemplate')?.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(save => {
                const templateNameControl = this.smsForm.get('templateName');
                if (save) {
                    templateNameControl?.setValidators([Validators.required]);
                } else {
                    templateNameControl?.clearValidators();
                    templateNameControl?.setValue('');
                }
                templateNameControl?.updateValueAndValidity();
            });
    }

    /**
     * Load default template
     */
    private loadDefaultTemplate(): void {
        this.loadTemplate('invoice_created');
    }

    /**
     * Load template by ID
     */
    loadTemplate(templateId: string): void {
        const template = this.templates.find(t => t.id === templateId);
        if (template) {
            let message = template.content;

            // Replace variables with actual values
            if (template.id !== 'custom') {
                message = this.replaceVariables(message);
            }

            this.smsForm.patchValue({ message });
        }
    }

    /**
     * Replace template variables with actual values
     */
    private replaceVariables(template: string): string {
        const invoice = this.data.invoice;
        const variables: { [key: string]: string } = {
            customerName: invoice.customer?.name || 'Customer',
            invoiceNumber: invoice.invoiceNumber,
            amount: `PKR ${invoice.totals.grandTotal.toLocaleString()}`,
            dueDate: new Date(invoice.dueDate).toLocaleDateString('en-GB'),
            companyName: 'Indus Traders' // This could come from settings
        };

        let result = template;
        Object.keys(variables).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            result = result.replace(regex, variables[key]);
        });

        return result;
    }

    /**
     * Update character count and estimated parts
     */
    private updateCharacterCount(message: string): void {
        this.characterCount = message.length;
        this.estimatedParts = Math.ceil(this.characterCount / this.maxCharacters);
    }

    /**
     * Insert variable into message
     */
    insertVariable(variable: string): void {
        const messageControl = this.smsForm.get('message');
        const currentMessage = messageControl?.value || '';
        const newMessage = currentMessage + `{{${variable}}}`;
        messageControl?.setValue(newMessage);
    }

    /**
     * Preview message with replaced variables
     */
    getPreviewMessage(): string {
        const message = this.smsForm.get('message')?.value || '';
        return this.replaceVariables(message);
    }

    /**
     * Send SMS notification
     */
    sendSMS(): void {
        if (this.smsForm.invalid) {
            this.markFormGroupTouched();
            return;
        }

        this.isLoading = true;
        const formValue = this.smsForm.value;

        const request: SMSNotificationRequest = {
            invoiceId: this.data.invoice._id,
            message: this.replaceVariables(formValue.message),
            phoneNumber: formValue.phoneNumber
        };

        this.salesInvoiceService.sendSMSNotification(request)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.showSuccess('SMS notification sent successfully!');
                    this.dialogRef.close(true);
                    this.isLoading = false;
                },
                error: (error) => {
                    console.error('Error sending SMS:', error);
                    this.showError(error.userMessage || 'Failed to send SMS notification. Please try again.');
                    this.isLoading = false;
                }
            });
    }

    /**
     * Save custom template
     */
    saveTemplate(): void {
        const formValue = this.smsForm.value;
        if (formValue.saveAsTemplate && formValue.templateName && formValue.message) {
            // In a real application, this would save to a backend service
            const newTemplate: SMSTemplate = {
                id: `custom_${Date.now()}`,
                name: formValue.templateName,
                content: formValue.message,
                variables: this.extractVariables(formValue.message)
            };

            this.templates.push(newTemplate);
            this.showSuccess('Template saved successfully!');
        }
    }

    /**
     * Extract variables from template content
     */
    private extractVariables(content: string): string[] {
        const regex = /{{(\w+)}}/g;
        const variables: string[] = [];
        let match;

        while ((match = regex.exec(content)) !== null) {
            if (!variables.includes(match[1])) {
                variables.push(match[1]);
            }
        }

        return variables;
    }

    /**
     * Get available variables for current template
     */
    getAvailableVariables(): string[] {
        const templateId = this.smsForm.get('templateId')?.value;
        const template = this.templates.find(t => t.id === templateId);
        return template?.variables || [];
    }

    /**
     * Mark all form controls as touched
     */
    private markFormGroupTouched(): void {
        Object.keys(this.smsForm.controls).forEach(key => {
            const control = this.smsForm.get(key);
            control?.markAsTouched();
        });
    }

    /**
     * Close dialog
     */
    close(): void {
        this.dialogRef.close(false);
    }

    /**
     * Show success message
     */
    private showSuccess(message: string): void {
        this.snackBar.open(message, 'Close', {
            duration: 5000,
            panelClass: ['success-snackbar']
        });
    }

    /**
     * Show error message
     */
    private showError(message: string): void {
        this.snackBar.open(message, 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
        });
    }
}