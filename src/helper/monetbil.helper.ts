import axios from "axios";
import env from "../config/config";

const MONETBIL_SERVICE_KEY = env.MONETBIL_SERVICE_KEY || "7twIVmf2R0B9IBOHr0qWVAQ6yS5ws9gW";
const MONETBIL_BASE_URL = env.MONETBIL_BASE_URL || "https://api.monetbil.com/payment/v1";

export async function placePayment({
  phonenumber,
  amount,
  notify_url,
  country = "CM",
  currency = "XAF",
  operator = "CM_MTNMOBILEMONEY", // ou CM_ORANGEMONEY selon le choix
  item_ref,
  payment_ref,
  first_name,
  last_name,
  email,
}: any) {
  const payload = {
    service: MONETBIL_SERVICE_KEY,
    phonenumber,
    amount,
    notify_url,
    country,
    currency,
    operator,
    item_ref,
    payment_ref,
    first_name,
    last_name,
    email,
  };
  const { data } = await axios.post(`${MONETBIL_BASE_URL}/placePayment`, payload);
  return data;
}

export async function checkPayment(paymentId: string) {
  const payload = { paymentId };
  const { data } = await axios.post(`${MONETBIL_BASE_URL}/checkPayment`, payload);
  return data;
}