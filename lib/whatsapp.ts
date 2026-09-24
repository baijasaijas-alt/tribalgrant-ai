export type WhatsAppResult = {
  sent: boolean;
  configured: boolean;
  messageId?: string;
  error?: string;
};

function normalizeIndianWhatsApp(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length > 8) return digits;
  return "";
}

export async function sendWhatsApp(to: string, body: string): Promise<WhatsAppResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    return { sent: false, configured: false, error: "WhatsApp Cloud API credentials are not configured." };
  }

  const recipient = normalizeIndianWhatsApp(to);
  if (!recipient) return { sent: false, configured: true, error: "Applicant WhatsApp number is invalid." };

  try {
    const response = await fetch(`https://graph.facebook.com/v23.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "text",
        text: { preview_url: false, body },
      }),
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { sent: false, configured: true, error: data?.error?.message || `WhatsApp API returned ${response.status}.` };
    }
    return { sent: true, configured: true, messageId: data?.messages?.[0]?.id };
  } catch (error) {
    return { sent: false, configured: true, error: error instanceof Error ? error.message : "WhatsApp request failed." };
  }
}
