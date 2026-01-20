import { Injectable } from '@angular/core';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';

@Injectable({
    providedIn: 'root'
})
export class ChartService {

    constructor() {
        // Register Chart.js components
        Chart.register(...registerables);
    }

    /**
     * Create a donut chart for batch status distribution
     */
    createStatusDistributionChart(canvas: HTMLCanvasElement, data: any[]): Chart {
        const chartData = {
            labels: data.map(item => item.status),
            datasets: [{
                data: data.map(item => item.count),
                backgroundColor: [
                    '#4CAF50', // Active - Green
                    '#FF9800', // Expired - Orange
                    '#9E9E9E', // Depleted - Gray
                    '#F44336'  // Quarantined - Red
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        };

        const config: ChartConfiguration = {
            type: 'doughnut',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = data.reduce((sum, item) => sum + item.count, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        };

        return new Chart(canvas, config);
    }

    /**
     * Create a bar chart for batches by location
     */
    createLocationDistributionChart(canvas: HTMLCanvasElement, data: any[]): Chart {
        const chartData = {
            labels: data.map(item => item.locationName),
            datasets: [{
                label: 'Batch Count',
                data: data.map(item => item.batchCount),
                backgroundColor: '#3F51B5',
                borderColor: '#303F9F',
                borderWidth: 1
            }]
        };

        const config: ChartConfiguration = {
            type: 'bar',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            afterLabel: (context) => {
                                const item = data[context.dataIndex];
                                return [
                                    `Total Quantity: ${item.totalQuantity}`,
                                    `Total Value: $${item.totalValue.toLocaleString()}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Batches'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Location'
                        }
                    }
                }
            }
        };

        return new Chart(canvas, config);
    }

    /**
     * Create a pie chart for value distribution by supplier
     */
    createSupplierValueChart(canvas: HTMLCanvasElement, data: any[]): Chart {
        const colors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
            '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
        ];

        const chartData = {
            labels: data.map(item => item.supplierName),
            datasets: [{
                data: data.map(item => item.totalValue),
                backgroundColor: colors.slice(0, data.length),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        };

        const config: ChartConfiguration = {
            type: 'pie',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = data.reduce((sum, item) => sum + item.totalValue, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: $${value.toLocaleString()} (${percentage}%)`;
                            },
                            afterLabel: (context) => {
                                const item = data[context.dataIndex];
                                return [
                                    `Batches: ${item.batchCount}`,
                                    `Avg Age: ${item.averageAge} days`
                                ];
                            }
                        }
                    }
                }
            }
        };

        return new Chart(canvas, config);
    }

    /**
     * Create a line chart for expiry trends
     */
    createExpiryTrendChart(canvas: HTMLCanvasElement, data: any[]): Chart {
        const chartData = {
            labels: data.map(item => new Date(item.date).toLocaleDateString()),
            datasets: [
                {
                    label: 'Expiring Batches',
                    data: data.map(item => item.expiringCount),
                    borderColor: '#FF9800',
                    backgroundColor: 'rgba(255, 152, 0, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Expired Batches',
                    data: data.map(item => item.expiredCount),
                    borderColor: '#F44336',
                    backgroundColor: 'rgba(244, 67, 54, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        };

        const config: ChartConfiguration = {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Batches'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    }
                }
            }
        };

        return new Chart(canvas, config);
    }

    /**
     * Destroy a chart instance
     */
    destroyChart(chart: Chart | null): void {
        if (chart) {
            chart.destroy();
        }
    }
}