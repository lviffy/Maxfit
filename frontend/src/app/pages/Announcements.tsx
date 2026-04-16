import DashboardLayout from '../components/DashboardLayout';
import { Megaphone, Plus, Bell, Calendar as CalIcon, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Notice {
  id: number;
  title: string;
  content: string;
  date: string;
  author: string;
  important: boolean;
}

export default function Announcements() {
  const { user } = useAuth();
  const isAdminOrOwner = user?.role === 'admin' || user?.role === 'owner';

  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New Announcement Form State
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
      if (res.data && res.data.announcements) {
        setNotices(res.data.announcements);
      }
    } catch (err) {
      console.error("Failed to fetch announcements:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;

    try {
      setSubmitting(true);
      await api.post('/api/announcements', { title, content, important });
      
      // Reset form and close modal
      setTitle('');
      setContent('');
      setImportant(false);
      setShowModal(false);
      
      // Refresh list
      fetchAnnouncements();
    } catch (err) {
      console.error("Failed to create announcement:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="Notice & Announcements">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground">View important announcements, schedules, and events.</p>
          
          {isAdminOrOwner && (
            <button 
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="font-medium">New Announcement</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : notices.length === 0 ? (
          <div className="text-center p-12 bg-card border border-border rounded-xl">
             <Megaphone className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
             <p className="text-lg font-medium">No Announcements Yet</p>
             <p className="text-muted-foreground">Check back later for updates and notices.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {notices.map((notice, i) => (
              <motion.div
                key={notice.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-6 bg-card border border-border rounded-xl hover:shadow-md transition-all relative overflow-hidden"
              >
                {notice.important && (
                  <div className="absolute top-0 right-0 w-2 h-full bg-red-500" />
                )}
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-full ${notice.important ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}`}>
                    {notice.important ? <Bell className="w-6 h-6" /> : <Megaphone className="w-6 h-6" />}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      {notice.title}
                      {notice.important && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-500 uppercase">
                          Important
                        </span>
                      )}
                    </h3>
                    <p className="text-muted-foreground mt-2 whitespace-pre-wrap">{notice.content}</p>
                    <div className="flex items-center gap-4 mt-4 text-sm text-sidebar-foreground/60">
                      <div className="flex items-center gap-1">
                        <CalIcon className="w-4 h-4" />
                        {notice.date}
                      </div>
                      <div>By {notice.author}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Creation Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
                  <Megaphone className="w-5 h-5" />
                  Post Announcement
                </h3>
                <button 
                  onClick={() => setShowModal(false)}
                  className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateAnnouncement} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <input 
                    required 
                    type="text" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Schedule Change for Holidays"
                    className="w-full px-4 py-2 border rounded-lg bg-input border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Message Content</label>
                  <textarea 
                    required 
                    rows={4}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Provide details for everyone..."
                    className="w-full px-4 py-2 border rounded-lg bg-input border-border focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input 
                    type="checkbox" 
                    id="important"
                    checked={important}
                    onChange={(e) => setImportant(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary" 
                  />
                  <label htmlFor="important" className="text-sm font-medium cursor-pointer">
                    Mark as Important (Flags with red icon)
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-border">
                  <button 
                    type="button" 
                    onClick={() => setShowModal(false)} 
                    className="px-6 py-2 rounded-lg border border-border hover:bg-muted font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="px-6 py-2 flex items-center gap-2 rounded-lg bg-primary text-white hover:bg-primary/90 font-medium transition-colors disabled:opacity-50"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {submitting ? 'Posting...' : 'Publish'}
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
