import axios from 'axios';
import env from '../config/config.js';

interface SmsResponse {
  responsecode: number;
  responsedescription: string;
  responsemessage: string;
  sms: {
    messageid: string;
    smsclientid: string;
    mobileno: string;
    status: string;
    errorcode: string;
    errordescription: string;
  }[];
}

export const sendSMS = async (
  phone: string,
  message: string
): Promise<boolean> => {
  try {
    // Format phone number (add 237 if not present)
    let formattedPhone = phone;
    if (!formattedPhone.startsWith('237')) {
      formattedPhone = `237${formattedPhone}`;
    }

    const url = 'https://smsvas.com/bulk/public/index.php/api/v1/sendsms';

    const params = new URLSearchParams();
    params.append('user', env.nexahUser);
    params.append('password', env.nexahPassword);
    params.append('senderid', env.nexahSenderId);
    params.append('sms', message);
    params.append('mobiles', formattedPhone);

    const response = await axios.get<SmsResponse>(
      `${url}?${params.toString()}`
    );

    if (response.data.responsecode === 1) {
      return true;
    } else {
      console.error('SMS sending failed:', response.data.responsemessage);
      return false;
    }
  } catch (error) {
    console.error('Error sending SMS:', error);
    return false;
  }
};

export const getSmsBalance = async (): Promise<number | null> => {
  try {
    const url = 'https://smsvas.com/bulk/public/index.php/api/v1/smscredit';

    const params = new URLSearchParams();
    params.append('user', env.nexahUser);
    params.append('password', env.nexahPassword);

    const response = await axios.get<{
      credit: number;
      accountexpdate: string;
      balanceexpdate: string;
    }>(`${url}?${params.toString()}`);

    return response.data.credit;
  } catch (error) {
    console.error('Error getting SMS balance:', error);
    return null;
  }
};
