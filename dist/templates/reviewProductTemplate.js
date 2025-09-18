"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewProductTemplate = reviewProductTemplate;
function reviewProductTemplate({ userName, productName, status, message, }) {
    const statusColor = status === 'VALIDATED' ? '#28a745' : '#dc3545';
    const statusText = status === 'VALIDATED' ? 'Validé' : 'Rejeté';
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Statut de votre produit - BuyAndSale</title>
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
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 6px;
    }
    .header p {
      font-size: 14px;
      opacity: 0.9;
    }
    .content {
      padding: 32px 24px;
    }
    .info-row {
      display: flex;
      align-items: flex-start;
      margin-bottom: 14px;
    }
    .info-label {
      font-weight: 600;
      color: #2d3748;
      min-width: 90px;
      font-size: 15px;
    }
    .info-value {
      color: #4a5568;
      font-size: 15px;
      flex: 1;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 18px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 15px;
      color: #fff;
      background: ${statusColor};
      box-shadow: 0 2px 8px rgba(0,0,0,0.07);
      letter-spacing: 1px;
    }
    .message-box {
      background: #f7fafc;
      border-left: 4px solid #ff6b35;
      padding: 18px;
      border-radius: 0 10px 10px 0;
      margin-bottom: 22px;
      color: #2d3748;
      font-size: 16px;
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
      .info-row { flex-direction: column; }
      .info-label { margin-bottom: 5px; }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <span class="header-icon">🛒</span>
      <h1>Statut de votre produit</h1>
      <p>BuyAndSale Administration</p>
    </div>
    <div class="content">
      <div class="message-box">
        Bonjour <strong>${userName}</strong>,<br><br>
        ${message}
      </div>
      <div class="info-row">
        <div class="info-label">Produit :</div>
        <div class="info-value"><strong>${productName !== null && productName !== void 0 ? productName : 'Non spécifié'}</strong></div>
      </div>
      <div class="info-row">
        <div class="info-label">Statut :</div>
        <div class="info-value">
          <span class="status-badge">${statusText}</span>
        </div>
      </div>
      <br>
      <div style="font-size:15px;color:#4a5568;">Merci d'utiliser <strong>BuyAndSale</strong> !</div>
    </div>
    <div class="footer">
      <p><strong>BuyAndSale</strong> - Système de notification automatique</p>
      <p>Cet email a été généré automatiquement suite à la validation de produit</p>
      <p>Cameroun | Administration BuyAndSale</p>
    </div>
  </div>
</body>
</html>
  `;
}
