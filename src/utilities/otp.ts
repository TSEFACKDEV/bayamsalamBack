export const generateOTP = (length = 6): string => {
  const digits = '0123456789';
  let OTP = '';
  for (let i = 0; i < length; i++) {
    OTP += digits[Math.floor(Math.random() * 10)];
  }
  return OTP;
};

export const validateOTP = (
  inputOTP: string,
  storedOTP: string | null
): boolean => {
  if (!storedOTP) return false;
  return inputOTP === storedOTP;
};
