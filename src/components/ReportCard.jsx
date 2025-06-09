// src/components/ReportCard.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function ReportCard({ title, to, count = 0 }) {
    const nav = useNavigate();
    return (
        <div
            className="rounded-2xl shadow bg-white p-6 cursor-pointer hover:bg-gray-100"
            onClick={() => nav(to)}
        >
            <h3 className="text-lg font-medium text-gray-700">{title}</h3>
            <p className="mt-2 text-2xl font-bold text-gray-900">{count}</p>
        </div>
    );
}
