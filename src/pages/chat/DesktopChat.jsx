import React, { useEffect, useState, useContext, useRef } from "react";
import axios from "../../api/axios";
import { PresenceContext } from "../../context/PresenceContext";
import {
  SendOutlined,
  PaperClipOutlined,
} from "@ant-design/icons";
import io from "socket.io-client";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import ContextMenu from "./ContextMenu";
import AttachmentRenderer from "./AttachmentRenderer";
import { uploadFile } from "../../utils/fileStorage";
import UserList from "./UserList";
import "./chat.css";
import chat from "./chat.png";

dayjs.extend(relativeTime);

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";
const socket = io(SOCKET_URL, { transports: ["websocket"], reconnection: true });

export default function DesktopChat() {
  const loggedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const { presenceMap } = useContext(PresenceContext);

  const [allUsers, setAllUsers] = useState([]);
  const [users, setUsers] = useState([]); // Filtered & Sorted Users
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [typingUsers, setTypingUsers] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [previewZoom, setPreviewZoom] = useState(false);
  const [unreadMap, setUnreadMap] = useState({});
  const [menu, setMenu] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // 🔥 global zoom for bubble images
  const [zoomImage, setZoomImage] = useState(null);

  const longPressTimer = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!loggedUser?._id) return;
    socket.emit("join_room", loggedUser._id);
    loadInitialUnreadCounts();
  }, [loggedUser?._id]);

  const scrollToBottom = () =>
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 120);

  const loadInitialUnreadCounts = async () => {
    if (!loggedUser?._id) return;
    try {
      const res = await axios.get(`/api/chat/unread-counts?userId=${loggedUser._id}`);
      setUnreadMap(res.data || {});
    } catch (err) {
      console.error("Failed to load unread counts", err);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await axios.get(`/api/users/chat/list?userId=${loggedUser._id}`);
      setAllUsers(res.data || []);
    } catch (err) {
      console.error("load users:", err);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // SORT + FILTER USERS LOGIC (Parent Component-லேயே இருப்பது நல்லது)
  useEffect(() => {
    let list = allUsers;

    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      list = list.filter((u) => u.name?.toLowerCase().includes(lower));
    }

    list = list.sort((a, b) => {
      const unreadA = unreadMap[a._id] || 0;
      const unreadB = unreadMap[b._id] || 0;

      if (unreadB !== unreadA) return unreadB - unreadA;

      const lastA = new Date(a.lastMessageAt || a.lastActiveAt || 0);
      const lastB = new Date(b.lastMessageAt || b.lastActiveAt || 0);

      return lastB - lastA;
    });

    setUsers(list);
  }, [allUsers, unreadMap, searchTerm]);

  const loadMessages = async (otherUserId) => {
    try {
      if (!loggedUser?._id || !otherUserId) return;

      await axios.post("/api/chat/read", {
        from: otherUserId,
        to: loggedUser._id
      });

      const res = await axios.get(`/api/chat/${loggedUser._id}/${otherUserId}`);
      setMessages(res.data || []);

      setSelectedIds([]);
      scrollToBottom();

      setUnreadMap((prev) => ({ ...prev, [otherUserId]: 0 }));

      socket.emit("mark_read", { from: loggedUser._id, to: otherUserId });
    } catch (err) {
      console.error("load messages", err);
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
    if (!activeUser) return;

    let attachments = [];

    if (attachmentFile) {
      try {
        const uploaded = await uploadFile(attachmentFile);
        if (uploaded) attachments = [uploaded];
        else return alert("File upload failed.");
      } catch (e) {
        alert("File upload failed.");
        return;
      }
    }

    try {
      const payload = {
        from: loggedUser._id,
        to: activeUser._id,
        text: text.trim(),
        attachments
      };

      const res = await axios.post("/api/chat", payload);
      const saved = res.data;

      setMessages((prev) => [...prev, saved]);
      setText("");

      setAttachmentFile(null);
      if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);
      setAttachmentPreview(null);

      setPreviewZoom(false);
      scrollToBottom();

      socket.emit("send_message", saved);
    } catch (err) {
      alert("Failed to send.");
    }
  };

  const deleteMessage = async (id) => {
    try {
      await axios.delete(`/api/chat/${id}`);
      setMessages((prev) => prev.filter((m) => m._id !== id));
      setSelectedIds((p) => p.filter((x) => x !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const deleteForEveryone = async (id) => {
    try {
      await axios.post("/api/chat/delete-for-everyone", { id });
      setMessages((prev) => prev.filter((m) => m._id !== id));
      socket.emit("delete_everyone", id);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteMultiple = async () => {
    if (!selectedIds.length) return;

    try {
      await axios.post("/api/chat/delete-multiple", { ids: selectedIds });

      setMessages((prev) => prev.filter((m) => !selectedIds.includes(m._id)));
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
    }
  };

  const openChat = (u) => {
    setActiveUser(u);
    loadMessages(u._id);
  };

  const formatTime = (d) => (d ? dayjs(d).format("hh:mm A") : "");

  const onRightClick = (e, msg) => {
    e.preventDefault();
    setMenu({ visible: true, x: e.clientX, y: e.clientY, msg });
  };

  const startLongPress = (e, msg) => {
    clearTimeout(longPressTimer.current);
    const cx = e.touches?.[0]?.clientX || e.clientX;
    const cy = e.touches?.[0]?.clientY || e.clientY;
    longPressTimer.current = setTimeout(
      () => setMenu({ visible: true, x: cx, y: cy, msg }),
      600
    );
  };

  const cancelLongPress = () => clearTimeout(longPressTimer.current);

  // SOCKET EVENTS
  useEffect(() => {
    socket.off("new_message");
    socket.off("typing");
    socket.off("message_deleted_for_everyone");
    socket.off("messages_read");

    socket.on("new_message", (data) => {
      const isRelated =
        (data.from === activeUser?._id && data.to === loggedUser._id) ||
        (data.to === activeUser?._id && data.from === loggedUser._id) ||
        data.to === loggedUser._id;

      if (!isRelated) return;

      if (data.to === loggedUser._id) {
        if (!activeUser || activeUser._id !== data.from) {
          setUnreadMap((p) => ({
            ...p,
            [data.from]: (p[data.from] || 0) + 1
          }));
        } else {
          axios.post("/api/chat/read", { from: data.from, to: data.to }).catch(() => { });
        }
      }

      setMessages((prev) =>
        prev.some((m) => String(m._id) === String(data._id)) ? prev : [...prev, data]
      );
      scrollToBottom();
    });

    socket.on("typing", ({ from }) => {
      setTypingUsers((prev) => ({ ...prev, [from]: true }));
      setTimeout(() => {
        setTypingUsers((prev) => {
          const obj = { ...prev };
          delete obj[from];
          return obj;
        });
      }, 1500);
    });

    socket.on("message_deleted_for_everyone", ({ id }) => {
      setMessages((prev) => prev.filter((m) => m._id !== id));
    });

    socket.on("messages_read", () => {
      if (activeUser) {
        setMessages((prev) =>
          prev.map((m) => (m.from === loggedUser._id ? { ...m, read: true } : m))
        );
      }
    });

    return () => {
      socket.off("new_message");
      socket.off("typing");
      socket.off("message_deleted_for_everyone");
      socket.off("messages_read");
    };
  }, [activeUser, loggedUser._id]);

  return (
    <div className="chat-container">
      {/* 🔥 இங்கே தனியாகப் பிரிக்கப்பட்ட UserList-ஐ பயன்படுத்துகிறோம் */}
      <UserList
        users={users}
        activeUser={activeUser}
        onUserSelect={openChat}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        unreadMap={unreadMap}
        presenceMap={presenceMap}
        selectedIds={selectedIds}
        onDeleteMultiple={deleteMultiple}
      />

      {/* CHAT PANEL */}
      <div className="chat-panel">
        <div className="chat-header">
          {activeUser ? (
            <>
              {/* 1. Profile Image/Avatar */}
              <div className="active-user-avatar">
                {activeUser.profileImage ? (
                  <img
                    src={activeUser.profileImage}
                    alt={`${activeUser.name}'s avatar`}
                    className="active-profile-image"
                  />
                ) : (
                  // Fallback to initial letter
                  activeUser.name?.charAt(0)
                )}
              </div>
              {/* 2. User Name */}
              👋 {activeUser.name}
            </>
          ) : (
            // State when no user is selected
            <>👋 Select a user</>
          )}
        </div>

        {!activeUser && (
          <div className="empty-state">
            <img src={chat} className="empty-image" alt="chat" />
            <h2 className="empty-title">Select a user to start chatting</h2>
            <p className="empty-sub">Your messages will appear here</p>
          </div>
        )}

        {activeUser && (
          <>
            <div className="chat-body">
              {messages.map((msg) => {
                const mine = String(msg.from) === String(loggedUser._id);
                const attachment = msg.attachments?.[0];

                return (
                  <div
                    key={msg._id}
                    className={`bubble-row ${mine ? "right" : "left"} ${selectedIds.includes(msg._id) ? "selected" : ""
                      }`}
                    onContextMenu={(e) => onRightClick(e, msg)}
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

                      {(msg.text || !attachment) && <div>{msg.text}</div>}

                      <div className="msg-status-footer">
                        <div className="time">{formatTime(msg.sentAt)}</div>

                        {mine && (
                          <div
                            className={`read-indicator ${msg.read ? "read" : "delivered"
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

            <div className="typing-row">
              {typingUsers[activeUser._id] && (
                <span className="typing">✍️ {activeUser.name} typing...</span>
              )}
            </div>

            {/* PREVIEW BOX */}
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

            {/* SEND BOX */}
            <div className="send-box">
              <input
                type="file"
                id="attachment"
                style={{ display: "none" }}
                onChange={onFileChange}
              />

              <label htmlFor="attachment" className="attach-btn">
                <PaperClipOutlined /> {attachmentFile ? attachmentFile.name : ""}
              </label>

              <input
                type="text"
                placeholder="Type a message..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                disabled={!!attachmentFile}
              />

              <button
                className="send-btn"
                onClick={sendMessage}
                disabled={!text.trim() && !attachmentFile}
              >
                <SendOutlined />
              </button>
            </div>
          </>
        )}
      </div>

      {/* CONTEXT MENU */}
      {menu?.visible && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          msg={menu.msg}
          onClose={() => setMenu(null)}
          onDeleteMe={() => {
            deleteMessage(menu.msg._id);
            setMenu(null);
          }}
          onDeleteEveryone={() => {
            deleteForEveryone(menu.msg._id);
            setMenu(null);
          }}
        />
      )}

      {/* FULLSCREEN ZOOM MODAL FOR BUBBLE IMAGES */}
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