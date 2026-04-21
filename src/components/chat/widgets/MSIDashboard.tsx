import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts'

export interface MSIDashboardProps {
    clinicId: string
    timeframe?: 'day' | 'week' | 'month' | 'quarter'
    metrics?: string[]
}

const weeklyData = [
    { day: 'Mon', revenue: 4200, leads: 24, conversions: 18 },
    { day: 'Tue', revenue: 5200, leads: 31, conversions: 22 },
    { day: 'Wed', revenue: 4800, leads: 28, conversions: 20 },
    { day: 'Thu', revenue: 5800, leads: 35, conversions: 26 },
    { day: 'Fri', revenue: 6100, leads: 40, conversions: 30 },
    { day: 'Sat', revenue: 5400, leads: 32, conversions: 24 },
    { day: 'Sun', revenue: 4700, leads: 26, conversions: 19 },
]

const categoryData = [
    { name: 'Consultation', value: 35, color: '#8b5cf6' },
    { name: 'Lab Tests', value: 25, color: '#10b981' },
    { name: 'Imaging', value: 20, color: '#3b82f6' },
    { name: 'Pharmacy', value: 15, color: '#f59e0b' },
    { name: 'Other', value: 5, color: '#ef4444' },
]

const metricCards = [
    { label: 'MSI Score', value: '82.5', unit: '/100', trend: '+2.1' },
    { label: 'MGC Index', value: '67.3', unit: '', trend: '-0.5' },
    { label: 'Patient Satisfaction', value: '94', unit: '%', trend: '+4.2' },
    { label: 'Avg. Response Time', value: '3.2', unit: 's', trend: '-0.8' },
]

export default function MSIDashboard({ clinicId, timeframe = 'week', metrics }: MSIDashboardProps) {
    return (
        <Card className="border-gray-800 bg-black">
            <CardContent className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-white">Clinic Performance Dashboard</h3>
                        <p className="text-sm text-gray-400">
                            Clinic ID: <code className="rounded bg-gray-900 px-2 py-1">{clinicId}</code> • Timeframe: {timeframe}
                        </p>
                    </div>
                    <Button variant="outline" className="border-gray-700 text-gray-300">
                        Export Data
                    </Button>
                </div>

                {/* Metric cards */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    {metricCards.map((metric) => (
                        <div
                            key={metric.label}
                            className="rounded-xl border border-gray-800 bg-gray-900 p-4"
                        >
                            <div className="text-sm text-gray-400">{metric.label}</div>
                            <div className="mt-2 flex items-baseline">
                                <span className="text-3xl font-bold text-white">{metric.value}</span>
                                <span className="ml-1 text-gray-400">{metric.unit}</span>
                                <span
                                    className={`ml-2 text-sm ${metric.trend.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}
                                >
                                    {metric.trend}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Charts grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Revenue & Leads Line Chart */}
                    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                        <h4 className="mb-4 text-lg font-semibold text-white">Weekly Performance</h4>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={weeklyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="day" stroke="#9ca3af" />
                                <YAxis stroke="#9ca3af" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#4b5563', color: 'white' }}
                                />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#8b5cf6"
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                    name="Revenue (USD)"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="leads"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                    name="Leads"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Category Distribution Pie Chart */}
                    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                        <h4 className="mb-4 text-lg font-semibold text-white">Service Category Distribution</h4>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => percent ? `${name}: ${(percent * 100).toFixed(0)}%` : name}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#4b5563', color: 'white' }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Conversion Bar Chart */}
                    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 lg:col-span-2">
                        <h4 className="mb-4 text-lg font-semibold text-white">Daily Conversions</h4>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={weeklyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="day" stroke="#9ca3af" />
                                <YAxis stroke="#9ca3af" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#4b5563', color: 'white' }}
                                />
                                <Legend />
                                <Bar dataKey="conversions" fill="#3b82f6" name="Conversions" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="mt-6 text-xs text-gray-500">
                    Data is simulated for demonstration. Connect to your Supabase analytics for real‑time metrics.
                </div>
            </CardContent>
        </Card>
    )
}