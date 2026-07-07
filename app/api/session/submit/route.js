import { NextResponse } from 'next/server';
import { getParticipant, setParticipant, appendSession, getNextSessionId } from '@/lib/db';

export async function POST(request) {
  const {
    participantId, phoneNumber, ageCategory, label,
    type, amount, isNewBeneficiary, destName, destAcc,
    otpResponseTime, callInProgressFlag, otpRerequestCount, failedOtpAttempts,
    transactionToLoginGap, noOfTransactionsPast10min,
  } = await request.json();

  const acct = await getParticipant(participantId);
  if (!acct) {
    return NextResponse.json({ error: 'participant not initialised' }, { status: 400 });
  }

  const id = await getNextSessionId();
  const oldBalance = acct.balance;
  const newBalance = oldBalance - amount;

  const row = {
    id,
    participant_id: participantId,
    phone_number: phoneNumber,
    age_category: ageCategory || null,
    created_at: new Date().toISOString(),
    type,
    amount,
    oldbalance_org: +oldBalance.toFixed(2),
    newbalance_orig: +newBalance.toFixed(2),
    dest_name: destName,
    dest_acc: destAcc,
    is_new_beneficiary: isNewBeneficiary ? 1 : 0,
    amount_to_avg_ratio: +(amount / acct.avgAmount).toFixed(2),
    otp_response_time: otpResponseTime,
    call_in_progress_flag: callInProgressFlag,
    otp_rerequest_count: otpRerequestCount,
    no_of_transactions_past10min: noOfTransactionsPast10min,
    time_of_day: new Date().getHours(),
    failed_otp_attempts: failedOtpAttempts,
    transaction_to_login_gap: transactionToLoginGap,
    is_otp_abuse_fraud: label,
  };

  const totalRows = await appendSession(row);

  const updatedAcct = { ...acct, balance: newBalance };
  if (isNewBeneficiary) {
    updatedAcct.beneficiaries = [...acct.beneficiaries, { name: destName, acc: destAcc }];
  }
  await setParticipant(participantId, updatedAcct);

  return NextResponse.json({ success: true, totalRows });
}