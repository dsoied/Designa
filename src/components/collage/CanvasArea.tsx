import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Transformer, Text as KonvaText, Group, Rect, Circle, Line, RegularPolygon } from 'react-konva';
import Konva from 'konva';
import useImage from 'use-image';
import { CanvasElement, CanvasConfig } from './types';

interface CanvasAreaProps {
  elements: CanvasElement[];
  config: CanvasConfig;
  selectedIds: string[];
  dimensions: { width: number; height: number };
  editingId?: string | null;
  onSelect: (ids: string[], isEditing?: boolean) => void;
  onUpdate: (id: string, attrs: Partial<CanvasElement>) => void;
  stageRef: React.RefObject<any>;
  onContextMenu?: (e: any) => void;
  onMouseDown?: (e: any) => void;
  zoom?: number;
}

export const CanvasArea = ({ elements, config, selectedIds, dimensions, onSelect, onUpdate, stageRef, editingId, onContextMenu, onMouseDown, zoom = 1 }: CanvasAreaProps) => {
  const trRef = useRef<any>(null);
  const [selectionRect, setSelectionRect] = useState({ x1: 0, y1: 0, x2: 0, y2: 0, visible: false });
  const dragStartPos = useRef<Record<string, { x: number, y: number }>>({});
  const nodeStartPos = useRef<Record<string, { x: number, y: number }>>({});

  const handleSelect = (id: string, shiftKey: boolean, isEditing = false) => {
    if (shiftKey) {
      if (selectedIds.includes(id)) {
        onSelect(selectedIds.filter((sid) => sid !== id), isEditing);
      } else {
        onSelect([...selectedIds, id], isEditing);
      }
    } else {
      onSelect([id], isEditing);
    }
  };

  // Design scaling and centering logic
  const baseScale = Math.min(
    (dimensions.width - 40) / (config.width || 1080),
    (dimensions.height - 40) / (config.height || 1080)
  );
  const scale = baseScale * zoom;
  const stageX = (dimensions.width - (config.width || 1080) * scale) / 2;
  const stageY = (dimensions.height - (config.height || 1080) * scale) / 2;

  const handleDragStart = (e: any) => {
    const id = e.target.id();
    if (!selectedIds.includes(id)) {
      onSelect([id]);
    }
    
    // Store relative positions of all selected elements
    const newStarts: Record<string, { x: number, y: number }> = {};
    const newNodeStarts: Record<string, { x: number, y: number }> = {};
    
    selectedIds.forEach(selectedId => {
      const el = elements.find(v => v.id === selectedId);
      const node = stageRef.current.findOne('#' + selectedId);
      if (el && node) {
        newStarts[selectedId] = { x: el.x, y: el.y };
        newNodeStarts[selectedId] = { x: node.x(), y: node.y() };
      }
    });
    dragStartPos.current = newStarts;
    nodeStartPos.current = newNodeStarts;
  };

  const handleDragMove = (e: any) => {
    const id = e.target.id();
    if (!selectedIds.includes(id)) return;
    if (!nodeStartPos.current[id]) return;

    const dx = e.target.x() - nodeStartPos.current[id].x;
    const dy = e.target.y() - nodeStartPos.current[id].y;

    const stage = stageRef.current;
    selectedIds.forEach(selectedId => {
      if (selectedId === id) return;
      const node = stage.findOne('#' + selectedId);
      const init = nodeStartPos.current[selectedId];
      if (node && init) {
        node.x(init.x + dx);
        node.y(init.y + dy);
      }
    });
  };

  const handleDragEnd = (e: any) => {
    const id = e.target.id();
    if (!selectedIds.includes(id)) {
      onUpdate(id, { x: e.target.x(), y: e.target.y() });
      return;
    }

    if (!nodeStartPos.current[id]) return;

    const dx = e.target.x() - nodeStartPos.current[id].x;
    const dy = e.target.y() - nodeStartPos.current[id].y;

    selectedIds.forEach(selectedId => {
      if (dragStartPos.current[selectedId]) {
        onUpdate(selectedId, { 
          x: dragStartPos.current[selectedId].x + dx, 
          y: dragStartPos.current[selectedId].y + dy 
        });
      }
    });
  };

  const onStageMouseDown = (e: any) => {
    const clickedOnEmpty = e.target === e.target.getStage() || e.target.id() === 'canvas-background';
    if (clickedOnEmpty) {
      const stage = e.target.getStage();
      const pointer = stage.getPointerPosition();
      const pos = {
        x: (pointer.x - stageX) / scale,
        y: (pointer.y - stageY) / scale
      };
      setSelectionRect({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y, visible: true });
      onSelect([]);
    }
    if (onMouseDown) onMouseDown(e);
  };

  const onStageMouseMove = (e: any) => {
    if (!selectionRect.visible) return;
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    const pos = {
      x: (pointer.x - stageX) / scale,
      y: (pointer.y - stageY) / scale
    };
    setSelectionRect(prev => ({ ...prev, x2: pos.x, y2: pos.y }));
  };

  const onStageMouseUp = () => {
    if (!selectionRect.visible) return;
    const { x1, y1, x2, y2 } = selectionRect;
    const box = {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      width: Math.abs(x1 - x2),
      height: Math.abs(y1 - y2)
    };

    if (box.width > 5 || box.height > 5) {
      const stage = stageRef.current;
      const layer = stage.getLayers()[0];
      const shapes = stage.find('.object');
      const selected = shapes.filter((shape: any) => {
        const shapeBox = shape.getClientRect({ relativeTo: layer });
        return (
          shapeBox.x + shapeBox.width/2 >= box.x &&
          shapeBox.y + shapeBox.height/2 >= box.y &&
          shapeBox.x + shapeBox.width/2 <= box.x + box.width &&
          shapeBox.y + shapeBox.height/2 <= box.y + box.height
        );
      }).map((s: any) => s.id());
      onSelect(selected);
    }
    setSelectionRect({ x1: 0, y1: 0, x2: 0, y2: 0, visible: false });
  };

  const ElementImage = ({ item, isSelected, onChange, onSelect }: any) => {
    const [img] = useImage(item.src || '', 'anonymous');
    const shapeRef = useRef<any>(null);

    useEffect(() => {
      if (img && shapeRef.current) {
        shapeRef.current.cache();
      }
    }, [img, item.brightness, item.contrast, item.saturation, item.blur]);
  
    return (
      <KonvaImage
        name="object"
        image={img}
        x={item.x}
        y={item.y}
        width={item.width}
        height={item.height}
        rotation={item.rotation}
        opacity={item.opacity}
        draggable
        ref={shapeRef}
        id={item.id}
        onClick={(e) => onSelect(e.evt.shiftKey)}
        onTap={(e) => onSelect(e.evt.shiftKey)}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        filters={[
          Konva.Filters.Brighten,
          Konva.Filters.Contrast,
          Konva.Filters.HSV,
          Konva.Filters.Blur
        ]}
        brightness={item.brightness ?? 0}
        contrast={item.contrast ?? 0}
        saturation={item.saturation ?? 0}
        blurRadius={item.blur ?? 0}
        onTransformEnd={() => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            x: node.x(),
            y: node.y(),
            width: Math.max(5, node.width() * scaleX),
            height: Math.max(5, node.height() * scaleY),
            rotation: node.rotation(),
          });
        }}
      />
    );
  };
  
  const ElementRect = ({ item, isSelected, onChange, onSelect }: any) => {
    const shapeRef = useRef<any>(null);
    return (
      <Rect
        name="object"
        x={item.x}
        y={item.y}
        width={item.width}
        height={item.height}
        fill={item.fill}
        rotation={item.rotation}
        opacity={item.opacity}
        draggable
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        ref={shapeRef}
        id={item.id}
        onClick={(e) => onSelect(e.evt.shiftKey)}
        onTap={(e) => onSelect(e.evt.shiftKey)}
        onTransformEnd={() => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            x: node.x(),
            y: node.y(),
            width: Math.max(5, node.width() * scaleX),
            height: Math.max(5, node.height() * scaleY),
            rotation: node.rotation(),
          });
        }}
      />
    );
  };
  
  const ElementCircle = ({ item, isSelected, onChange, onSelect }: any) => {
    const shapeRef = useRef<any>(null);
    return (
      <Circle
        name="object"
        x={item.x + item.width / 2}
        y={item.y + item.height / 2}
        radius={item.width / 2}
        fill={item.fill}
        rotation={item.rotation}
        opacity={item.opacity}
        draggable
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={(e) => {
          const target = e.target as any;
          const radius = target.radius() * target.scaleX();
          onChange({ x: target.x() - radius, y: target.y() - radius });
          handleDragEnd(e);
        }}
        ref={shapeRef}
        id={item.id}
        onClick={(e) => onSelect(e.evt.shiftKey)}
        onTap={(e) => onSelect(e.evt.shiftKey)}
        onTransformEnd={() => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const radius = node.radius() * scaleX;
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            x: node.x() - radius,
            y: node.y() - radius,
            width: radius * 2,
            height: radius * 2,
            rotation: node.rotation(),
          });
        }}
      />
    );
  };
  
  const ElementTriangle = ({ item, isSelected, onChange, onSelect }: any) => {
    const shapeRef = useRef<any>(null);
    return (
      <RegularPolygon
        name="object"
        sides={3}
        x={item.x + item.width / 2}
        y={item.y + item.height / 2}
        radius={item.width / 2}
        fill={item.fill}
        rotation={item.rotation}
        opacity={item.opacity}
        draggable
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={(e) => {
          const target = e.target as any;
          const radius = target.radius() * target.scaleX();
          onChange({ x: target.x() - radius, y: target.y() - radius });
          handleDragEnd(e);
        }}
        ref={shapeRef}
        id={item.id}
        onClick={(e) => onSelect(e.evt.shiftKey)}
        onTap={(e) => onSelect(e.evt.shiftKey)}
        onTransformEnd={() => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const radius = node.radius() * scaleX;
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            x: node.x() - radius,
            y: node.y() - radius,
            width: radius * 2,
            height: radius * 2,
            rotation: node.rotation(),
          });
        }}
      />
    );
  };
  
  const ElementLine = ({ item, isSelected, onChange, onSelect }: any) => {
    const shapeRef = useRef<any>(null);
    return (
      <Line
        name="object"
        x={item.x}
        y={item.y}
        points={item.points || [0, 0, item.width, 0]}
        stroke={item.fill || '#000000'}
        strokeWidth={item.strokeWidth || 5}
        rotation={item.rotation}
        opacity={item.opacity}
        draggable
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        ref={shapeRef}
        id={item.id}
        onClick={(e) => onSelect(e.evt.shiftKey)}
        onTap={(e) => onSelect(e.evt.shiftKey)}
        onTransformEnd={() => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            x: node.x(),
            y: node.y(),
            width: Math.max(5, node.width() * scaleX),
            rotation: node.rotation(),
          });
        }}
      />
    );
  };
  
  const ElementFrame = ({ item, isSelected, isEditing, onChange, onSelect }: any) => {
    const [img] = useImage(item.src || '', 'anonymous');
    const shapeRef = useRef<any>(null);
    const groupRef = useRef<any>(null);

    useEffect(() => {
      if (img && shapeRef.current) {
        shapeRef.current.cache();
      }
    }, [img, item.brightness, item.contrast, item.saturation, item.blur]);
  
    // Default crop if not set
    const cropX = item.cropX || 0;
    const cropY = item.cropY || 0;
    const imageWidth = item.imageWidth || item.width;
    const imageHeight = item.imageHeight || item.height;
  
    return (
      <Group
        x={item.x}
        y={item.y}
        width={item.width}
        height={item.height}
        rotation={item.rotation}
        draggable
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        ref={groupRef}
        id={item.id}
        onClick={(e) => onSelect(e.evt.shiftKey)}
        onTap={(e) => onSelect(e.evt.shiftKey)}
        onDblClick={() => {
          (window as any).__triggerFrameUpload && (window as any).__triggerFrameUpload(item.id);
        }}
        clipFunc={(ctx) => {
          const r = item.cornerRadius || 0;
          const w = item.width;
          const h = item.height;
          ctx.beginPath();
          ctx.moveTo(r, 0);
          ctx.lineTo(w - r, 0);
          ctx.quadraticCurveTo(w, 0, w, r);
          ctx.lineTo(w, h - r);
          ctx.quadraticCurveTo(w, h, w - r, h);
          ctx.lineTo(r, h);
          ctx.quadraticCurveTo(0, h, 0, h - r);
          ctx.lineTo(0, r);
          ctx.quadraticCurveTo(0, 0, r, 0);
          ctx.closePath();
        }}
      >
        <Rect
          width={item.width}
          height={item.height}
          fill="#f1f5f9"
          stroke={isSelected ? '#6366f1' : 'transparent'}
          strokeWidth={2}
        />
        {img && (
          <KonvaImage
            image={img}
            width={imageWidth}
            height={imageHeight}
            x={-cropX}
            y={-cropY}
            ref={shapeRef}
            filters={[
              Konva.Filters.Brighten,
              Konva.Filters.Contrast,
              Konva.Filters.HSV,
              Konva.Filters.Blur
            ]}
            brightness={item.brightness ?? 0}
            contrast={item.contrast ?? 0}
            saturation={item.saturation ?? 0}
            blurRadius={item.blur ?? 0}
          />
        )}
      </Group>
    );
  };
  
  const ElementText = ({ item, isSelected, isEditing, onChange, onSelect }: any) => {
    const shapeRef = useRef<any>(null);
    return (
      <KonvaText
        name="object"
        x={item.x}
        y={item.y}
        text={item.text}
        fontSize={item.fontSize}
        fontFamily={item.fontFamily || 'Inter'}
        fontStyle={item.fontStyle || 'normal'}
        fill={item.fill}
        width={item.width}
        align={item.align || 'left'}
        rotation={item.rotation}
        opacity={item.opacity}
        draggable={!isEditing}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        ref={shapeRef}
        id={item.id}
        onClick={(e) => handleSelect(item.id, e.evt.shiftKey, false)}
        onTap={(e) => handleSelect(item.id, e.evt.shiftKey, false)}
        onDblClick={(e) => handleSelect(item.id, e.evt.shiftKey, true)}
        onTransform={(e) => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          node.scaleX(1);
          onChange({
            width: Math.max(5, node.width() * scaleX),
          });
        }}
        onTransformEnd={(e) => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const newWidth = Math.max(5, node.width() * scaleX);
          const newFontSize = node.fontSize(); 
          
          node.scaleX(1);
          node.scaleY(1);
          
          onChange({
            x: node.x(),
            y: node.y(),
            width: newWidth,
            fontSize: newFontSize,
            rotation: node.rotation(),
          });
        }}
      />
    );
  };

  useEffect(() => {
    if (trRef.current) {
      const stage = stageRef.current;
      const selectedNodes = selectedIds.map(id => stage.findOne('#' + id)).filter(Boolean);
      trRef.current.nodes(selectedNodes);
      trRef.current.getLayer().batchDraw();
    }
  }, [selectedIds, elements, stageRef]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-slate-200 dark:bg-slate-900 overflow-hidden">
      <Stage
        width={dimensions.width}
        height={dimensions.height}
        ref={stageRef}
        onMouseDown={onStageMouseDown}
        onMouseMove={onStageMouseMove}
        onMouseUp={onStageMouseUp}
        onContextMenu={onContextMenu}
      >
        <Layer x={stageX} y={stageY} scaleX={scale} scaleY={scale}>
          {/* Background Layer */}
          <Rect
            x={0}
            y={0}
            width={config.width || 1080}
            height={config.height || 1080}
            fill={config.backgroundGradient ? undefined : config.backgroundColor}
            fillLinearGradientStartPoint={config.backgroundGradient?.type === 'linear' ? { x: 0, y: 0 } : undefined}
            fillLinearGradientEndPoint={config.backgroundGradient?.type === 'linear' ? { x: config.width || 1080, y: config.height || 1080 } : undefined}
            fillLinearGradientColorStops={config.backgroundGradient ? [0, config.backgroundGradient.start, 1, config.backgroundGradient.end] : undefined}
            listening={false}
            id="canvas-background"
            shadowBlur={20}
            shadowColor="rgba(0,0,0,0.1)"
          />

          {elements.map((el) => {
            const isSelected = selectedIds.includes(el.id);
            const isEditing = editingId === el.id;
            const onChange = (attrs: any) => onUpdate(el.id, attrs);
            const commonProps = {
              key: el.id,
              item: el,
              isSelected,
              isEditing,
              onChange,
              onSelect: (isShift: boolean, shouldEdit: boolean = false) => handleSelect(el.id, isShift, shouldEdit)
            };

            if (el.type === 'image') return <ElementImage {...commonProps} />;
            if (el.type === 'frame') return <ElementFrame {...commonProps} />;
            if (el.type === 'rect') return <ElementRect {...commonProps} />;
            if (el.type === 'circle') return <ElementCircle {...commonProps} />;
            if (el.type === 'triangle') return <ElementTriangle {...commonProps} />;
            if (el.type === 'line') return <ElementLine {...commonProps} />;
            if (el.type === 'text') return <ElementText {...commonProps} />;
            return null;
          })}
        {/* Selection Rect */}
        {selectionRect.visible && (
          <Rect
            x={Math.min(selectionRect.x1, selectionRect.x2)}
            y={Math.min(selectionRect.y1, selectionRect.y2)}
            width={Math.abs(selectionRect.x1 - selectionRect.x2)}
            height={Math.abs(selectionRect.y1 - selectionRect.y2)}
            fill="rgba(99, 102, 241, 0.1)"
            stroke="#6366f1"
            strokeWidth={1}
            dash={[5, 5]}
          />
        )}

        <Transformer
          ref={trRef}
          anchorSize={6 / scale}
          anchorCornerRadius={1 / scale}
          anchorStroke="#6366f1"
          anchorFill="#ffffff"
          anchorStrokeWidth={1 / scale}
          borderStroke="#6366f1"
          borderStrokeWidth={1 / scale}
          rotateAnchorOffset={20 / scale}
          keepRatio={false}
          enabledAnchors={['top-left', 'top-center', 'top-right', 'middle-right', 'middle-left', 'bottom-left', 'bottom-center', 'bottom-right']}
          boundBoxFunc={(oldBox, newBox) => {
            if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) return oldBox;
            return newBox;
          }}
          padding={0}
        />
      </Layer>
    </Stage>
    </div>
  );
};
