import DashboardLayout from '../components/DashboardLayout';
import { Megaphone, Plus, Bell, Calendar as CalIcon, X, Loader2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface Notice {
  id: number;
  title: string;
  content: string;
  created_at: string;
  author: string;
  author_role: string;
  important: boolean;
}

const roleColors: Record<string, string> = {
  owner: 'bg-purple-500/10 text-purple-500',
  admin: 'bg-blue-500/10 text-blue-500',
  trainer: 'bg-green-500/10 text-green-500',
};

export default function Announcements() {
  const { user } = useAuth();
  const canPost = ['admin', 'owner', 'trainer'].includes(user?.role || '');
  const canDelete = ['admin', 'owner'].includes(user?.role || '');

  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [important, setImportant] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/announcements');
      setNotices(res.data?.announcements || []);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to fetch announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    try {
      setSubmitting(true);
      await api.post('/api/announcements', { title, content, important });
      toast.success('Announcement published!');
      setTitle('');
      setContent('');
      setImportant(false);
      setShowModal(false);
      fetchAnnouncements();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to post announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      setDeleting(id);
      await api.delete(`/api/announcements/${id}`);
      toast.success('Announcement deleted');
      fetchAnnouncements();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <DashboardLayout title="Announcements">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <Megaphone className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">Notice Board</h2>
              <p className="text-sm text-muted-foreground">
                Important announcements, schedule changes, and gym updates visible to all.
              </p>
            </div>
          </div>
          {canPost && (
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New Announcement
            </button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : notices.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card py-16">
            <Megaphone className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-lg font-medium">No Announcements Yet</p>
            <p className="text-sm text-muted-foreground">Check back later for updates and notices.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {notices.map((notice, i) => (
              <motion.div
                key={notice.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`relative overflow-hidden rounded-2xl border bg-card p-6 transition-shadow hover:shadow-md ${
                  notice.important ? 'border-red-500/30' : 'border-border'
                }`}
              >
                {notice.important && (
                  <div className="absolute right-0 top-0 h-full w-1.5 bg-red-500" />
                )}
                <div className="flex items-start gap-4">
                  <div className={`rounded-full p-3 ${notice.important ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}`}>
                    {notice.important ? <Bell className="h-5 w-5" /> : <Megaphone className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{notice.title}</h3>
                      {notice.important && (
                        <span className="rounded bg-red-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-red-500">
                          Important
                        </span>
                      )}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{notice.content}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <CalIcon className="h-3.5 w-3.5" />
                        {String(notice.created_at).split('T')[0]}
                      </div>
                      <div>By <span className="font-medium text-foreground">{notice.author}</span></div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${roleColors[notice.author_role] || 'bg-muted text-muted-foreground'}`}>
                        {notice.author_role}
                      </span>
                    </div>
                  </div>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(notice.id)}
                      disabled={deleting === notice.id}
                      className="ml-2 rounded-lg p-2 text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                      title="Delete announcement"
                    >
                      {deleting === notice.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-border p-6">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-primary">
                  <Megaphone className="h-5 w-5" />
                  Post Announcement
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4 p-6">
                <label className="block space-y-2">
                  <span className="text-sm text-muted-foreground">Title</span>
                  <input
                    required
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Holiday Schedule Change"
                    className="w-full rounded-xl border border-border bg-input px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm text-muted-foreground">Message</span>
                  <textarea
                    required
                    rows={4}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Provide details for all members and staff..."
                    className="w-full resize-none rounded-xl border border-border bg-input px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </label>

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-muted/20 p-4">
                  <input
                    type="checkbox"
                    checked={important}
                    onChange={(e) => setImportant(e.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                  <div>
                    <p className="text-sm font-medium">Mark as Important</p>
                    <p className="text-xs text-muted-foreground">Adds red highlight and bell icon</p>
                  </div>
                </label>

                <div className="flex justify-end gap-3 border-t border-border pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="rounded-xl border border-border px-5 py-3 text-sm transition-colors hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {submitting ? 'Publishing...' : 'Publish'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
