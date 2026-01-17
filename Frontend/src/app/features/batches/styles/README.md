# Batch Management Enhanced Styling System

This directory contains the enhanced styling system for the batch management module, implementing a light theme with #7367F0 primary color and dark gray text (#4B4B4B).

## File Structure

```
styles/
├── index.scss                           # Main entry point - imports all styles
├── batch-enhanced-theme.scss            # Core theme system with variables and mixins
├── batch-table-enhanced.scss            # Enhanced table and list styling
└── README.md                           # This documentation

components/
├── expiry-tracker/
│   └── expiry-tracker-enhanced.component.scss    # Expiry tracker specific styles
└── batch-filters/
    └── batch-filters-enhanced.component.scss     # Batch filters specific styles
```

## Color Palette

### Primary Colors
- **Primary**: #7367F0 (Vuexy purple)
- **Primary Hover**: #5E50EE
- **Primary Light**: rgba(115, 103, 240, 0.08)
- **Primary Lighter**: rgba(115, 103, 240, 0.04)

### Text Colors
- **Primary Text**: #4B4B4B (Dark gray)
- **Secondary Text**: #6E6B7B (Medium gray)
- **Muted Text**: #B8B8B8 (Light gray)
- **Card Titles**: #5E5873 (Darker gray)

### Background Colors
- **Page Background**: #F8F7FA (Light gray)
- **Card Background**: #FFFFFF (Pure white)
- **Table Alternate Rows**: #F8F7FA (Subtle striping)
- **Header Background**: #F3F2F7 (Light purple-gray)

### Status Colors
- **Expired**: #EA5455 (Red)
- **Critical**: #FF9F43 (Orange)
- **Warning**: #F6E05E (Yellow)
- **Normal/Active**: #28C76F (Green)
- **Depleted**: #9E9E9E (Gray)
- **Quarantined**: #FF9F43 (Orange)

## Key Features

### 1. Enhanced Search Fields
- #7367F0 border on focus with 2px width
- Hidden labels by default, shown on focus
- Purple placeholder text with italic styling
- Smooth transitions and hover effects

### 2. Status Indicators
- Color-coded badges for batch statuses
- Gradient backgrounds for expiry levels
- Consistent styling across all components

### 3. Card Layouts
- Elevated shadows with proper spacing
- Rounded corners (8px radius)
- Hover effects with subtle lift animation
- Consistent padding and margins

### 4. Table Enhancements
- Alternating row colors
- Hover effects with primary color accent
- Enhanced header styling
- Responsive design for mobile devices

### 5. Form Fields
- Purple labels and focus states
- Consistent styling across all form elements
- Enhanced dropdown and autocomplete panels
- Proper validation state colors

## Usage

### Importing Styles

To use the enhanced styling system in a component:

```scss
// Import the main theme system
@import '../../styles/batch-enhanced-theme';

// Use mixins in your component
.my-component {
  @include batch-card;
  
  .search-field {
    @include batch-search-field;
  }
  
  .primary-button {
    @include batch-button-primary;
  }
}
```

### Available Mixins

#### Layout Mixins
- `@include batch-card` - Enhanced card styling
- `@include batch-table` - Enhanced table styling
- `@include batch-search-field` - Search field with purple border

#### Button Mixins
- `@include batch-button-primary` - Primary button styling
- `@include batch-button-outline` - Outline button styling

#### Form Mixins
- `@include batch-form-field` - Enhanced form field styling

#### Status Mixins
- `@include batch-status-badge($status)` - Status badge styling
- `@include batch-expiry-card($level)` - Expiry card with gradient
- `@include batch-summary-card($type)` - Summary card styling

#### Utility Mixins
- `@include batch-smooth-transition` - Consistent transitions
- `@include batch-hover-lift` - Hover lift effect
- `@include batch-focus-visible` - Accessible focus states

### Responsive Design

The system includes responsive mixins:

```scss
@include batch-mobile {
  // Mobile-specific styles (max-width: 768px)
}

@include batch-tablet {
  // Tablet-specific styles (769px - 1024px)
}

@include batch-desktop {
  // Desktop-specific styles (min-width: 1025px)
}
```

### Accessibility

The system includes accessibility features:

```scss
@include batch-high-contrast {
  // High contrast mode styles
}

@include batch-focus-visible {
  // Enhanced focus indicators
}
```

## Component Integration

### Expiry Tracker Component
- Enhanced with gradient backgrounds for different expiry levels
- Color-coded status indicators
- Improved card layouts with hover effects
- Responsive design for all screen sizes

### Batch Filters Component
- Enhanced search field with #7367F0 border focus
- Purple labels for advanced filters
- Improved expansion panel styling
- Better form field interactions

### Batch List/Table Components
- Enhanced table styling with hover effects
- Status badges and action buttons
- Grouped view styling
- Loading and empty states

## Customization

### Changing Colors

To customize colors, modify the variables in `batch-enhanced-theme.scss`:

```scss
// Change primary color
$batch-primary: #your-color;
$batch-primary-hover: #your-hover-color;

// Change text colors
$batch-text-primary: #your-text-color;
```

### Adding New Status Types

To add new status types:

```scss
// Add new status color
$batch-status-new: #your-status-color;

// Update the status badge mixin
@mixin batch-status-badge($status) {
  // ... existing code ...
  @else if $status == 'new' {
    background-color: $batch-status-new !important;
    color: white !important;
  }
}
```

## Browser Support

The enhanced styling system supports:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance Considerations

- Uses CSS custom properties for dynamic theming
- Optimized for minimal repaints and reflows
- Efficient use of CSS Grid and Flexbox
- Minimal use of box-shadows and transitions

## Maintenance

When updating the styling system:

1. Update variables in `batch-enhanced-theme.scss`
2. Test across all components
3. Verify responsive behavior
4. Check accessibility compliance
5. Update this documentation