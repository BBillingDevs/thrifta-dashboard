import React, { useState } from "react";
import ChatSidebar from "../components/chatsupport/ChatSidebar";
import ChatWindow from "../components/chatsupport/ChatWindow";

export default function CustomerSupport() {
    const [activeUser, setActiveUser] = useState(null);

    return (
        <div className="flex h-[calc(100vh-64px)]">
            {" "}
            {/* full-screen minus navbar */}
            <ChatSidebar onSelect={setActiveUser} activeUserId={activeUser} />
            <ChatWindow userId={activeUser} />
        </div>
    );
}
