export const createWelcomeEmailTemplate = (
  firstName: string,
  lastName: string
): string => {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenue sur BuyamSale !</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #f8f9fa 0%, #e2e8f0 100%);
      padding: 20px;
      line-height: 1.6;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.08);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%);
      color: white;
      padding: 32px 24px;
      text-align: center;
    }
    .header-icon {
      font-size: 40px;
      margin-bottom: 12px;
      display: inline-block;
    }
    .header h1 {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .header p {
      font-size: 15px;
      opacity: 0.9;
    }
    .content {
      padding: 32px 24px;
      text-align: center;
    }
    .welcome-message {
      background: #f7fafc;
      border-left: 4px solid #ff6b35;
      padding: 20px;
      border-radius: 0 10px 10px 0;
      margin-bottom: 22px;
      color: #2d3748;
      font-size: 17px;
    }
    .features-list {
      text-align: left;
      margin: 30px auto 20px auto;
      max-width: 400px;
      padding-left: 0;
      list-style: none;
    }
    .features-list li {
      margin-bottom: 12px;
      font-size: 15px;
      color: #4a5568;
      padding-left: 28px;
      position: relative;
    }
    .features-list li:before {
      content: "✅";
      position: absolute;
      left: 0;
    }
    .footer {
      background: #f7fafc;
      color: #718096;
      padding: 20px;
      text-align: center;
      font-size: 13px;
      border-top: 1px solid #e2e8f0;
    }
    @media (max-width: 600px) {
      body { padding: 10px; }
      .content { padding: 18px; }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <span class="header-icon">🎉</span>
      <h1>Bienvenue sur BuyamSale !</h1>
      <p>Votre marketplace de confiance au Cameroun</p>
    </div>
    <div class="content">
      <div class="welcome-message">
        Bonjour <strong>${firstName} ${lastName}</strong>,<br><br>
        Nous sommes ravis de vous accueillir sur <strong>BuyamSale</strong>.<br>
        Découvrez une nouvelle façon d'acheter, vendre et échanger en toute simplicité !
      </div>
      <ul class="features-list">
        <li>Publiez vos annonces gratuitement</li>
        <li>Contactez directement les vendeurs et acheteurs</li>
        <li>Gérez votre profil personnalisé</li>
        <li>Bénéficiez d'une plateforme sécurisée et conviviale</li>
      </ul>
      <div style="font-size:15px;color:#4a5568;">
        Merci de rejoindre la communauté <strong>BuyamSale</strong> !
      </div>
    </div>
    <div class="footer">
      <p><strong>BuyamSale</strong> - Système de notification automatique</p>
      <p>Cet email a été généré automatiquement lors de la création de votre compte</p>
      <p>Cameroun | Administration BuyamSale</p>
    </div>
  </div>
</body>
</html>
  `;
};  