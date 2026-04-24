import React from 'react';

export const DynamicGuziForm: React.FC<{ type: string; initialData: any }> = ({ type, initialData }) => {
  return (
    <form>
      <h3>Dynamic Form for {type}</h3>
      {/* Placeholder for dynamic fields based on type */}
      <input type="text" defaultValue={initialData?.name || ''} placeholder="Name" />
      <button type="submit">Submit</button>
    </form>
  );
};
