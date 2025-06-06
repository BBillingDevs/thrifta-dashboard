import React from 'react';

export default function StatCard({ title, value }) {
  return (
    <div className="rounded-2xl shadow bg-white p-6 flex flex-col items-center">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}