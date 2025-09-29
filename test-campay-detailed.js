const axios = require('axios');

async function testCampayDetailed() {
  try {
    console.log('🔐 Test d\'authentification Campay...');
    
    const tokenResponse = await axios.post(
      'https://demo.campay.net/api/token/',
      {
        username: 'oJ3WoHLy6P_B0shQyNwf1tq0tEuIbKeW3EnK_1D2SMnuvzttL0SVYLXRBPv78BEE0alOFlPd2SfvrBjPBmB5wg',
        password: 'E0rwS_4kJcTpBkzgmnJuU1EbKA78MvDrj39627rUHVBA0yhj3Y5EA8JdQupAle4pJaI0_CbJwaOFaayijWjT_Q'
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );
    
    console.log('✅ Token obtenu:', {
      token: tokenResponse.data.token?.substring(0, 30) + '...',
      expires_in: tokenResponse.data.expires_in
    });
    
    const token = tokenResponse.data.token;
    
    console.log('💳 Test d\'initiation de paiement...');
    
    const paymentData = {
      amount: '100',
      currency: 'XAF',
      from: '237653360437',
      description: 'Test forfait PREMIUM',
      external_reference: 'test-' + Date.now(),
    };
    
    console.log('📤 Données envoyées:', paymentData);
    
    const paymentResponse = await axios.post(
      'https://demo.campay.net/api/collect/',
      paymentData,
      {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000
      }
    );
    
    console.log('✅ Paiement initié avec succès:', paymentResponse.data);
    
  } catch (error) {
    console.error('❌ Erreur détaillée:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.response?.headers,
      config: error.config ? {
        url: error.config.url,
        method: error.config.method,
        data: error.config.data,
        headers: Object.keys(error.config.headers || {})
      } : null
    });
  }
}

testCampayDetailed();