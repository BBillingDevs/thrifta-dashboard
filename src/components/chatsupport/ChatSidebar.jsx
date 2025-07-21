// src/components/ChatSidebar.jsx
import React, { useEffect, useState } from "react";
import {
    collection,
    onSnapshot,
    query,
    where,
    orderBy,
} from "firebase/firestore";
import { db } from "../../firebase";

const ADMIN_UID = "HFhMEeJg7GdNCl4atA2YJTlAKsF2";
const ADMIN_ALIAS = "Thrifta Admin";
const ADMIN_EMAIL = "no-reply@thrifta.app";
export default function ChatSidebar({ onSelect, activeUserId }) {
    const [threads, setThreads] = useState([]);

    useEffect(() => {
        const q = query(
            collection(db, "chat_rooms"),
            where("userIds", "array-contains", ADMIN_UID),
            orderBy("lastMessageTime", "desc"),
        );

        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map((d) => {
                const doc = d.data();
                const otherUserId =
                    (doc.userIds || []).filter((uid) => uid !== ADMIN_UID)[0] ?? "";

                return {
                    id: d.id,
                    otherUserId,
                    lastMessage: doc.lastMessage,
                    lastMessageTime: doc.lastMessageTime?.toDate(),
                    unread: doc.unreadCount?.[ADMIN_UID] ?? 0,
                };
            });
            setThreads(data);
        });

        return unsub;
    }, []);

    return (
        <aside className="w-64 border-r overflow-y-auto">
            <h2 className="p-4 text-lg font-semibold">Conversations</h2>
            {threads.map((t) => (
                <button
                    key={t.id}
                    onClick={() => onSelect(t.otherUserId)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${t.otherUserId === activeUserId ? "bg-gray-100" : ""
                        }`}
                >
                    <p className="font-medium truncate">{t.otherUserId}</p>
                    <p className="text-xs text-gray-500 truncate">{t.lastMessage}</p>
                    {t.unread > 0 && (
                        <span className="inline-block mt-1 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full">
                            {t.unread}
                        </span>
                    )}
                </button>
            ))}
        </aside>
    );
}
