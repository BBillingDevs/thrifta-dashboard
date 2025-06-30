import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { ALLOWED_EMAILS } from "../allowedEmails";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");

        try {
            // Quick client-side gate: block obvious disallowed e-mails
            if (!ALLOWED_EMAILS.includes(email.trim())) {
                throw new Error("Unauthorised e-mail address");
            }

            await signInWithEmailAndPassword(auth, email.trim(), password);
            navigate("/"); // dashboard
        } catch (err) {
            setError(err.message);
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <form
                onSubmit={handleSubmit}
                className="bg-white p-8 rounded shadow-md w-full max-w-md space-y-6"
            >
                <h1 className="text-2xl font-semibold text-center">
                    Thrifta Admin Login
                </h1>

                {error && (
                    <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
                )}

                <label className="block">
                    <span className="text-gray-700">E-mail</span>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-1 w-full border rounded p-2"
                        required
                    />
                </label>

                <label className="block">
                    <span className="text-gray-700">Password</span>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="mt-1 w-full border rounded p-2"
                        required
                    />
                </label>

                <button
                    type="submit"
                    className="w-full py-2 rounded bg-blue-600 text-white font-medium hover:bg-blue-700"
                >
                    Sign in
                </button>
            </form>
        </div>
    );
}
