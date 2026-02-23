import React from 'react';

interface ActionItem {
  id: string;
  position: number;
  title: string;
}

interface SubGoal {
  id: string;
  position: number;
  title: string;
  actions: ActionItem[];
}

interface FullGridViewProps {
  goalTitle: string;
  subGoals: SubGoal[];
  onActionClick: (action: ActionItem) => void;
  onSubGoalClick: (subGoal: SubGoal) => void;
  onAddSubGoal: (position: number) => void;
  onAddAction: (subGoalId: string, position: number) => void;
  onUpdateSubGoal?: (id: string, title: string) => void;
  onUpdateAction?: (id: string, title: string) => void;
  gridAspect: 'square' | 'rectangle';
  onCenterClick?: () => void;
}

export default function FullGridView({
  goalTitle,
  subGoals,
  onActionClick,
  onSubGoalClick,
  onAddSubGoal,
  onAddAction,
  onUpdateSubGoal,
  onUpdateAction,
  gridAspect,
  onCenterClick
}: FullGridViewProps) {

  const getSubGoalAtPosition = (position: number): SubGoal | undefined => {
    return subGoals.find(sg => sg.position === position);
  };

  const renderCell = (row: number, col: number) => {
    // Center 3x3 block is handled separately in the grid rendering
    // This function only handles cells outside the center

    // Each sub-goal is at the CENTER of a 3x3 mini-grid
    // Sub-goal 1: center at (1,1)
    // Sub-goal 2: center at (1,4)
    // Sub-goal 3: center at (1,7)
    // Sub-goal 4: center at (4,7)
    // Sub-goal 5: center at (7,7)
    // Sub-goal 6: center at (7,4)
    // Sub-goal 7: center at (7,1)
    // Sub-goal 8: center at (4,1)

    const subGoalMap: { [key: string]: number } = {
      '1-1': 1, '1-4': 2, '1-7': 3,
      '4-7': 4,
      '7-7': 5, '7-4': 6, '7-1': 7,
      '4-1': 8
    };

    const subGoalPos = subGoalMap[`${row}-${col}`];

    if (subGoalPos) {
      const subGoal = getSubGoalAtPosition(subGoalPos);

      if (!subGoal) {
        return (
          <div
            onClick={() => onAddSubGoal(subGoalPos)}
            className="bg-yellow-50 border border-yellow-300 p-1 flex items-center justify-center cursor-pointer hover:bg-yellow-100 text-xs h-full"
          >
            <span className="text-yellow-700">+SG{subGoalPos}</span>
          </div>
        );
      }

      return (
        <div
          className="bg-green-100 border-2 border-green-500 p-1 h-full flex items-center justify-center cursor-pointer hover:bg-green-200"
          onClick={() => onSubGoalClick(subGoal)}
          onContextMenu={(e) => {
            e.preventDefault();
            if (onUpdateSubGoal) {
              const newTitle = prompt('Rename sub-goal:', subGoal.title);
              if (newTitle && newTitle.trim()) {
                onUpdateSubGoal(subGoal.id, newTitle.trim());
              }
            }
          }}
          title="Click to view actions | Right-click to rename"
        >
          <div className="font-semibold text-xs text-center break-words">{subGoal.title}</div>
        </div>
      );
    }

    // Actions surround their sub-goals in 8 positions
    const actionMaps: { [key: string]: { subGoalPos: number; actionPos: number } } = {
      // Sub-goal 1 actions (center at 1,1)
      '0-0': { subGoalPos: 1, actionPos: 1 }, '0-1': { subGoalPos: 1, actionPos: 2 }, '0-2': { subGoalPos: 1, actionPos: 3 },
      '1-2': { subGoalPos: 1, actionPos: 4 },
      '2-2': { subGoalPos: 1, actionPos: 5 }, '2-1': { subGoalPos: 1, actionPos: 6 }, '2-0': { subGoalPos: 1, actionPos: 7 },
      '1-0': { subGoalPos: 1, actionPos: 8 },

      // Sub-goal 2 actions (center at 1,4)
      '0-3': { subGoalPos: 2, actionPos: 1 }, '0-4': { subGoalPos: 2, actionPos: 2 }, '0-5': { subGoalPos: 2, actionPos: 3 },
      '1-5': { subGoalPos: 2, actionPos: 4 },
      '2-5': { subGoalPos: 2, actionPos: 5 }, '2-4': { subGoalPos: 2, actionPos: 6 }, '2-3': { subGoalPos: 2, actionPos: 7 },
      '1-3': { subGoalPos: 2, actionPos: 8 },

      // Sub-goal 3 actions (center at 1,7)
      '0-6': { subGoalPos: 3, actionPos: 1 }, '0-7': { subGoalPos: 3, actionPos: 2 }, '0-8': { subGoalPos: 3, actionPos: 3 },
      '1-8': { subGoalPos: 3, actionPos: 4 },
      '2-8': { subGoalPos: 3, actionPos: 5 }, '2-7': { subGoalPos: 3, actionPos: 6 }, '2-6': { subGoalPos: 3, actionPos: 7 },
      '1-6': { subGoalPos: 3, actionPos: 8 },

      // Sub-goal 4 actions (center at 4,7)
      '3-6': { subGoalPos: 4, actionPos: 1 }, '3-7': { subGoalPos: 4, actionPos: 2 }, '3-8': { subGoalPos: 4, actionPos: 3 },
      '4-8': { subGoalPos: 4, actionPos: 4 },
      '5-8': { subGoalPos: 4, actionPos: 5 }, '5-7': { subGoalPos: 4, actionPos: 6 }, '5-6': { subGoalPos: 4, actionPos: 7 },
      '4-6': { subGoalPos: 4, actionPos: 8 },

      // Sub-goal 5 actions (center at 7,7)
      '6-6': { subGoalPos: 5, actionPos: 1 }, '6-7': { subGoalPos: 5, actionPos: 2 }, '6-8': { subGoalPos: 5, actionPos: 3 },
      '7-8': { subGoalPos: 5, actionPos: 4 },
      '8-8': { subGoalPos: 5, actionPos: 5 }, '8-7': { subGoalPos: 5, actionPos: 6 }, '8-6': { subGoalPos: 5, actionPos: 7 },
      '7-6': { subGoalPos: 5, actionPos: 8 },

      // Sub-goal 6 actions (center at 7,4)
      '6-3': { subGoalPos: 6, actionPos: 1 }, '6-4': { subGoalPos: 6, actionPos: 2 }, '6-5': { subGoalPos: 6, actionPos: 3 },
      '7-5': { subGoalPos: 6, actionPos: 4 },
      '8-5': { subGoalPos: 6, actionPos: 5 }, '8-4': { subGoalPos: 6, actionPos: 6 }, '8-3': { subGoalPos: 6, actionPos: 7 },
      '7-3': { subGoalPos: 6, actionPos: 8 },

      // Sub-goal 7 actions (center at 7,1)
      '6-0': { subGoalPos: 7, actionPos: 1 }, '6-1': { subGoalPos: 7, actionPos: 2 }, '6-2': { subGoalPos: 7, actionPos: 3 },
      '7-2': { subGoalPos: 7, actionPos: 4 },
      '8-2': { subGoalPos: 7, actionPos: 5 }, '8-1': { subGoalPos: 7, actionPos: 6 }, '8-0': { subGoalPos: 7, actionPos: 7 },
      '7-0': { subGoalPos: 7, actionPos: 8 },

      // Sub-goal 8 actions (center at 4,1)
      '3-0': { subGoalPos: 8, actionPos: 1 }, '3-1': { subGoalPos: 8, actionPos: 2 }, '3-2': { subGoalPos: 8, actionPos: 3 },
      '4-2': { subGoalPos: 8, actionPos: 4 },
      '5-2': { subGoalPos: 8, actionPos: 5 }, '5-1': { subGoalPos: 8, actionPos: 6 }, '5-0': { subGoalPos: 8, actionPos: 7 },
      '4-0': { subGoalPos: 8, actionPos: 8 },
    };

    const actionInfo = actionMaps[`${row}-${col}`];

    if (actionInfo) {
      const subGoal = getSubGoalAtPosition(actionInfo.subGoalPos);

      if (!subGoal) {
        return <div className="bg-gray-100 border border-gray-200 h-full"></div>;
      }

      const action = subGoal.actions.find(a => a.position === actionInfo.actionPos);

      if (!action) {
        return (
          <div
            onClick={() => onAddAction(subGoal.id, actionInfo.actionPos)}
            className="bg-blue-50 border border-blue-200 p-1 cursor-pointer hover:bg-blue-100 flex items-center justify-center text-xs text-gray-500 h-full"
          >
            +
          </div>
        );
      }

      return (
        <div
          onClick={() => onActionClick(action)}
          onContextMenu={(e) => {
            e.preventDefault();
            if (onUpdateAction) {
              const newTitle = prompt('Edit action:', action.title);
              if (newTitle && newTitle.trim()) {
                onUpdateAction(action.id, newTitle.trim());
              }
            }
          }}
          className="bg-white border border-gray-300 hover:bg-gray-50 p-1 cursor-pointer text-xs h-full flex items-center justify-center"
          title={action.title + ' (Right-click to edit)'}
        >
          <div className="text-center break-words">{action.title}</div>
        </div>
      );
    }

    return <div className="bg-gray-50 border border-gray-200 h-full"></div>;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div
        className={`grid grid-cols-9 gap-1 ${gridAspect === 'square' ? 'max-w-5xl' : ''} mx-auto`}
        style={{ gridAutoRows: '1fr' }}
      >
        {Array.from({ length: 9 }, (_, row) =>
          Array.from({ length: 9 }, (_, col) => {
            // Skip rendering cells that are part of the center 3x3 (except the main one)
            if (row >= 3 && row <= 5 && col >= 3 && col <= 5) {
              if (row === 3 && col === 3) {
                // Render the merged center cell
                return (
                  <div
                    key={`${row}-${col}`}
                    onClick={onCenterClick}
                    className="col-span-3 row-span-3 bg-blue-600 text-white flex items-center justify-center font-bold text-lg cursor-pointer hover:bg-blue-700 transition-colors"
                    style={{ aspectRatio: gridAspect === 'square' ? '1' : 'auto' }}
                    title="Click to edit description"
                  >
                    {goalTitle}
                  </div>
                );
              }
              // Skip other cells in the 3x3 block
              return null;
            }

            return (
              <div key={`${row}-${col}`} className={gridAspect === 'square' ? 'aspect-square' : 'aspect-[5/3]'}>
                {renderCell(row, col)}
              </div>
            );
          })
        )}
      </div>

      <div className="mt-6 text-center text-sm text-gray-500">
        <p>Full 9x9 Harada grid - Sub-goals (green) surrounded by 8 action items each. Click actions to log activity.</p>
      </div>
    </div>
  );
}
