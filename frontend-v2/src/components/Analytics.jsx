import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie } from 'recharts';

export const PunctualityChart = ({ data }) => (
    <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
            <XAxis dataKey="name" hide />
            <YAxis hide />
            <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1e293b' }} />
            <Bar dataKey="score" radius={[10, 10, 10, 10]}>
                {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.score > 90 ? '#10b981' : '#f59e0b'} />
                ))}
            </Bar>
        </BarChart>
    </ResponsiveContainer>
);

export const LeaveDistribution = ({ data }) => (
    <ResponsiveContainer width="100%" height={200}>
        <PieChart>
            <Pie
                data={data}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
            >
                {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1e293b' }} />
        </PieChart>
    </ResponsiveContainer>
);
