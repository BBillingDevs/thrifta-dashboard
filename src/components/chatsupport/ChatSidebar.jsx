import React, { useEffect, useState } from "react";
import {
    collection,
    onSnapshot,
    query,
    where,
    orderBy,
} from "firebase/firestore";
import { db } from "../../firebase";
import getChatId from "../../utils/getChatId";

const ADMIN_UID = "ADMIN_UID";

export default function ChatSidebar({ onSelect, activeUserId }) {
    const [threads, setThreads] = useState([]);

    useEffect(() => {
        // every chat_room that includes the admin
        const q = query(
            collection(db, "chat_rooms"),
            where(`participants.${ADMIN_UID}`, "==", true), // store participants as map for easy querying
            orderBy("lastMessageTime", "desc"),
        );
        const unsub = onSnapshot(q, (snap) => {
            setThreads(
                snap.docs.map((d) => ({
                    id: d.id,
                    lastMessage: d.data().lastMessage,
                    lastMessageTime: d.data().lastMessageTime?.toDate(),
                    unread:
                        d.data().unreadCount?.[
                        ADMIN_UID === d.data().userA ? d.data().userB : d.data().userA
                        ] ?? 0,
                    otherUserId: d.id.replace(ADMIN_UID, "").replace("_", ""), // crude but works with getChatId
                })),
            );
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
