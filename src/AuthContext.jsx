import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase"; // make sure auth is exported in firebase.js
import { ALLOWED_EMAILS } from "./allowedEmails";

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export default function AuthProvider({ children }) {
    const [user, setUser] = useState(null); // null = not logged in
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (firebaseUser) => {
            // Only keep the user if their e-mail is on the allow-list
            if (firebaseUser && ALLOWED_EMAILS.includes(firebaseUser.email)) {
                setUser(firebaseUser);
            } else {
                // someone signed-in with a disallowed address → force sign-out
                if (firebaseUser) signOut(auth);
                setUser(null);
            }
            setLoading(false);
        });
        return unsub;
    }, []);

    const value = { user, loading };
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
