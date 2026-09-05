import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Send } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export function Chat() {
  const { selectedBooking, chatMessages, sendMessage, navigate } = useAppStore();
  const [text, setText] = useState('');
  const messagesRef = useRef<HTMLDivElement>(null);

  const bookingMessages = chatMessages.filter((m) => m.id !== '' && selectedBooking && m.bookingId === selectedBooking.id);

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' });
  }, [bookingMessages.length]);

  if (!selectedBooking) { navigate('bookings'); return null; }

  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage(selectedBooking.id, 'client', text.trim());
    setText('');
    setTimeout(() => {
      sendMessage(selectedBooking.id, 'worker', 'Thank you for your message! I will get back to you shortly.');
    }, 1500);
  };

  return (
    <main className="container page-main chat-page">
      <button className="text-button back-link" onClick={() => navigate('tracking')}><ChevronLeft size={17} /> Back to Tracking</button>
      <div className="chat-container">
        <div className="chat-header">
          <div className="worker-photo small"><img src={selectedBooking.workerImage} alt={selectedBooking.workerName} /></div>
          <div><h3>{selectedBooking.workerName}</h3><span className="chat-status">● Online</span></div>
        </div>
        <div className="chat-messages" ref={messagesRef}>
          {bookingMessages.map((msg) => (
            <div key={msg.id} className={`chat-bubble ${msg.sender === 'client' ? 'mine' : 'theirs'}`}>
              <p>{msg.text}</p>
              <small>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
            </div>
          ))}
        </div>
        <div className="chat-input-bar">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..." onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }} />
          <button className="primary-button" onClick={handleSend} disabled={!text.trim()}><Send size={18} /></button>
        </div>
      </div>
    </main>
  );
}
