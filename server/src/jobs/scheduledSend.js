const cron = require('node-cron');
const supabase = require('../supabase');

// Reuse the transporter factory from emailController
const { _getTransporter: getTransporter, _getFullUser: getFullUser } = require('../controllers/emailController');

// Run every minute to check for scheduled emails
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date().toISOString();

    const { data: scheduled, error } = await supabase
      .from('emails')
      .select('*')
      .eq('is_scheduled', true)
      .eq('folder', 'drafts')
      .lte('scheduled_at', now);

    if (error || !scheduled || scheduled.length === 0) return;

    console.log(`⏰ Found ${scheduled.length} scheduled email(s) to send`);

    for (const email of scheduled) {
      try {
        // Get full user record (with tokens) for OAuth/SMTP transporter
        const user = await getFullUser(email.user_id);
        if (!user) {
          console.error(`❌ Scheduled send: User ${email.user_id} not found, skipping email ${email.id}`);
          continue;
        }

        const transporter = await getTransporter(user);

        const toAddresses = (email.to_addresses || []).map(t => t.address || t).join(', ');
        const ccAddresses = (email.cc || []).map(t => t.address || t).join(', ');

        await transporter.sendMail({
          from: `"${user.name}" <${user.email}>`,
          to: toAddresses,
          cc: ccAddresses || undefined,
          subject: email.subject,
          html: email.body_html,
          text: email.body_text,
        });

        // Move to sent folder
        await supabase
          .from('emails')
          .update({ is_scheduled: false, scheduled_at: null, folder: 'sent' })
          .eq('id', email.id);

        console.log(`✅ Scheduled email sent: "${email.subject}" to ${toAddresses}`);
      } catch (sendErr) {
        console.error(`❌ Failed to send scheduled email ${email.id}: ${sendErr.message}`);
      }
    }
  } catch (err) {
    console.error('Scheduled send job error:', err.message);
  }
});

console.log('⏰ Scheduled send job started (checks every minute)');
