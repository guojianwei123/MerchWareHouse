import React from 'react';

// Placeholder for UploadPage based on module-blueprint.md
export const UploadPage: React.FC = () => {
  const handleUpload = () => {
    // TODO: Trigger media.adapter
    console.log('Triggering media.adapter upload placeholder');
  };

  return (
    <div className="upload-page">
      <h1>Upload Media</h1>
      <button onClick={handleUpload}>
        Upload
      </button>
    </div>
  );
};

export default UploadPage;
