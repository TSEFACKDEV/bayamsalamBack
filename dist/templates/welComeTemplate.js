"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWelcomeTemplate = createWelcomeTemplate;
function createWelcomeTemplate(firstName, lastName) {
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bienvenue sur BuyAndSale</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 20px;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
        }
        .logo {
            width: 80px;
            height: 80px;
            margin: 0 auto 20px;
            background: white;
            border-radius: 50%;
            padding: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 10px;
        }
        .content {
            padding: 50px 40px;
            text-align: center;
        }
        .greeting {
            font-size: 24px;
            color: #2d3748;
            margin-bottom: 20px;
            font-weight: 600;
        }
        .message {
            font-size: 16px;
            color: #4a5568;
            line-height: 1.6;
            margin-bottom: 40px;
        }
        .welcome-container {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 15px;
            padding: 30px;
            margin: 30px 0;
            color: white;
        }
        .footer {
            background: #2d3748;
            color: white;
            padding: 30px;
            text-align: center;
        }
        .divider {
            height: 3px;
            background: linear-gradient(90deg, #ff6b35, #ff8c42, #ff6b35);
        }
        @media (max-width: 600px) {
            body { padding: 10px; }
            .content { padding: 30px 20px; }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">
                <!-- Icône SVG shopping/marketplace intégrée -->
                <svg width="50" height="50" viewBox="0 0 24 24" fill="none">
                    <path d="M7 4V2C7 1.45 7.45 1 8 1H16C16.55 1 17 1.45 17 2V4H20C20.55 4 21 4.45 21 5S20.55 6 20 6H19V19C19 20.1 18.1 21 17 21H7C5.9 21 5 20.1 5 19V6H4C3.45 6 3 5.55 3 5S3.45 4 4 4H7ZM9 3V4H15V3H9ZM7 6V19H17V6H7Z" fill="#ff6b35"/>
                    <path d="M9 8V17H11V8H9ZM13 8V17H15V8H13Z" fill="#ff6b35"/>
                    <circle cx="9" cy="10" r="1" fill="#ff8c42"/>
                    <circle cx="15" cy="10" r="1" fill="#ff8c42"/>
                </svg>
            </div>
            <h1>BuyAndSale</h1>
            <p>Votre marketplace de confiance</p>
        </div>
        
        <div class="divider"></div>
        
        <div class="content">
            <div class="greeting">Bonjour ${firstName} ${lastName} ! 👋</div>
            <div class="welcome-container">
                <h2>Bienvenue sur BuyAndSale !</h2>
                <p>Votre compte a été vérifié avec succès.<br>
                Nous sommes ravis de vous compter parmi nous !</p>
            </div>
            <div class="message">
                Profitez de toutes les fonctionnalités de notre plateforme :
                <br>✅ Publiez vos annonces gratuitement
                <br>✅ Contactez directement les vendeurs
                <br>✅ Gérez votre profil personnalisé
            </div>
            <br>
            <p style="color:#4a5568;">L'équipe BuyAndSale</p>
        </div>
        
        <div class="divider"></div>
        
        <div class="footer">
            <p><strong>BuyAndSale</strong> - La marketplace qui rapproche</p>
            <p>Cameroun | Achetez, Vendez, Échangez en toute confiance</p>
            <p style="margin-top: 20px; font-size: 12px; opacity: 0.7;">
                Cet email a été envoyé automatiquement, merci de ne pas y répondre.
            </p>
        </div>
    </div>
</body>
</html>
`;
}
