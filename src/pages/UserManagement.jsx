// src/pages/UserManagement.jsx
import React, { useEffect, useState, useRef } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  addDoc,
  setDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { db } from "../firebase";
import { sendNotificationToUser } from "../utils/notifications";

const ADMIN_UID = "HFhMEeJg7GdNCl4atA2YJTlAKsF2";
const ADMIN_ALIAS = "Admin";
const ADMIN_EMAIL = "no-reply@yourapp.com";

async function deleteQueryBatch(q, batchSize = 200) {
  const snap = await getDocs(q);
  if (snap.empty) return;
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  if (snap.size >= batchSize) {
    return deleteQueryBatch(q, batchSize);
  }
}

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyUid, setBusyUid] = useState(null);
  const [search, setSearch] = useState("");

  // chat panel
  const [chatUserId, setChatUserId] = useState(null);
  const [chatThreads, setChatThreads] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);

  // notification modal
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifUserId, setNotifUserId] = useState(null);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");

  // message modal
  const [showMsgModal, setShowMsgModal] = useState(false);
  const [msgUserId, setMsgUserId] = useState(null);
  const [msgText, setMsgText] = useState("");

  /* ───────── load users ───────── */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  /* ───────── load chat threads ───────── */
  useEffect(() => {
    if (!chatUserId) {
      setChatThreads([]);
      setActiveChatId(null);
      return;
    }
    const q = query(
      collection(db, "chat_rooms"),
      where("userIds", "array-contains", chatUserId),
      orderBy("lastMessageTime", "desc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      const threads = snap.docs.map((d) => {
        const data = d.data();
        const other = data.userIds.find((id) => id !== chatUserId);
        return { id: d.id, otherUserId: other, lastMessage: data.lastMessage };
      });
      setChatThreads(threads);
      setActiveChatId(threads[0]?.id ?? null);
    });
    return unsub;
  }, [chatUserId]);

  /* ───────── send a chat message ───────── */
  const sendChat = async (toUserId, text) => {
    const roomId = [ADMIN_UID, toUserId].sort().join("_");
    const roomRef = doc(db, "chat_rooms", roomId);

    // 1) add message
    await addDoc(collection(db, "chat_rooms", roomId, "messages"), {
      senderID: ADMIN_UID,
      senderName: ADMIN_ALIAS,
      senderEmail: ADMIN_EMAIL,
      receiverID: toUserId,
      message: text,
      timestamp: serverTimestamp(),
      read: false,
    });

    // 2) update or create room meta
    const snap = await getDoc(roomRef);
    if (snap.exists()) {
      await updateDoc(roomRef, {
        lastMessage: text,
        lastMessageTime: serverTimestamp(),
        [`unreadCount.${toUserId}`]: increment(1),
      });
    } else {
      await setDoc(roomRef, {
        createdAt: serverTimestamp(),
        userIds: [ADMIN_UID, toUserId],
        lastMessage: text,
        lastMessageTime: serverTimestamp(),
        unreadCount: { [ADMIN_UID]: 1, [toUserId]: 1 },
      });
    }
  };

  /* ───────── delete user & related ───────── */
  const deleteUserCompletely = async (uid) => {
    if (
      !window.confirm(
        "Permanently delete user, their products, favorites, chats & messages?",
      )
    )
      return;

    setBusyUid(uid);

    // products
    await deleteQueryBatch(
      query(collection(db, "products"), where("sellerId", "==", uid)),
    );
    // favorites
    await deleteDoc(doc(db, "favorites", uid)).catch(() => {});
    // chat rooms
    const rooms = await getDocs(
      query(
        collection(db, "chat_rooms"),
        where("userIds", "array-contains", uid),
      ),
    );
    for (const r of rooms.docs) {
      await deleteQueryBatch(collection(db, "chat_rooms", r.id, "messages"));
      await deleteDoc(r.ref);
    }
    // user doc
    await deleteDoc(doc(db, "users", uid));

    setBusyUid(null);
    alert("User & related data deleted.");
  };

  /* ───────── warning counter ───────── */
  const addWarning = (uid) => {
    updateDoc(doc(db, "users", uid), {
      warnings: (users.find((u) => u.uid === uid)?.warnings || 0) + 1,
    });
  };

  /* ───────── open/close modals ───────── */
  const openNotifModal = (uid) => {
    setNotifUserId(uid);
    setNotifTitle("");
    setNotifBody("");
    setShowNotifModal(true);
  };
  const openMsgModal = (uid) => {
    setMsgUserId(uid);
    setMsgText("");
    setShowMsgModal(true);
  };
  const closeNotif = () => setShowNotifModal(false);
  const closeMsg = () => setShowMsgModal(false);

  /* ───────── handle send ───────── */
  const handleSendNotif = async () => {
    if (!notifTitle.trim() || !notifBody.trim()) return;
    await sendNotificationToUser({
      userId: notifUserId,
      title: notifTitle.trim(),
      body: notifBody.trim(),
    });
    setShowNotifModal(false);
    alert("Notification sent.");
  };
  const handleSendMsg = async () => {
    if (!msgText.trim()) return;
    await sendChat(msgUserId, msgText.trim());
    setShowMsgModal(false);
    alert("Message sent.");
  };

  /* ───────── search filter ───────── */
  const term = search.trim().toLowerCase();
  const filtered = term
    ? users.filter(
        (u) =>
          u.uid.toLowerCase().includes(term) ||
          u.email?.toLowerCase().includes(term) ||
          u.displayName?.toLowerCase().includes(term),
      )
    : users;

  if (loading) return <p className="p-6">Loading users…</p>;

  return (
    <div className="p-8 relative">
      <h1 className="text-2xl font-semibold mb-6">User Management</h1>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by UID, name, or email..."
        className="border rounded px-3 py-2 mb-4 w-full max-w-sm"
      />

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left">
          <thead>
            <tr className="bg-gray-100 text-sm">
              <th className="border px-3 py-2">UID</th>
              <th className="border px-3 py-2">Name</th>
              <th className="border px-3 py-2">Email</th>
              <th className="border px-3 py-2">Warnings</th>
              <th className="border px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.uid} className="align-top">
                <td className="border px-3 py-2 text-xs">{u.uid}</td>
                <td className="border px-3 py-2 text-xs">
                  {u.displayName || "—"}
                </td>
                <td className="border px-3 py-2 text-xs">{u.email}</td>
                <td className="border px-3 py-2 text-center">
                  {u.warnings ?? 0}
                  <button
                    onClick={() => addWarning(u.uid)}
                    className="ml-2 text-[11px] px-1 py-0.5 bg-yellow-400 rounded"
                  >
                    +1
                  </button>
                </td>
                <td className="border px-3 py-2 space-y-1">
                  <button
                    onClick={() => openNotifModal(u.uid)}
                    className="block w-full px-2 py-1 bg-indigo-500 text-white rounded text-xs"
                  >
                    Send Notification
                  </button>
                  <button
                    onClick={() => openMsgModal(u.uid)}
                    className="block w-full px-2 py-1 bg-blue-500 text-white rounded text-xs"
                  >
                    Send Message
                  </button>
                  <button
                    onClick={() => setChatUserId(u.uid)}
                    className="block w-full px-2 py-1 bg-gray-700 text-white rounded text-xs"
                  >
                    View Chats
                  </button>
                  <button
                    onClick={() => deleteUserCompletely(u.uid)}
                    disabled={busyUid === u.uid}
                    className="block w-full px-2 py-1 bg-red-600 text-white rounded text-xs disabled:opacity-60"
                  >
                    {busyUid === u.uid ? "Deleting…" : "Delete User"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* chat panel */}
      {chatUserId && (
        <div className="mt-8">
          <div className="flex justify-between mb-2">
            <h2 className="text-xl font-semibold">Chats for {chatUserId}</h2>
            <button
              onClick={() => setChatUserId(null)}
              className="text-xs text-gray-500 hover:underline"
            >
              Close
            </button>
          </div>
          <div className="flex border rounded h-80 overflow-hidden">
            <aside className="w-1/3 border-r overflow-y-auto">
              {chatThreads.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveChatId(t.id)}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${
                    activeChatId === t.id ? "bg-gray-200" : ""
                  }`}
                >
                  <p className="font-medium">{t.otherUserId}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {t.lastMessage}
                  </p>
                </button>
              ))}
            </aside>
            <div className="flex-1">
              {activeChatId ? (
                <ChatViewer chatId={activeChatId} />
              ) : (
                <p className="p-4 text-sm text-gray-500">No chats selected.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notification Modal */}
      {showNotifModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Send Notification</h2>
            <input
              value={notifTitle}
              onChange={(e) => setNotifTitle(e.target.value)}
              placeholder="Title"
              className="w-full border rounded p-2 mb-3"
            />
            <textarea
              rows={4}
              value={notifBody}
              onChange={(e) => setNotifBody(e.target.value)}
              placeholder="Message"
              className="w-full border rounded p-2 mb-4 resize-y"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={closeNotif}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSendNotif}
                disabled={!notifTitle.trim() || !notifBody.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {showMsgModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Send Message</h2>
            <textarea
              rows={6}
              value={msgText}
              onChange={(e) => setMsgText(e.target.value)}
              placeholder="Type your chat message…"
              className="w-full border rounded p-2 mb-4 resize-y"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={closeMsg}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSendMsg}
                disabled={!msgText.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Read-only viewer for a single chat room’s messages */
function ChatViewer({ chatId }) {
  const [msgs, setMsgs] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!chatId) return;
    const q = query(
      collection(db, "chat_rooms", chatId, "messages"),
      orderBy("timestamp", "asc"),
    );
    const unsub = onSnapshot(q, (snap) =>
      setMsgs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    return unsub;
  }, [chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  return (
    <div className="h-full overflow-y-auto p-4 space-y-3 bg-white">
      {msgs.map((m) => (
        <div key={m.id} className="text-xs">
          <span className="font-medium">{m.senderID}:</span> {m.message}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
