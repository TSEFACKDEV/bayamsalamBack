"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContactEmailTemplate = void 0;
const createContactEmailTemplate = (name, email, subject, message) => {
    const currentDate = new Date().toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nouveau message de contact - BuyAndSale</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f8f9fa;
            padding: 20px;
            line-height: 1.6;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #2d3748 0%, #4a5568 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header-icon {
            width: 50px;
            height: 50px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            margin: 0 auto 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
        }
        .header h1 {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 5px;
        }
        .header p {
            font-size: 14px;
            opacity: 0.9;
        }
        .content {
            padding: 30px;
        }
        .message-info {
            background: #f7fafc;
            border-left: 4px solid #ff6b35;
            padding: 20px;
            margin-bottom: 25px;
            border-radius: 0 8px 8px 0;
        }
        .info-row {
            display: flex;
            margin-bottom: 12px;
            align-items: flex-start;
        }
        .info-row:last-child {
            margin-bottom: 0;
        }
        .info-label {
            font-weight: 600;
            color: #2d3748;
            min-width: 80px;
            font-size: 14px;
        }
        .info-value {
            color: #4a5568;
            font-size: 14px;
            flex: 1;
        }
        .message-content {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin-top: 20px;
        }
        .message-content h3 {
            color: #2d3748;
            font-size: 16px;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .message-text {
            color: #4a5568;
            font-size: 15px;
            line-height: 1.7;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        .footer {
            background: #f7fafc;
            color: #718096;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            border-top: 1px solid #e2e8f0;
        }
        .footer p {
            margin-bottom: 5px;
        }
        .reply-button {
            display: inline-block;
            background: #ff6b35;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 14px;
            margin-top: 15px;
            transition: background 0.2s;
        }
        .reply-button:hover {
            background: #e55a2b;
        }
        @media (max-width: 600px) {
            body { padding: 10px; }
            .content { padding: 20px; }
            .info-row { flex-direction: column; }
            .info-label { margin-bottom: 5px; }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header simple et pro -->
        <div class="header">
            <div class="header-icon">📧</div>
                  <h1 style="color: #333; text-align: center; margin-bottom: 30px;">
        Nouveau Contact - BuyAndSale
      </h1>
            <p>BuyAndSale Administration</p>
        </div>
        
        <!-- Contenu principal -->
        <div class="content">
            <!-- Informations de contact -->
            <div class="message-info">
                <div class="info-row">
                    <div class="info-label">👤 Nom :</div>
                    <div class="info-value"><strong>${name}</strong></div>
                </div>
                <div class="info-row">
                    <div class="info-label">📧 Email :</div>
                    <div class="info-value"><a href="mailto:${email}" style="color: #ff6b35; text-decoration: none;">${email}</a></div>
                </div>
                <div class="info-row">
                    <div class="info-label">📅 Date :</div>
                    <div class="info-value">${currentDate}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">📋 Sujet :</div>
                    <div class="info-value"><strong>${subject}</strong></div>
                </div>
            </div>
            
            <!-- Message complet -->
            <div class="message-content">
                <h3>💬 Message complet</h3>
                <div class="message-text">${message}</div>
            </div>
            
            <!-- Bouton de réponse rapide -->
            <div style="text-align: center;">
                <a href="mailto:${email}?subject=Re: ${encodeURIComponent(subject)}" class="reply-button">
                    Répondre à ${name}
                </a>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <p><strong>BuyAndSale</strong> - Système de notification automatique</p>
            <p>Cet email a été généré automatiquement depuis le formulaire de contact</p>
            <p>Cameroun | Administration BuyAndSale</p>
        </div>
    </div>
</body>
</html>
  `;
};
exports.createContactEmailTemplate = createContactEmailTemplate;
