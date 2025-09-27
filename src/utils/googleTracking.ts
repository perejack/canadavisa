// Google Ads and Analytics tracking utilities

declare global {
  interface Window {
    gtag?: (
      command: string,
      targetId: string | Date,
      config?: any
    ) => void;
    dataLayer?: any[];
  }
}

// Google Ads Account ID
export const GOOGLE_ADS_ID = 'AW-17557210856';

// IMPORTANT: Replace this with your actual conversion label from Google Ads
// To get your conversion label:
// 1. Go to Google Ads > Tools & Settings > Conversions
// 2. Create or select your conversion action
// 3. Click on "Tag setup" and find the conversion label in the code snippet
// It will look something like: 'AW-17557210856/AbC123XyZ'
export const CONVERSION_LABEL = 'CONVERSION_LABEL'; // Replace with actual label

interface ConversionData {
  transactionId: string;
  value: number;
  currency?: string;
  itemName?: string;
  itemId?: string;
}

/**
 * Track a successful payment conversion in Google Ads
 */
export const trackPaymentConversion = (data: ConversionData) => {
  if (typeof window === 'undefined' || !window.gtag) {
    console.warn('Google gtag not available');
    return;
  }

  try {
    // Track conversion for Google Ads
    window.gtag('event', 'conversion', {
      'send_to': `${GOOGLE_ADS_ID}/${CONVERSION_LABEL}`,
      'value': data.value,
      'currency': data.currency || 'KES',
      'transaction_id': data.transactionId
    });

    // Also track as a purchase event for Google Analytics 4
    window.gtag('event', 'purchase', {
      'transaction_id': data.transactionId,
      'value': data.value,
      'currency': data.currency || 'KES',
      'items': data.itemName ? [{
        'item_id': data.itemId || 'upgrade',
        'item_name': data.itemName,
        'price': data.value,
        'quantity': 1
      }] : []
    });

    console.log('Conversion tracked successfully:', {
      transactionId: data.transactionId,
      value: data.value,
      currency: data.currency || 'KES'
    });
  } catch (error) {
    console.error('Error tracking conversion:', error);
  }
};

/**
 * Track page view
 */
export const trackPageView = (pagePath?: string) => {
  if (typeof window === 'undefined' || !window.gtag) {
    return;
  }

  window.gtag('config', GOOGLE_ADS_ID, {
    page_path: pagePath || window.location.pathname
  });
};

/**
 * Track custom events
 */
export const trackEvent = (eventName: string, parameters?: Record<string, any>) => {
  if (typeof window === 'undefined' || !window.gtag) {
    return;
  }

  window.gtag('event', eventName, parameters);
};

/**
 * Track form submissions
 */
export const trackFormSubmission = (formName: string, formData?: Record<string, any>) => {
  trackEvent('form_submit', {
    form_name: formName,
    ...formData
  });
};

/**
 * Track button clicks
 */
export const trackButtonClick = (buttonName: string, metadata?: Record<string, any>) => {
  trackEvent('button_click', {
    button_name: buttonName,
    ...metadata
  });
};
