/**
 * Service d'intégration de paiement FuturaPay
 * Gère l'initiation et la vérification des transactions
 */
import config from "../config/config.js";
const Futurapay = require("futurapay/futurapay");

type TransactionData = {
  currency: string;
  amount: number;
  customer_transaction_id: string | number;
  country_code?: string;
  customer_first_name?: string;
  customer_last_name?: string;
  customer_phone?: string;
  customer_email?: string;
  [key: string]: any;
};

const merchantKey = config.FUTURA_PAY_MERCHANT_KEY;
const siteId = config.FUTURA_PAY_SITE_ID;
const apiKey = config.FUTURA_PAY_API_KEY;

// Initialise un client Futurapay partagé
const paymentGateway = new Futurapay(merchantKey, apiKey, siteId);

// Choisir l'environnement (sandbox en dev)
paymentGateway.setEnv(
  process.env.NODE_ENV === "production" ? "live" : "sandbox"
);
// Type "withdraw" / "deposit" selon documentation (ici on utilise "withdraw")
paymentGateway.setType("withdraw");

/**
 * Génère l'URL sécurisée pour l'iframe de paiement FuturaPay.
 * Retourne la chaîne URL à ouvrir dans un iframe côté client.
 */
export function initiateFuturaPayment(
  transactionData: TransactionData
): string {
  // La méthode de SDK documentée est initiatePayment
  // customer_transaction_id doit être unique (ici on attend l'id de réservation productForfait)
  const securedUrl = paymentGateway.initiatePayment(transactionData as any);
  return securedUrl;
}

/**
 * Vérification (placeholder) : selon le SDK / API FuturaPay vous devrez
 * appeler l'API de vérification ou traiter le webhook envoyé par FuturaPay.
 * Ici on laisse une fonction exportée à adapter avec l'API réelle.
 */
export async function verifyFuturaTransaction(
  customerTransactionId: string
): Promise<{ status: "PAID" | "FAILED" | "UNKNOWN"; raw?: any }> {
  // TODO: Implémenter l'appel de vérification si le SDK / API le permet.
  // Exemple (pseudo) : const status = await paymentGateway.verify(customerTransactionId);
  // Pour l'instant renvoyer UNKNOWN pour forcer l'usage du webhook / confirmation sécurisée.
  return { status: "UNKNOWN" };
}
