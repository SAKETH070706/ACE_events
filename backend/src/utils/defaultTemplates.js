export const DEFAULT_MARKETING_SUBJECT = "You're invited: {{eventName}}";

export const DEFAULT_MARKETING_HTML = `
<p>Hello {{recipientName}},</p>
<p>You are invited to <strong>{{eventName}}</strong>.</p>
<p>{{description}}</p>
<p>
    Date: {{eventDate}}<br>
    Time: {{eventTime}}<br>
    Venue: {{venue}}
</p>
<p><a href="{{registrationLink}}">Register here</a></p>
<p>We look forward to seeing you.</p>
<p><strong>Association of Computer Engineers (ACE)</strong></p>
`.trim();

export const DEFAULT_CERTIFICATE_SUBJECT = "Your Certificate for {{eventName}}";

export const DEFAULT_CERTIFICATE_HTML = `
<p>Hello {{participantName}},</p>
<p>Thank you for participating in <strong>{{eventName}}</strong>.</p>
<p>Your participation certificate is attached to this email.</p>
<p>We hope to see you again in our upcoming events.</p>
<p><strong>Association of Computer Engineers (ACE)</strong></p>
`.trim();
