import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { HiMiniUsers } from 'react-icons/hi2';
import { FiPackage } from 'react-icons/fi';
import { FiDollarSign } from 'react-icons/fi';
import { FiShoppingCart } from 'react-icons/fi';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const StatCard = ({ title, value, icon: Icon, bgColor }) => {
  return (
    <div className="bg-white rounded-lg p-6 shadow-md">
      <div className="flex items-center justify-between">
        <div className="">
          <p className="text-gray-500 text-sm font-medium">{title}</p>
          <p className="text-2xl font-semibold mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${bgColor}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          'http://localhost:3000/api/dashboard/analytics',
        );
        setData(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  console.log(data);

  if (loading) return <h1>Loading...</h1>;
  if (error) return <h1>Error: {error}</h1>;
  if (!data) return null;

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(val);
  };

  return (
    <div className="min-h-screen bg-amber-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
        {/* stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* card 1 */}
          <StatCard
            title={'Active Users'}
            value={data?.activeUsers}
            icon={HiMiniUsers}
            bgColor={
              'bg-blue-500 hover:bg-blue-600 transition-colors duration-300'
            }
          />
          {/* card 2 */}
          <StatCard
            title={'Total Products'}
            value={data?.totalProducts}
            icon={FiPackage}
            bgColor={
              'bg-green-500 hover:bg-green-600 transition-colors duration-300'
            }
          />
          {/* card 3 */}
          <StatCard
            title={'Total Revenue'}
            value={formatCurrency(data?.totalRevenue)}
            icon={FiDollarSign}
            bgColor={
              'bg-purple-500 hover:bg-purple-600 transition-colors duration-300'
            }
          />
          {/* card 4 */}
          <StatCard
            title={'Conversion Rate'}
            value={data?.kpis.conversionRate}
            icon={FiShoppingCart}
            bgColor={
              'bg-orange-500 hover:bg-orange-600 transition-colors duration-300'
            }
          />
        </div>

        {/* sales chart */}
        <div className="w-full bg-white p-8 rounded-xl shadow-lg mb-8 border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <div className="">
              <h2 className="text-2xl font-bold text-gray-800">
                Monthly Sales
              </h2>
              <p className="text-gray-500 mt-1">
                Revenue performance over time
              </p>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-[#8884d8] mr-2"></div>
              <span className="text-sm text-gray-600">Revenue</span>
            </div>
          </div>
          {/* graph */}
          <div className="h-100">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={data?.monthlySalesData || []}
                margin={{ top: 10, right: 30, left: 20, bottom: 20 }}
              >
                <defs>
                  <linearGradient
                    id="revenueGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f0f0f0"
                />

                <XAxis
                  dataKey="month"
                  tickFormatter={(month, index) => {
                    const dataPoint = data?.monthlySalesData?.[index];
                    if (!dataPoint) return '';
                    return `${new Date(0, month - 1).toLocaleString('default', { month: 'short' })} ${dataPoint.year}`;
                  }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  tick={{ fill: '#666', fontSize: 12 }}
                />

                <YAxis
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                  tick={{ fill: '#666', fontSize: 12 }}
                />

                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  }}
                  formatter={(value) => [
                    `$${value.toLocaleString()}`,
                    'Revenue',
                  ]}
                  labelFormatter={(_, payload) => {
                    if (payload && payload[0]) {
                      const item = payload[0].payload;
                      return `${new Date(0, item.month - 1).toLocaleString('default', { month: 'long' })} ${item.year}`;
                    }
                    return '';
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="none"
                  fill="url(#revenueGradient)"
                  connectNulls
                />

                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8884d8"
                  strokeWidth={3}
                  dot={{
                    fill: '#fff',
                    stroke: '#8884d8',
                    strokeWidth: 2,
                    r: 4,
                  }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
