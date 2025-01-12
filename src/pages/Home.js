import React from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();

  const cards = [
    { 
      title: 'Billing', 
      path: '/billing', 
      icon: '💰',
      bgColor: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600' 
    },
    { 
      title: 'Add Product', 
      path: '/add-product', 
      icon: '📦',
      bgColor: 'bg-green-500',
      hoverColor: 'hover:bg-green-600'
    },
    { 
      title: 'Stock', 
      path: '/stock', 
      icon: '📊',
      bgColor: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600'
    },
    { 
      title: 'Analysis', 
      path: '/analysis', 
      icon: '📈',
      bgColor: 'bg-yellow-500',
      hoverColor: 'hover:bg-yellow-600'
    },
    { 
      title: 'Add Customer', 
      path: '/add-customer', 
      icon: '👤',
      bgColor: 'bg-red-500',
      hoverColor: 'hover:bg-red-600'
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-gray-800 mb-12 text-center">
        Billing System
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {cards.map((card) => (
          <div
            key={card.title}
            onClick={() => navigate(card.path)}
            className={`${card.bgColor} ${card.hoverColor} rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105 cursor-pointer`}
          >
            <div className="p-8 text-white">
              <div className="text-5xl mb-4">{card.icon}</div>
              <h2 className="text-2xl font-semibold">{card.title}</h2>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Home;