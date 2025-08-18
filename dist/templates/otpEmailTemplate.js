"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOTPEmailTemplate = void 0;
const createOTPEmailTemplate = (firstName, lastName, otp) => {
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code de vérification - BuyamSale</title>
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
        .otp-container {
            background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%);
            border-radius: 15px;
            padding: 30px;
            margin: 30px 0;
        }
        .otp-label {
            color: white;
            font-size: 14px;
            font-weight: 600;
            letter-spacing: 1px;
            margin-bottom: 15px;
            text-transform: uppercase;
        }
        .otp-code {
            font-size: 42px;
            font-weight: 800;
            color: white;
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        .security-info {
            background: #f7fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 25px;
            margin: 30px 0;
            text-align: left;
        }
        .security-info h3 {
            color: #2d3748;
            font-size: 18px;
            margin-bottom: 15px;
            text-align: center;
        }
        .security-info ul {
            color: #4a5568;
            font-size: 14px;
            line-height: 1.6;
            list-style: none;
        }
        .security-info li {
            margin-bottom: 8px;
            padding-left: 25px;
            position: relative;
        }
        .security-info li:before {
            content: "🔒";
            position: absolute;
            left: 0;
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
            .otp-code { font-size: 36px; letter-spacing: 4px; }
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
            <h1>BuyamSale</h1>
            <p>Votre marketplace de confiance</p>
        </div>
        
        <div class="divider"></div>
        
        <div class="content">
            <div class="greeting">Bonjour ${firstName} ${lastName} ! 👋</div>
            
            <div class="message">
                Bienvenue sur <strong>BuyamSale</strong> ! Nous sommes ravis de vous compter parmi nous.
                <br><br>
                Pour finaliser la création de votre compte, veuillez utiliser le code de vérification ci-dessous :
            </div>
            
            <div class="otp-container">
                <div class="otp-label">Code de vérification</div>
                <div class="otp-code">${otp}</div>
            </div>
            
            <div class="security-info">
                <h3>🛡️ Informations importantes</h3>
                <ul>
                    <li>Ce code expire dans <strong>10 minutes</strong></li>
                    <li>Ne partagez jamais ce code avec qui que ce soit</li>
                    <li>Notre équipe ne vous demandera jamais ce code</li>
                    <li>Si vous n'avez pas créé ce compte, ignorez cet email</li>
                </ul>
            </div>
            
            <div class="message">
                Une fois votre compte vérifié, vous pourrez :
                <br>✅ Publier vos annonces gratuitement
                <br>✅ Contacter directement les vendeurs  
                <br>✅ Gérer votre profil personnalisé
            </div>
        </div>
        
        <div class="divider"></div>
        
        <div class="footer">
            <p><strong>BuyamSale</strong> - La marketplace qui rapproche</p>
            <p>Cameroun | Achetez, Vendez, Échangez en toute confiance</p>
            <p style="margin-top: 20px; font-size: 12px; opacity: 0.7;">
                Cet email a été envoyé automatiquement, merci de ne pas y répondre.
            </p>
        </div>
    </div>
</body>
</html>
  `;
};
exports.createOTPEmailTemplate = createOTPEmailTemplate;
