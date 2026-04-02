const supabase = require('../supabase');

// GET /api/threads/:threadId
exports.getThread = async (req, res) => {
  try {
    const { data: thread, error } = await supabase
      .from('threads')
      .select('*')
      .eq('id', req.params.threadId)
      .eq('user_id', req.user.id)
      .single();

    if (error || !thread) return res.status(404).json({ message: 'Thread not found' });

    // Fetch associated emails
    let emails = [];
    if (thread.email_ids && thread.email_ids.length > 0) {
      const { data } = await supabase
        .from('emails')
        .select('*')
        .in('id', thread.email_ids)
        .order('created_at', { ascending: true });
      emails = (data || []).map(e => ({
        ...e,
        _id: e.id,
        from: e.from_address,
        to: e.to_addresses,
        bodyHtml: e.body_html,
        bodyText: e.body_text,
        isRead: e.is_read,
        isStarred: e.is_starred,
        createdAt: e.created_at,
      }));
    }

    res.json({
      thread: {
        ...thread,
        _id: thread.id,
        emailIds: emails,
        lastActivity: thread.last_activity,
        isRead: thread.is_read,
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
