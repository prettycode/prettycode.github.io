import React from 'react';
import { CardProps } from '../../types';

/**
 * Card component for displaying content in a styled container
 */
export const Card: React.FC<CardProps> = ({ 
  title, 
  children, 
  className = "", 
  action 
}) => (
  <div className={`bg-white p-4 rounded-lg shadow-sm ${className}`}>
    <div className="flex justify-between items-center mb-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      {action}
    </div>
    {children}
  </div>
); 