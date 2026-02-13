import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { HiMiniUsers } from 'react-icons/hi2';
import { FiPackage } from 'react-icons/fi';
import { FiDollarSign } from 'react-icons/fi';
import { FiShoppingCart } from 'react-icons/fi';

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
      </div>
    </div>
  );
};

export default Dashboard;
