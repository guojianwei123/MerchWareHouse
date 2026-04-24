import React from 'react';
import { useDrag } from 'react-dnd';

// Placeholder for RoomEditorPage based on module-blueprint.md
export const RoomEditorPage: React.FC = () => {
  // TODO: Read roomStore

  // Setup drag placeholder
  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: 'item',
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging()
    })
  }));

  return (
    <div className="room-editor-page">
      <h1>Room Editor</h1>
      <div
        ref={dragRef}
        style={{ opacity: isDragging ? 0.5 : 1, cursor: 'move', padding: '10px', border: '1px solid black' }}
      >
        Draggable Item Placeholder
      </div>
    </div>
  );
};

export default RoomEditorPage;
