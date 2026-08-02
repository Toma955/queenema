import { useAdminChat } from "./hooks/useAdminChat.js";
import AdminChat from "./components/AdminChat.jsx";
import AdminGate from "./components/AdminGate.jsx";

export default function App() {
  const chat = useAdminChat();

  return (
    <div className="admin-shell">
      {chat.user ? (
        <AdminChat
          user={chat.user}
          partner={chat.partner}
          messages={chat.messages}
          mode={chat.mode}
          error={chat.error}
          onSend={chat.send}
          onLeave={chat.leave}
          onClear={chat.clearChat}
          onSetMode={chat.setMode}
        />
      ) : (
        <AdminGate
          onEnter={chat.join}
          joining={chat.joining}
          error={chat.error}
        />
      )}
    </div>
  );
}
