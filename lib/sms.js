// Sends real OTP SMS via the provider chosen with SMS_PROVIDER ("aws" | "textlk").
// Defaults to "aws" since that was the original provider wired into this app.

const SMS_PROVIDER = process.env.SMS_PROVIDER || 'aws';

async function sendViaAws(phoneNumber, message) {
  const { SNSClient, PublishCommand } = await import('@aws-sdk/client-sns');
  const sns = new SNSClient({ region: process.env.AWS_REGION });
  await sns.send(new PublishCommand({
    PhoneNumber: phoneNumber,
    Message: message,
    MessageAttributes: {
      'AWS.SNS.SMS.SMSType': { DataType: 'String', StringValue: 'Transactional' },
      'AWS.SNS.SMS.SenderID': { DataType: 'String', StringValue: 'SecureBank' },
    },
  }));
}

async function sendViaTextLk(phoneNumber, message) {
  const recipient = phoneNumber.replace(/^\+/, ''); // Text.lk expects e.g. 94710000000, no leading +
  const res = await fetch('https://app.text.lk/api/v3/sms/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.TEXTLK_API_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      recipient,
      sender_id: process.env.TEXTLK_SENDER_ID || 'TextLKDemo',
      type: 'plain',
      message,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.status === false) {
    throw new Error(data.message || `Text.lk request failed (${res.status})`);
  }
}

export async function sendOtpSms(phoneNumber, message) {
  if (SMS_PROVIDER === 'textlk') {
    return sendViaTextLk(phoneNumber, message);
  }
  return sendViaAws(phoneNumber, message);
}
