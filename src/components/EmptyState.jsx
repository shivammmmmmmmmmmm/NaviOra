import React from 'react';

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-mint/60 flex items-center justify-center mb-4">
          <Icon size={28} className="text-primary" />
        </div>
      )}
      <h3 className="font-heading font-semibold text-lg text-navy mb-1">{title}</h3>
      {description && <p className="text-sm text-text-secondary max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}