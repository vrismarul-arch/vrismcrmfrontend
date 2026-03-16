import React, { useEffect, useState, useContext, useRef } from "react";
import axios from "../../api/axios";
import { PresenceContext } from "../../context/PresenceContext";
import { SendOutlined, PaperClipOutlined } from "@ant-design/icons";
import io from "socket.io-client";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import MobileContextMenu from "./MobileContextMenu";
import AttachmentRenderer from "./AttachmentRenderer";
import { uploadFile } from "../../utils/fileStorage";
import MobileUserList from "./MobileUserList"; // 🔥 New Import
import "./chat.css";
import chat from "./chat.png";

dayjs.extend(relativeTime);

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:1001";
const socket = io(SOCKET_URL, { transports: ["websocket"], reconnection: true });

export default function MobileChat() {
  const loggedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const { presenceMap } = useContext(PresenceContext);

  const [tab, setTab] = useState("chats");
  const [allUsers, setAllUsers] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [typingUsers, setTypingUsers] = useState({});
  const [unreadMap, setUnreadMap] = useState({});
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [previewZoom, setPreviewZoom] = useState(false);

  // ⭐ NEW — Fullscreen zoom for bubble images
  const [zoomImage, setZoomImage] = useState(null);

  const [mobileMenu, setMobileMenu] = useState({ visible: false, msg: null });

  const bottomRef = useRef(null);
  const longPressTimer = useRef(null);

  useEffect(() => {
    if (!loggedUser?._id) return;
    socket.emit("join_room", loggedUser._id);
    loadInitialUnreadCounts();
    loadAllUsers();
  }, [loggedUser?._id]);

  const scrollToBottom = () =>
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 120);

  const loadInitialUnreadCounts = async () => {
    try {
      const res = await axios.get(`/api/chat/unread-counts?userId=${loggedUser._id}`);
      setUnreadMap(res.data || {});
    } catch (err) {
      console.error("Failed to load unread", err);
    }
  };

  const loadAllUsers = async () => {
    try {
      const res = await axios.get(`/api/users/chat/list?userId=${loggedUser._id}`);
      setAllUsers(res.data || []);
    } catch (err) {
      console.error("load users:", err);
    }
  };

  // Filter + sort users
  const sortedAndFilteredUsers = React.useMemo(() => {
    let list = allUsers;

    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      list = list.filter((u) => u.name?.toLowerCase().includes(lower));
    }

    return list.sort((a, b) => {
      const unreadA = unreadMap[a._id] || 0;
      const unreadB = unreadMap[b._id] || 0;
      if (unreadB !== unreadA) return unreadB - unreadA;

      const lastA = new Date(a.lastMessageAt || a.lastActiveAt || 0);
      const lastB = new Date(b.lastMessageAt || b.lastActiveAt || 0);
      return lastB - lastA;
    });
  }, [allUsers, unreadMap, searchTerm]);

  const openChat = async (u) => {
    setActiveUser(u);
    setTab("chat");

    try {
      await axios.post("/api/chat/read", { from: u._id, to: loggedUser._id });
      const res = await axios.get(`/api/chat/${loggedUser._id}/${u._id}`);
      setMessages(res.data || []);

      scrollToBottom();
      setUnreadMap((prev) => ({ ...prev, [u._id]: 0 }));
      socket.emit("mark_read", { from: loggedUser._id, to: u._id });
    } catch (err) {
      console.error(err);
    }
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAttachmentFile(file);
    setAttachmentPreview(URL.createObjectURL(file));
    setPreviewZoom(false);
  };

  const sendMessage = async () => {
    if (!text.trim() && !attachmentFile) return;

    let attachments = [];
    if (attachmentFile) {
      try {
        const uploaded = await uploadFile(attachmentFile);
        attachments = uploaded ? [uploaded] : [];
      } catch {
        alert("Upload failed");
        return;
      }
    }

    try {
      const payload = {
        from: loggedUser._id,
        to: activeUser._id,
        text: text.trim(),
        attachments,
      };

      const res = await axios.post("/api/chat", payload);
      const saved = res.data;

      setMessages((prev) => [...prev, saved]);
      setText("");

      if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);

      setAttachmentPreview(null);
      setAttachmentFile(null);
      setPreviewZoom(false);

      scrollToBottom();
      socket.emit("send_message", saved);
    } catch (err) {
      console.error("send message:", err);
    }
  };

  // SOCKET LISTENERS
  useEffect(() => {
    socket.on("new_message", (data) => {
      const isRelated =
        data.from === activeUser?._id ||
        data.to === activeUser?._id ||
        data.to === loggedUser._id;

      if (!isRelated) return;

      setMessages((prev) =>
        prev.some((m) => m._id === data._id) ? prev : [...prev, data]
      );
      scrollToBottom();
    });

    socket.on("typing", ({ from }) => {
      setTypingUsers((prev) => ({ ...prev, [from]: true }));
      setTimeout(() => {
        setTypingUsers((p) => {
          const copy = { ...p };
          delete copy[from];
          return copy;
        });
      }, 1500);
    });

    return () => {
      socket.off("new_message");
      socket.off("typing");
    };
  }, [activeUser, loggedUser._id]);

  // Long press menu
  const startLongPress = (e, msg) => {
    clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(
      () => setMobileMenu({ visible: true, msg }),
      450
    );
  };
  const cancelLongPress = () => clearTimeout(longPressTimer.current);

  const formatTime = (d) => dayjs(d).format("hh:mm A");

  // --------------------------
  // CHAT VIEW
  // --------------------------
  const renderChatView = () => (
    <div className="mobile-chat-view">
      <div className="mobile-chat-header">
        <button
          className="back-btn"
          onClick={() => {
            setTab("chats");
            setActiveUser(null);

            if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);

            setAttachmentPreview(null);
            setAttachmentFile(null);
            setPreviewZoom(false);
          }}
        >
          ←
        </button>

        <div className="mobile-title">💬 {activeUser?.name}</div>
      </div>

      <div className="chat-body mobile-chat-body">
        {messages.map((msg) => {
          const mine = msg.from === loggedUser._id;
          const attachment = msg.attachments?.[0];

          return (
            <div
              key={msg._id}
              className={`bubble-row ${mine ? "right" : "left"}`}
              onTouchStart={(e) => startLongPress(e, msg)}
              onTouchEnd={cancelLongPress}
              onTouchMove={cancelLongPress}
            >
              <div className={`bubble ${mine ? "me" : "them"}`}>
                {attachment && (
                  <AttachmentRenderer
                    attachment={attachment}
                    onZoom={(imgUrl) => setZoomImage(imgUrl)}
                  />
                )}

                {msg.text && <div>{msg.text}</div>}

                <div className="msg-status-footer">
                  <div className="time">{formatTime(msg.sentAt)}</div>
                  {mine && (
                    <div
                      className={`read-indicator ${
                        msg.read ? "read" : "delivered"
                      }`}
                    >
                      {msg.read ? "✓✓" : "✓"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* ⭐ PREVIEW IMAGE + ZOOM */}
      {attachmentPreview && (
        <div className="preview-box">
          <img
            src={attachmentPreview}
            className="preview-image"
            onClick={() => setPreviewZoom(true)}
            alt="preview"
          />

          {previewZoom && (
            <div className="zoom-modal" onClick={() => setPreviewZoom(false)}>
              <img src={attachmentPreview} className="zoom-image" alt="zoom" />
            </div>
          )}

          <button
            className="preview-remove"
            onClick={() => {
              if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);
              setAttachmentFile(null);
              setAttachmentPreview(null);
              setPreviewZoom(false);
            }}
          >
            ✖
          </button>
        </div>
      )}

      {/* ⭐ MESSAGE INPUT */}
      <div className="send-box mobile-send">
        <input
          type="file"
          id="attachment-m"
          style={{ display: "none" }}
          onChange={onFileChange}
        />

        <label htmlFor="attachment-m" className="attach-btn">
          <PaperClipOutlined /> {attachmentFile ? attachmentFile.name : ""}
        </label>

        <input
          type="text"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!!attachmentFile}
        />

        <button className="send-btn" onClick={sendMessage}>
          <SendOutlined />
        </button>
      </div>
    </div>
  );

  return (
    <div className="mobile-shell">
      <div className="top-chat-icon">
        <a href="/chat">
          <img src={chat} className="chaticon" alt="icon" />
        </a>
      </div>

      <div className="mobile-content">
        {/* 🔥 இங்கே பிரித்து எடுக்கப்பட்ட Component பயன்படுத்தப்பட்டுள்ளது */}
        {tab === "chats" && (
          <MobileUserList
            users={sortedAndFilteredUsers}
            onUserSelect={openChat}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            unreadMap={unreadMap}
            presenceMap={presenceMap}
          />
        )}
        {tab === "chat" && renderChatView()}
      </div>

      <MobileContextMenu
        visible={mobileMenu.visible}
        msg={mobileMenu.msg}
        onClose={() => setMobileMenu({ visible: false, msg: null })}
        onCopy={() => {
          navigator.clipboard.writeText(mobileMenu.msg?.text || "");
          setMobileMenu({ visible: false, msg: null });
        }}
        onDeleteMe={() => {
          axios.delete(`/api/chat/${mobileMenu.msg._id}`).then(() => {
            setMessages((prev) =>
              prev.filter((m) => m._id !== mobileMenu.msg._id)
            );
            setMobileMenu({ visible: false, msg: null });
          });
        }}
        onDeleteEveryone={() => {
          axios
            .post("/api/chat/delete-for-everyone", { id: mobileMenu.msg._id })
            .then(() => {
              setMessages((prev) =>
                prev.filter((m) => m._id !== mobileMenu.msg._id)
              );
              setMobileMenu({ visible: false, msg: null });
            });
        }}
      />

      {/* ⭐ FULLSCREEN ZOOM FOR CHAT IMAGES */}
      {zoomImage && (
        <div className="zoom-modal" onClick={() => setZoomImage(null)}>
          <img
            src={zoomImage}
            className="zoom-image"
            onClick={(e) => e.stopPropagation()}
            alt="zoom"
          />
        </div>
      )}
    </div>
  );
}