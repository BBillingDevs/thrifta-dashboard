// src/components/ChatWindow.jsx
import React, { useEffect, useRef, useState } from "react";
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    addDoc,
    updateDoc,
    doc,
    serverTimestamp,
    increment,
} from "firebase/firestore";
import { db } from "../../firebase";
import getChatId from "../../utils/getChatId";

const ADMIN_UID = "HFhMEeJg7GdNCl4atA2YJTlAKsF2";
const ADMIN_ALIAS = "Thrifta Admin";
const ADMIN_EMAIL = "no-reply@thrifta.app";

export default function ChatWindow({ userId }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const bottomRef = useRef(null);

    useEffect(() => {
        if (!userId) return;
        const chatId = getChatId(ADMIN_UID, userId);
        const msgsQuery = query(
            collection(db, "chat_rooms", chatId, "messages"),
            orderBy("timestamp", "asc"),
        );

        const unsub = onSnapshot(msgsQuery, (snap) => {
            setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
            // mark all as read for admin
            updateDoc(doc(db, "chat_rooms", chatId), {
                [`unreadCount.${ADMIN_UID}`]: 0,
            });
        });

        return unsub;
    }, [userId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const send = async (e) => {
        e?.preventDefault();
        const text = input.trim();
        if (!text || !userId) return;

        const chatId = getChatId(ADMIN_UID, userId);
        const msg = {
            senderID: ADMIN_UID,
            senderEmail: ADMIN_EMAIL,
            receiverID: userId,
            message: text,
            timestamp: serverTimestamp(),
            read: false,
        };

        // 1) add message
        await addDoc(collection(db, "chat_rooms", chatId, "messages"), msg);

        // 2) bump the other user’s unread counter + update lastMessage
        await updateDoc(doc(db, "chat_rooms", chatId), {
            lastMessage: text,
            lastMessageTime: serverTimestamp(),
            [`unreadCount.${userId}`]: increment(1),
        });

        setInput("");
    };

    if (!userId) {
        return (
            <div className="flex flex-1 items-center justify-center">
                Select a conversation
            </div>
        );
    }

    return (
        <section className="flex flex-1 flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
                {messages.map((m) => (
                    <div
                        key={m.id}
                        className={`max-w-xs px-3 py-2 rounded ${m.senderID === ADMIN_UID
                                ? "ml-auto bg-blue-600 text-white"
                                : "bg-white border"
                            }`}
                    >
                        {m.message}
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            <form onSubmit={send} className="flex p-3 border-t bg-white">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1 border rounded px-3 py-2 mr-3"
                    placeholder="Type a message…"
                />
                <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-40"
                    disabled={!input.trim()}
                >
                    Send
                </button>
            </form>
        </section>
    );
}
