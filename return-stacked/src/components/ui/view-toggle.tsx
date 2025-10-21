/**
 * ViewToggle - Reusable toggle component for view options
 */

import React from 'react';
import { Switch } from './switch';
import { Label } from './label';

interface ViewToggleProps {
    label: string;
    icon: React.ReactNode;
    isChecked: boolean;
    onChange: (checked: boolean) => void;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({ label, icon, isChecked, onChange }): React.ReactElement => (
    <div className="flex items-center space-x-1.5 px-1.5 py-1 rounded-sm hover:bg-muted">
        {icon}
        <Label htmlFor={`toggle-${label}`} className="text-[10px] cursor-pointer">
            {label}
        </Label>
        <Switch
            id={`toggle-${label}`}
            checked={isChecked}
            onCheckedChange={onChange}
            className="data-[state=checked]:bg-primary h-[16px] w-[28px]"
        />
    </div>
);
