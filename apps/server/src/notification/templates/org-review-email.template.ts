export function buildOrgApprovalEmailHtml(params: {
  organizationName: string;
  loginUrl?: string;
}): string {
  const loginUrl = params.loginUrl || 'https://darnozomlms.com/login';
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1e293b; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #0f172a; font-size: 24px; font-weight: 700; margin: 0;">🎉 Congratulations!</h1>
        <p style="color: #059669; font-size: 16px; font-weight: 600; margin-top: 6px;">Your organization account has been approved</p>
      </div>

      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; color: #166534; font-size: 15px;">
          Great news! <strong>${params.organizationName}</strong> has been officially reviewed and approved by the platform administration.
        </p>
      </div>

      <p style="font-size: 15px; line-height: 1.6; color: #334155;">
        You can now access your full organization dashboard, publish courses and content, invite teachers and instructors, and enroll students.
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${loginUrl}" style="background-color: #0f172a; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
          Go to Dashboard
        </a>
      </div>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; text-align: center;">
        If you have any questions or need assistance setting up your academy, please contact our support team.
      </p>
    </div>
  `;
}

export function buildOrgRejectionEmailHtml(params: {
  organizationName: string;
  reason?: string;
  resubmitUrl?: string;
}): string {
  const resubmitUrl = params.resubmitUrl || 'https://darnozomlms.com/verification';
  const reasonText = params.reason ? params.reason : 'Identity verification documents did not meet requirements.';

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1e293b; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #0f172a; font-size: 24px; font-weight: 700; margin: 0;">Verification Status Update</h1>
        <p style="color: #dc2626; font-size: 16px; font-weight: 600; margin-top: 6px;">Application for ${params.organizationName}</p>
      </div>

      <p style="font-size: 15px; line-height: 1.6; color: #334155;">
        Thank you for submitting your verification details for <strong>${params.organizationName}</strong>. After review by our platform administration team, we regret to inform you that your verification was not approved.
      </p>

      <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 6px 0; color: #991b1b; font-weight: 600; font-size: 14px;">Reason for Rejection / Review Comments:</p>
        <p style="margin: 0; color: #7f1d1d; font-size: 14px; line-height: 1.5;">${reasonText}</p>
      </div>

      <p style="font-size: 15px; line-height: 1.6; color: #334155;">
        You can review the feedback above, update your verification documents, and resubmit your application through your dashboard.
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${resubmitUrl}" style="background-color: #0f172a; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
          Review and Resubmit
        </a>
      </div>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; text-align: center;">
        If you believe this was an error or need further clarification, please contact our support team.
      </p>
    </div>
  `;
}
