// Working Netlify function to initiate payment - adapted for Canada Visa Jobs
const axios = require('axios');

// PayHero API credentials (working from genesis project)
const API_USERNAME = 'tYWy3Di6vrQyFZbLvBtY'; // Removed leading space
const API_PASSWORD = 'T5k7IihbPdEs4VOZXvbvSJut3pzbYsgui9YGpNOy';
const CHANNEL_ID = 3603; // Try without channel ID first

// Generate Basic Auth Token
const generateBasicAuthToken = () => {
  const credentials = `${API_USERNAME}:${API_PASSWORD}`;
  return 'Basic ' + Buffer.from(credentials).toString('base64');
};

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }
  
  // Process POST request
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, message: 'Method not allowed' })
    };
  }
  
  try {
    const requestBody = JSON.parse(event.body);
    const { phoneNumber, amount = 250, description = 'Account Verification Fee' } = requestBody;
    
    if (!phoneNumber) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, message: 'Phone number is required' })
      };
    }
    
    // Generate a unique reference for this payment
    const externalReference = `MEAL-${Date.now()}-${Math.floor(Math.random() * 1000)}`; // Changed from VISA to MEAL
    
    // Define the callback URL - use Netlify function URL
    const callbackUrl = `${process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://canadavisaexperts.netlify.app'}/.netlify/functions/payment-callback`;
    
    const payload = {
      amount: amount,
      phone_number: phoneNumber,
      channel_id: CHANNEL_ID,
      provider: "m-pesa",
      external_reference: externalReference,
      description: description,
      callback_url: callbackUrl
    };
    
    console.log('Initiating payment with payload:', JSON.stringify(payload));
    console.log('Authorization token:', generateBasicAuthToken());
    console.log('API Username:', API_USERNAME);
    console.log('API Password length:', API_PASSWORD.length);
    
    // Try multiple authentication methods
    const authHeaders = [
      {
        'Content-Type': 'application/json',
        'Authorization': generateBasicAuthToken()
      },
      {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_USERNAME}:${API_PASSWORD}`
      },
      {
        'Content-Type': 'application/json',
        'X-API-Key': API_USERNAME,
        'X-API-Secret': API_PASSWORD
      }
    ];
    
    let response;
    let lastError;
    
    for (let i = 0; i < authHeaders.length; i++) {
      try {
        console.log(`Trying authentication method ${i + 1}...`);
        console.log('Headers:', JSON.stringify(authHeaders[i]));
        
        response = await axios({
          method: 'post',
          url: 'https://backend.payhero.co.ke/api/v2/payments',
          data: payload,
          headers: authHeaders[i],
          timeout: 25000,
          validateStatus: function (status) {
            return status >= 200 && status < 500;
          }
        });
        
        console.log(`Authentication method ${i + 1} response status:`, response.status);
        
        if (response.status !== 401) {
          console.log('Success! Using authentication method', i + 1);
          break;
        }
        
      } catch (error) {
        lastError = error;
        console.log(`Authentication method ${i + 1} failed:`, error.message);
        if (error.response) {
          console.log('Response status:', error.response.status);
        }
      }
    }
    
    if (!response || response.status === 401) {
      console.log('All authentication methods failed');
      throw lastError || new Error('Authentication failed');
    }
    
    console.log('Payment API response status:', response.status);
    console.log('Payment API response data:', JSON.stringify(response.data));
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Payment initiated successfully',
        data: {
          externalReference: response.data.CheckoutRequestID || externalReference,
          checkoutRequestId: response.data.CheckoutRequestID
        }
      })
    };
  } catch (error) {
    console.error('Payment initiation error details:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data));
      console.error('Response headers:', JSON.stringify(error.response.headers));
    } else if (error.request) {
      console.error('Request made but no response received');
      console.error('Request details:', error.request);
    } else {
      console.error('Error setting up request:', error.message);
    }
    
    // Determine appropriate error message and status code
    let statusCode = 500;
    let errorMessage = 'Failed to initiate payment';
    let errorDetails = error.message;
    
    if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Unable to connect to payment gateway';
      errorDetails = 'Connection refused. The payment service may be temporarily unavailable.';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Payment request timed out';
      errorDetails = 'The payment gateway took too long to respond. Please try again.';
    } else if (error.response) {
      statusCode = error.response.status || 500;
      errorMessage = error.response.data?.message || 'Payment gateway error';
      errorDetails = error.response.data || error.message;
    }
    
    return {
      statusCode: statusCode,
      headers,
      body: JSON.stringify({
        success: false,
        message: errorMessage,
        error: errorDetails
      })
    };
  }
};
